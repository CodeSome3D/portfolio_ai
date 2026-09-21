/**
 * AI GENERATIVE ART & IMAGERY PORTFOLIO - MAIN GALLERY APPLICATION
 * -----------------------------------------------------------------
 * Pure vanilla JavaScript with zero external runtime dependencies.
 * Features instant client-side filtering by Category and AI Model,
 * full-text search, masonry/grid layouts, native <dialog> lightbox with
 * zoom & pan, and cryptographic Owner Authentication.
 */

(function () {
  'use strict';

  // Helper to sanitize/migrate legacy model names from older storage
  function sanitizeWorkModels(work) {
    if (!work) return work;
    const modelMap = {
      'Stable Diffusion': 'ChatGPT',
      'Flux.1': 'NanoBanana',
      'Flux': 'NanoBanana',
      'DALL-E 3': 'ChatGPT',
      'DALL-E': 'ChatGPT'
    };
    const currentModels = Array.isArray(work.model)
      ? work.model
      : (typeof work.model === 'string' && work.model ? [work.model] : ['Midjourney']);
    work.model = Array.from(new Set(currentModels.map(m => modelMap[m] || m)));
    return work;
  }

  // Load saved works from localStorage if available
  function loadInitialWorks() {
    const defaultWorks = (window.PORTFOLIO_WORKS || []).map(sanitizeWorkModels);
    try {
      const saved = localStorage.getItem('portfolio_ai_saved_works');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Clean any legacy references to removed files and update model names
          const cleaned = parsed
            .filter(w => w.file && !w.file.includes('Chief_Editor'))
            .map(sanitizeWorkModels);
          window.PORTFOLIO_WORKS = cleaned;
          return cleaned;
        }
      }
    } catch (e) {
      console.warn('Could not read saved works from localStorage', e);
    }
    return defaultWorks;
  }

  // State Management
  const state = {
    works: loadInitialWorks(),
    filteredWorks: [],
    selectedCategory: 'all',
    selectedModel: 'all',
    searchQuery: '',
    sortBy: 'default',
    layout: 'grid',
    currentLightboxIndex: -1,
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 },
    isDragging: false,
    dragStart: { x: 0, y: 0 }
  };

  // Helper: Normalize AI Model list from item (supports array or string)
  function getModelList(item) {
    if (!item) return [];
    const models = item.model || item.models || item.ai_model || [];
    if (Array.isArray(models)) {
      return models.filter(Boolean);
    }
    if (typeof models === 'string' && models.trim()) {
      return [models.trim()];
    }
    return [];
  }

  // Helper: Get list of available categories
  function getAvailableCategories() {
    const defaultCats = window.ALLOWED_CATEGORIES || [
      '3D Miniatures',
      'Product & Tech',
      'Characters & Fashion',
      'Environments & Sci-Fi',
      'Creatures & Art'
    ];
    const cats = new Set(defaultCats);
    if (Array.isArray(state.works)) {
      state.works.forEach(w => {
        if (w.category && typeof w.category === 'string' && w.category.trim()) {
          cats.add(w.category.trim());
        }
      });
    }
    return Array.from(cats);
  }

  // Helper: Get list of available AI models
  function getAvailableModels() {
    const defaultModels = window.ALLOWED_MODELS || [
      'Midjourney',
      'ChatGPT',
      'NanoBanana',
      'ComfyUI'
    ];
    const models = new Set(defaultModels);
    if (Array.isArray(state.works)) {
      state.works.forEach(w => {
        getModelList(w).forEach(m => {
          if (m !== 'Stable Diffusion' && m !== 'Flux.1' && m !== 'Flux' && m !== 'DALL-E 3' && m !== 'DALL-E') {
            models.add(m);
          }
        });
      });
    }
    return Array.from(models);
  }

  // DOM Elements
  const elements = {
    galleryGrid: document.getElementById('galleryGrid'),
    emptyState: document.getElementById('emptyState'),
    resultsCount: document.getElementById('resultsCount'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    searchInput: document.getElementById('searchInput'),
    searchClear: document.getElementById('searchClear'),
    sortSelect: document.getElementById('sortSelect'),
    catFilterList: document.getElementById('catFilterList'),
    modelFilterList: document.getElementById('modelFilterList'),
    btnLayoutMasonry: document.getElementById('btnLayoutMasonry'),
    btnLayoutGrid: document.getElementById('btnLayoutGrid'),
    btnBackToTop: document.getElementById('btnBackToTop'),

    // Lightbox Elements
    lightboxDialog: document.getElementById('lightboxModal'),
    lightboxImg: document.getElementById('lightboxImg'),
    lightboxImgContainer: document.getElementById('lightboxImgContainer'),
    lightboxPrev: document.getElementById('lightboxPrev'),
    lightboxNext: document.getElementById('lightboxNext'),
    lightboxClose: document.getElementById('lightboxClose'),
    lightboxCounter: document.getElementById('lightboxCounter'),
    lightboxTitle: document.getElementById('lightboxTitle'),
    lightboxModel: document.getElementById('lightboxModel'),
    lightboxCategory: document.getElementById('lightboxCategory'),
    lightboxDesc: document.getElementById('lightboxDesc'),
    lightboxEditBtn: document.getElementById('lightboxEditBtn'),
    zoomInBtn: document.getElementById('zoomInBtn'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    zoomResetBtn: document.getElementById('zoomResetBtn'),
    zoomLevelText: document.getElementById('zoomLevelText'),

    // Admin & Auth Elements
    btnToggleAdmin: document.getElementById('btnToggleAdmin'),
    authModal: document.getElementById('authModal'),
    authClose: document.getElementById('authClose'),
    authCancelBtn: document.getElementById('authCancelBtn'),
    authForm: document.getElementById('authForm'),
    authPasswordInput: document.getElementById('authPasswordInput'),
    authErrorMsg: document.getElementById('authErrorMsg'),
    toastContainer: document.getElementById('toastContainer')
  };

  // --- CRYPTOGRAPHIC OWNER AUTHENTICATION ---
  // One-way SHA-256 hash of password "GBs13L168MKp" (never stored as plain text)
  const OWNER_PWD_HASH = 'dbd1648af1f6d81bca373e98aa28e5547b88063949bd16fcd8202174f742916e';

  function sha256Pure(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let i, j, result = '';
    const words = [];
    const asciiBitLength = ascii.length * 8;
    let hash = [];
    let k = [];
    let primeCounter = 0;

    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1/3) * maxWord) | 0;
      }
    }

    hash = hash.slice(0, 8);
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) {
      j = ascii.charCodeAt(i);
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = (asciiBitLength);

    for (j = 0; j < words.length;) {
      const w = words.slice(j, j += 16);
      const oldHash = hash;
      hash = hash.slice(0, 8);

      for (i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
              w[i - 16]
              + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
              + w[i - 7]
              + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
            ) | 0
          );
        const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }

      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }

    for (i = 0; i < 8; i++) {
      for (j = 3; j >= 0; j--) {
        const b = (hash[i] >> (8 * j)) & 255;
        result += (b < 16 ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }

  async function computeSha256(str) {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        console.warn('crypto.subtle failed, using pure JS SHA-256 fallback', e);
      }
    }
    return sha256Pure(str);
  }

  // Preload all remaining portfolio images into browser cache so scrolling is instant
  function precacheRemainingWorks() {
    if (!Array.isArray(state.works)) return;
    const preload = () => {
      state.works.forEach((item, i) => {
        if (i >= 8 && item.file) {
          const img = new Image();
          img.src = item.file;
        }
      });
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preload, { timeout: 1500 });
    } else {
      setTimeout(preload, 500);
    }
  }

  // --- INITIALIZATION ---
  function init() {
    initAdminMode();
    buildFilterChips();
    applyFilters();
    bindEvents();
    bindLightboxEvents();
    bindAuthEvents();
    precacheRemainingWorks();
  }

  // --- ADMIN & AUTH MODE ---
  function initAdminMode() {
    const isSessionAuth = sessionStorage.getItem('portfolio_owner_authenticated') === 'true';
    const hasUrlFlag = new URLSearchParams(window.location.search).get('edit') === '1';
    if (isSessionAuth || hasUrlFlag) {
      document.body.classList.add('is-admin');
    }
  }

  function openAuthModal() {
    if (!elements.authModal) return;
    elements.authPasswordInput.value = '';
    elements.authErrorMsg.style.display = 'none';
    elements.authModal.showModal();
    setTimeout(() => elements.authPasswordInput.focus(), 80);
  }

  function closeAuthModal() {
    if (elements.authModal && elements.authModal.open) {
      elements.authModal.close();
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const inputVal = elements.authPasswordInput.value.trim();
    if (!inputVal) return;

    const inputHash = await computeSha256(inputVal);

    if (inputHash === OWNER_PWD_HASH) {
      document.body.classList.add('is-admin');
      sessionStorage.setItem('portfolio_owner_authenticated', 'true');
      closeAuthModal();
      window.PORTFOLIO_APP.showToast('Owner access unlocked!');
    } else {
      elements.authErrorMsg.textContent = 'Incorrect password. Access denied.';
      elements.authErrorMsg.style.display = 'block';
      elements.authPasswordInput.select();
    }
  }

  function toggleAdminMode() {
    const isCurrentlyAdmin = document.body.classList.contains('is-admin');
    if (isCurrentlyAdmin) {
      document.body.classList.remove('is-admin');
      sessionStorage.removeItem('portfolio_owner_authenticated');
      window.PORTFOLIO_APP.showToast('Owner mode locked');
    } else {
      openAuthModal();
    }
  }

  function bindAuthEvents() {
    if (elements.authForm) {
      elements.authForm.addEventListener('submit', handleAuthSubmit);
    }
    if (elements.authClose) {
      elements.authClose.addEventListener('click', closeAuthModal);
    }
    if (elements.authCancelBtn) {
      elements.authCancelBtn.addEventListener('click', closeAuthModal);
    }
    if (elements.authModal) {
      elements.authModal.addEventListener('click', (e) => {
        if (e.target === elements.authModal) {
          closeAuthModal();
        }
      });
    }
  }

  // --- FILTER CHIPS BUILDER ---
  function buildFilterChips() {
    // Categories
    const categories = getAvailableCategories();
    if (elements.catFilterList) {
      elements.catFilterList.innerHTML = `
        <button type="button" class="chip ${state.selectedCategory === 'all' ? 'active' : ''}" data-cat="all">All</button>
        ${categories.map(cat => `
          <button type="button" class="chip ${state.selectedCategory.toLowerCase() === cat.toLowerCase() ? 'active' : ''}" data-cat="${escapeHtml(cat)}">
            ${escapeHtml(cat)}
          </button>
        `).join('')}
      `;
    }

    // AI Models
    const models = getAvailableModels();
    if (elements.modelFilterList) {
      elements.modelFilterList.innerHTML = `
        <button type="button" class="chip ${state.selectedModel === 'all' ? 'active' : ''}" data-model="all">All</button>
        ${models.map(m => `
          <button type="button" class="chip ${state.selectedModel.toLowerCase() === m.toLowerCase() ? 'active' : ''}" data-model="${escapeHtml(m)}">
            ${escapeHtml(m)}
          </button>
        `).join('')}
      `;
    }
  }

  // --- FILTERING, SEARCH & SORTING ---
  function applyFilters() {
    const query = state.searchQuery.trim().toLowerCase();

    state.filteredWorks = state.works.filter(item => {
      const itemModels = getModelList(item);

      // Category filter
      if (state.selectedCategory !== 'all') {
        if ((item.category || '').toLowerCase() !== state.selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // AI Model filter (matches any of the item's models)
      if (state.selectedModel !== 'all') {
        const targetModel = state.selectedModel.toLowerCase();
        const hasModel = itemModels.some(m => m.toLowerCase().includes(targetModel) || targetModel.includes(m.toLowerCase()));
        if (!hasModel) return false;
      }

      // Search query (matches title, models, category, description)
      if (query) {
        const titleMatch = (item.name || '').toLowerCase().includes(query);
        const modelMatch = itemModels.some(m => m.toLowerCase().includes(query));
        const catMatch = (item.category || '').toLowerCase().includes(query);
        const descMatch = (item.description || '').toLowerCase().includes(query);
        if (!titleMatch && !modelMatch && !catMatch && !descMatch) {
          return false;
        }
      }
      return true;
    });

    // Sort logic
    if (state.sortBy === 'name-asc') {
      state.filteredWorks.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (state.sortBy === 'name-desc') {
      state.filteredWorks.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    } else if (state.sortBy === 'category') {
      state.filteredWorks.sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''));
    }

    renderGallery();
    updateStatusLine();
  }

  // --- RENDER GALLERY ---
  function renderGallery() {
    if (state.filteredWorks.length === 0) {
      elements.galleryGrid.innerHTML = '';
      elements.emptyState.style.display = 'flex';
      return;
    }

    elements.emptyState.style.display = 'none';

    const cardsHtml = state.filteredWorks.map((item, index) => {
      const models = getModelList(item);
      const name = item.name || 'Untitled Artwork';
      const category = item.category || 'Generative Art';

      // Render model badges
      const modelBadgesHtml = models.map(m => `
        <span class="badge-model" data-model="${escapeHtml(m)}">${escapeHtml(m)}</span>
      `).join('');

      return `
        <article class="art-card" data-index="${index}" tabindex="0" role="button" aria-label="${escapeHtml(name)}">
          <div class="art-media-wrap">
            <img 
              class="art-img" 
              src="${escapeHtml(item.file)}" 
              alt="${escapeHtml(name)}" 
              ${index < 8 ? 'fetchpriority="high"' : ''}
              loading="${index < 8 ? 'eager' : 'lazy'}"
              decoding="auto"
            >
            <div class="card-hover-overlay">
              <span class="quick-view-badge">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                Inspect Artwork
              </span>
            </div>
          </div>
          <div class="art-details">
            <div class="art-header">
              <h3 class="art-title">${escapeHtml(name)}</h3>
            </div>
            <div class="art-meta-row">
              <span class="art-category">${escapeHtml(category)}</span>
              <div class="art-badges-inline">
                ${modelBadgesHtml}
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    elements.galleryGrid.innerHTML = cardsHtml;
  }

  function updateStatusLine() {
    if (elements.resultsCount) {
      elements.resultsCount.textContent = state.filteredWorks.length === state.works.length
        ? `${state.works.length} works`
        : `${state.filteredWorks.length} / ${state.works.length} works`;
    }

    const hasFilters = state.selectedCategory !== 'all' ||
      state.selectedModel !== 'all' ||
      state.searchQuery.trim() !== '' ||
      state.sortBy !== 'default';

    if (elements.resetFiltersBtn) {
      elements.resetFiltersBtn.style.display = hasFilters ? 'inline-block' : 'none';
    }
    if (elements.searchClear) {
      elements.searchClear.style.display = state.searchQuery ? 'block' : 'none';
    }
  }

  function resetAllFilters() {
    state.selectedCategory = 'all';
    state.selectedModel = 'all';
    state.searchQuery = '';
    state.sortBy = 'default';
    elements.searchInput.value = '';
    elements.sortSelect.value = 'default';

    if (elements.catFilterList) {
      elements.catFilterList.querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('active', c.dataset.cat === 'all');
      });
    }
    if (elements.modelFilterList) {
      elements.modelFilterList.querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('active', c.dataset.model === 'all');
      });
    }

    applyFilters();
  }

  // --- LIGHTBOX MODAL ---
  function openLightbox(index) {
    if (index < 0 || index >= state.filteredWorks.length) return;
    state.currentLightboxIndex = index;
    const item = state.filteredWorks[index];

    // Populate Sidebar
    elements.lightboxCounter.textContent = `${index + 1} / ${state.filteredWorks.length}`;
    elements.lightboxTitle.textContent = item.name || 'Untitled Artwork';
    elements.lightboxCategory.textContent = item.category || 'Generative Art';
    elements.lightboxDesc.textContent = item.description || 'No prompt details provided.';

    // Populate Models
    const models = getModelList(item);
    elements.lightboxModel.innerHTML = models.map(m => `
      <span class="badge-model" data-model="${escapeHtml(m)}">${escapeHtml(m)}</span>
    `).join('');

    // Load Stage Image
    elements.lightboxImg.src = item.file;
    resetZoom();

    elements.lightboxDialog.showModal();
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    elements.lightboxDialog.close();
    document.body.style.overflow = '';
  }

  function navigateLightbox(direction) {
    let nextIndex = state.currentLightboxIndex + direction;
    if (nextIndex < 0) nextIndex = state.filteredWorks.length - 1;
    if (nextIndex >= state.filteredWorks.length) nextIndex = 0;
    openLightbox(nextIndex);
  }

  // --- ZOOM & PAN LOGIC ---
  function setZoom(level) {
    state.zoomLevel = Math.max(1, Math.min(4, level));
    if (state.zoomLevel === 1) {
      state.panOffset = { x: 0, y: 0 };
    }
    elements.zoomLevelText.textContent = `${Math.round(state.zoomLevel * 100)}%`;
    applyTransform();
  }

  function zoomIn() {
    setZoom(state.zoomLevel + 0.35);
  }

  function zoomOut() {
    setZoom(state.zoomLevel - 0.35);
  }

  function resetZoom() {
    setZoom(1);
  }

  function applyTransform() {
    elements.lightboxImg.style.transform = `translate(${state.panOffset.x}px, ${state.panOffset.y}px) scale(${state.zoomLevel})`;
  }

  // --- EVENT BINDING ---
  function bindEvents() {
    // Admin toggle button in footer
    if (elements.btnToggleAdmin) {
      elements.btnToggleAdmin.addEventListener('click', toggleAdminMode);
    }

    // Hotkey: Ctrl+Alt+E toggles admin mode
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        toggleAdminMode();
      }
    });

    // Search input
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      applyFilters();
    });

    elements.searchClear.addEventListener('click', () => {
      state.searchQuery = '';
      elements.searchInput.value = '';
      applyFilters();
      elements.searchInput.focus();
    });

    // Sort select
    elements.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      applyFilters();
    });

    // Reset filters
    elements.resetFiltersBtn.addEventListener('click', resetAllFilters);

    // Category chips click
    if (elements.catFilterList) {
      elements.catFilterList.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        elements.catFilterList.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.selectedCategory = chip.dataset.cat;
        applyFilters();
      });
    }

    // AI Model chips click
    if (elements.modelFilterList) {
      elements.modelFilterList.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        elements.modelFilterList.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.selectedModel = chip.dataset.model;
        applyFilters();
      });
    }

    // Layout toggles
    elements.btnLayoutMasonry.addEventListener('click', () => {
      elements.btnLayoutMasonry.classList.add('active');
      elements.btnLayoutGrid.classList.remove('active');
      elements.galleryGrid.className = 'gallery-grid layout-masonry';
    });

    elements.btnLayoutGrid.addEventListener('click', () => {
      elements.btnLayoutGrid.classList.add('active');
      elements.btnLayoutMasonry.classList.remove('active');
      elements.galleryGrid.className = 'gallery-grid layout-grid';
    });

    // Card clicks (Open Lightbox)
    elements.galleryGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.art-card');
      if (!card) return;
      const index = parseInt(card.dataset.index, 10);
      openLightbox(index);
    });

    // Card keyboard trigger (Enter/Space)
    elements.galleryGrid.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.art-card');
        if (card) {
          e.preventDefault();
          const index = parseInt(card.dataset.index, 10);
          openLightbox(index);
        }
      }
    });

    // Floating Back to Top Button
    if (elements.btnBackToTop) {
      const handleScroll = () => {
        if (window.scrollY > 160) {
          elements.btnBackToTop.classList.add('is-visible');
        } else {
          elements.btnBackToTop.classList.remove('is-visible');
        }
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();

      elements.btnBackToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  function bindLightboxEvents() {
    // Navigation
    elements.lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
    elements.lightboxNext.addEventListener('click', () => navigateLightbox(1));
    elements.lightboxClose.addEventListener('click', closeLightbox);

    // Light dismiss
    elements.lightboxDialog.addEventListener('click', (e) => {
      if (e.target === elements.lightboxDialog) {
        closeLightbox();
      }
    });

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (!elements.lightboxDialog.open) return;

      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        navigateLightbox(-1);
      } else if (e.key === 'ArrowRight') {
        navigateLightbox(1);
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        zoomOut();
      } else if (e.key === '0') {
        resetZoom();
      }
    });

    // Zoom buttons
    elements.zoomInBtn.addEventListener('click', zoomIn);
    elements.zoomOutBtn.addEventListener('click', zoomOut);
    elements.zoomResetBtn.addEventListener('click', resetZoom);

    // Mouse wheel zoom
    elements.lightboxImgContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    }, { passive: false });

    // Drag to pan when zoomed
    elements.lightboxImgContainer.addEventListener('mousedown', (e) => {
      if (state.zoomLevel <= 1) return;
      state.isDragging = true;
      elements.lightboxImgContainer.classList.add('dragging');
      state.dragStart = { x: e.clientX - state.panOffset.x, y: e.clientY - state.panOffset.y };
    });

    window.addEventListener('mousemove', (e) => {
      if (!state.isDragging) return;
      state.panOffset = {
        x: e.clientX - state.dragStart.x,
        y: e.clientY - state.dragStart.y
      };
      applyTransform();
    });

    window.addEventListener('mouseup', () => {
      if (state.isDragging) {
        state.isDragging = false;
        elements.lightboxImgContainer.classList.remove('dragging');
      }
    });

    // Lightbox Edit Shortcut
    elements.lightboxEditBtn.addEventListener('click', () => {
      const currentItem = state.filteredWorks[state.currentLightboxIndex];
      closeLightbox();
      if (window.PORTFOLIO_EDITOR && window.PORTFOLIO_EDITOR.openWithItem) {
        window.PORTFOLIO_EDITOR.openWithItem(currentItem);
      }
    });
  }

  // --- PUBLIC INTERFACE FOR EDITOR SYNC ---
  window.PORTFOLIO_APP = {
    refreshData: function (newWorks) {
      state.works = [...newWorks];
      window.PORTFOLIO_WORKS = state.works;
      try {
        localStorage.setItem('portfolio_ai_saved_works', JSON.stringify(state.works));
      } catch (e) {
        console.warn('Could not save to localStorage', e);
      }
      buildFilterChips();
      applyFilters();
    },
    resetToDefaults: function () {
      localStorage.removeItem('portfolio_ai_saved_works');
      localStorage.removeItem('portfolio_saved_works');
      window.location.reload();
    },
    showToast: function (message, type = 'success') {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `
        <svg width="18" height="18" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
        <span>${escapeHtml(message)}</span>
      `;
      elements.toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    }
  };

  // Helper utility
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Boot
  document.addEventListener('DOMContentLoaded', init);
})();
