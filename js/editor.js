/**
 * AI GENERATIVE ART & IMAGERY PORTFOLIO - METADATA EDITOR & SYNC
 * -----------------------------------------------------------------
 * Allows on-the-fly editing of Name, AI Models (multi-select),
 * Category, and Prompt descriptions with live preview.
 *
 * Persists immediately to browser localStorage, enables one-click
 * Direct GitHub Sync to commit changes to GitHub Pages, and provides
 * code export / works.js download options.
 */

(function () {
  'use strict';

  // Modal & Tab Elements
  const editorDialog = document.getElementById('editorModal');
  const editorClose = document.getElementById('editorClose');
  const btnOpenEditor = document.getElementById('btnOpenEditor');
  const tabEditExisting = document.getElementById('tabEditExisting');
  const tabAddNew = document.getElementById('tabAddNew');
  const panelEditExisting = document.getElementById('panelEditExisting');
  const panelAddNew = document.getElementById('panelAddNew');

  // Edit Existing Form Elements
  const selectWorkItem = document.getElementById('selectWorkItem');
  const editFieldTitle = document.getElementById('editFieldTitle');
  const modelCheckboxGroup = document.getElementById('modelCheckboxGroup');
  const editFieldCategory = document.getElementById('editFieldCategory');
  const editFieldDesc = document.getElementById('editFieldDesc');
  const previewImg = document.getElementById('editorPreviewImg');
  const previewTitle = document.getElementById('editorPreviewTitle');
  const previewFile = document.getElementById('editorPreviewFile');

  // Add New Artwork Form Elements
  const newFieldFile = document.getElementById('newFieldFile');
  const newFieldTitle = document.getElementById('newFieldTitle');
  const newModelCheckboxGroup = document.getElementById('newModelCheckboxGroup');
  const newFieldCategory = document.getElementById('newFieldCategory');
  const newFieldDesc = document.getElementById('newFieldDesc');
  const newPreviewStrip = document.getElementById('newPreviewStrip');
  const newPreviewImg = document.getElementById('newPreviewImg');
  const newPreviewTitleText = document.getElementById('newPreviewTitleText');
  const newPreviewPathText = document.getElementById('newPreviewPathText');
  const btnSubmitNewWork = document.getElementById('btnSubmitNewWork');

  // GitHub Sync Elements
  const syncHeaderToggle = document.getElementById('syncHeaderToggle');
  const syncBoxBody = document.getElementById('syncBoxBody');
  const ghRepoInput = document.getElementById('ghRepoInput');
  const ghBranchInput = document.getElementById('ghBranchInput');
  const ghTokenInput = document.getElementById('ghTokenInput');
  const btnPushGitHub = document.getElementById('btnPushGitHub');
  const ghSyncStatus = document.getElementById('ghSyncStatus');

  // Buttons
  const btnSaveItem = document.getElementById('btnSaveItem');
  const btnDeleteItem = document.getElementById('btnDeleteItem');
  const btnDownloadJs = document.getElementById('btnDownloadJs');
  const btnCopyJs = document.getElementById('btnCopyJs');
  const btnAddNewWork = document.getElementById('btnAddNewWork');
  const btnResetDefaults = document.getElementById('btnResetDefaults');

  let currentEditingItem = null;

  function init() {
    if (!editorDialog) return;

    populateSelectOptions();
    autoDetectGitHubConfig();
    bindEditorEvents();

    if (window.PORTFOLIO_WORKS && window.PORTFOLIO_WORKS.length > 0) {
      loadItemIntoForm(window.PORTFOLIO_WORKS[0]);
    }
  }

  function autoDetectGitHubConfig() {
    if (!ghRepoInput) return;

    const storedRepo = localStorage.getItem('portfolio_ai_gh_repo') || localStorage.getItem('portfolio_gh_repo');
    const storedToken = localStorage.getItem('portfolio_ai_gh_token') || localStorage.getItem('portfolio_gh_token');
    const storedBranch = localStorage.getItem('portfolio_ai_gh_branch') || localStorage.getItem('portfolio_gh_branch');

    if (storedRepo) ghRepoInput.value = storedRepo;
    if (storedToken && ghTokenInput) ghTokenInput.value = storedToken;
    if (storedBranch && ghBranchInput) ghBranchInput.value = storedBranch;

    // Auto-detect if empty and hosted on github.io
    if (!ghRepoInput.value) {
      const host = window.location.hostname;
      const path = window.location.pathname.replace(/^\/|\/$/g, '');
      if (host.endsWith('.github.io')) {
        const user = host.split('.')[0];
        const repo = path.split('/')[0] || 'portfolio_ai';
        ghRepoInput.value = `${user}/${repo}`;
      }
    }
  }

  function populateSelectOptions(selectedId = null) {
    const works = window.PORTFOLIO_WORKS || [];
    selectWorkItem.innerHTML = works.map(w => {
      const label = `${w.id || '•'}: ${w.name || 'Untitled'} (${w.file.split('/').pop()})`;
      const isSelected = selectedId === w.id ? 'selected' : '';
      return `<option value="${w.id}" ${isSelected}>${escapeHtml(label)}</option>`;
    }).join('');
  }

  function getModelArray(item) {
    if (!item) return [];
    const models = item.model || item.models || item.ai_model || [];
    if (Array.isArray(models)) return models;
    if (typeof models === 'string' && models.trim()) return [models.trim()];
    return [];
  }

  function loadItemIntoForm(item) {
    if (!item) return;
    currentEditingItem = item;

    editFieldTitle.value = item.name || '';

    // Set Model checkboxes (Multi-select)
    const itemModels = getModelArray(item).map(m => m.toLowerCase());
    const checkboxes = modelCheckboxGroup.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      const val = cb.value.toLowerCase();
      const isChecked = itemModels.some(m => m.includes(val) || val.includes(m));
      cb.checked = isChecked;
      cb.closest('.model-checkbox-label').classList.toggle('is-checked', isChecked);
    });

    // Set Category dropdown
    if (editFieldCategory) {
      editFieldCategory.value = item.category || '3D Miniatures';
    }

    editFieldDesc.value = item.description || '';

    previewImg.src = item.file || '';
    previewTitle.textContent = item.name || 'Untitled Artwork';
    previewFile.textContent = item.file || '';
    selectWorkItem.value = item.id;
  }

  function saveCurrentItem(showToast = true) {
    if (!currentEditingItem) return;

    currentEditingItem.name = editFieldTitle.value.trim() || 'Untitled Artwork';

    // Collect checked AI Models
    const checkboxes = modelCheckboxGroup.querySelectorAll('input[type="checkbox"]:checked');
    const selectedModels = Array.from(checkboxes).map(cb => cb.value);
    currentEditingItem.model = selectedModels.length > 0 ? selectedModels : ['Midjourney'];

    // Category & Description
    currentEditingItem.category = editFieldCategory ? editFieldCategory.value : '3D Miniatures';
    currentEditingItem.description = editFieldDesc.value.trim();

    if (previewTitle) previewTitle.textContent = currentEditingItem.name;

    populateSelectOptions(currentEditingItem.id);

    // Save to localStorage immediately
    try {
      localStorage.setItem('portfolio_ai_saved_works', JSON.stringify(window.PORTFOLIO_WORKS));
    } catch (e) {
      console.warn('Could not persist to localStorage', e);
    }

    // Sync with main app
    if (window.PORTFOLIO_APP) {
      window.PORTFOLIO_APP.refreshData(window.PORTFOLIO_WORKS);
      if (showToast) {
        window.PORTFOLIO_APP.showToast(`Saved "${currentEditingItem.name}" locally in your browser!`);
      }
    }
  }

  function deleteCurrentItem() {
    if (!currentEditingItem) return;

    const itemName = currentEditingItem.name || 'this artwork';
    if (!confirm(`Are you sure you want to delete "${itemName}" from your portfolio?`)) {
      return;
    }

    const currentWorks = window.PORTFOLIO_WORKS || [];
    const index = currentWorks.findIndex(w => w.id === currentEditingItem.id || w.file === currentEditingItem.file);
    if (index === -1) return;

    currentWorks.splice(index, 1);

    // Save to localStorage immediately
    try {
      localStorage.setItem('portfolio_ai_saved_works', JSON.stringify(currentWorks));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }

    if (currentWorks.length > 0) {
      const nextIndex = Math.min(index, currentWorks.length - 1);
      const nextItem = currentWorks[nextIndex];
      populateSelectOptions(nextItem.id);
      loadItemIntoForm(nextItem);
    } else {
      currentEditingItem = null;
      selectWorkItem.innerHTML = '';
      editFieldTitle.value = '';
      editFieldDesc.value = '';
      previewImg.src = '';
      previewTitle.textContent = 'No artworks';
      previewFile.textContent = '';
    }

    if (window.PORTFOLIO_APP) {
      window.PORTFOLIO_APP.refreshData(currentWorks);
      window.PORTFOLIO_APP.showToast(`Deleted "${itemName}" from gallery!`);
    }
  }

  function generateFileContent() {
    const code = `/**
 * AI GENERATED IMAGES PORTFOLIO DATA
 * ----------------------------------------------------
 * Allowed AI Models: "Midjourney", "ChatGPT", "NanoBanana", "ComfyUI"
 * Allowed Categories: "3D Miniatures", "Product & Tech", "Characters & Fashion", "Environments & Sci-Fi", "Creatures & Art"
 */

const ALLOWED_MODELS = ${JSON.stringify(window.ALLOWED_MODELS || ["Midjourney", "ChatGPT", "NanoBanana", "ComfyUI"], null, 2)};

const ALLOWED_CATEGORIES = ${JSON.stringify(window.ALLOWED_CATEGORIES || ["3D Miniatures", "Product & Tech", "Characters & Fashion", "Environments & Sci-Fi", "Creatures & Art"], null, 2)};

const PORTFOLIO_WORKS = ${JSON.stringify(window.PORTFOLIO_WORKS || [], null, 2)};

if (typeof window !== "undefined") {
  window.PORTFOLIO_WORKS = PORTFOLIO_WORKS;
  window.ALLOWED_MODELS = ALLOWED_MODELS;
  window.ALLOWED_CATEGORIES = ALLOWED_CATEGORIES;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { PORTFOLIO_WORKS, ALLOWED_MODELS, ALLOWED_CATEGORIES };
}
`;
    return code;
  }

  function downloadWorksFile() {
    saveCurrentItem(false);
    const content = generateFileContent();
    const blob = new Blob([content], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'works.js';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (window.PORTFOLIO_APP) {
      window.PORTFOLIO_APP.showToast('Downloaded works.js! Replace data/works.js in your repo.');
    }
  }

  function copyCodeToClipboard() {
    saveCurrentItem(false);
    const content = generateFileContent();
    navigator.clipboard.writeText(content).then(() => {
      if (window.PORTFOLIO_APP) {
        window.PORTFOLIO_APP.showToast('Copied works.js code to clipboard!');
      }
    }).catch(err => {
      console.error('Failed to copy code: ', err);
      alert('Could not auto-copy to clipboard. Please use Download works.js instead.');
    });
  }

  async function pushDirectlyToGitHub() {
    saveCurrentItem(false);

    const repo = ghRepoInput.value.trim();
    const branch = ghBranchInput.value.trim() || 'main';
    const token = ghTokenInput.value.trim();

    if (!repo || !token) {
      alert('Please provide your GitHub Repository (e.g. username/portfolio_ai) and a Personal Access Token with repo permissions.');
      return;
    }

    localStorage.setItem('portfolio_ai_gh_repo', repo);
    localStorage.setItem('portfolio_ai_gh_branch', branch);
    localStorage.setItem('portfolio_ai_gh_token', token);

    ghSyncStatus.style.color = 'var(--accent-cyan)';
    ghSyncStatus.textContent = 'Connecting to GitHub...';
    btnPushGitHub.disabled = true;

    try {
      const filePath = 'data/works.js';
      const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`;

      // 1. Get existing file SHA
      let currentSha = null;
      try {
        const getRes = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (getRes.ok) {
          const getData = await getRes.json();
          currentSha = getData.sha;
        }
      } catch (e) {
        console.warn('Could not fetch existing file SHA, creating new file.', e);
      }

      // 2. Commit updated file
      const fileContent = generateFileContent();
      const utf8Bytes = new TextEncoder().encode(fileContent);
      let binaryStr = '';
      utf8Bytes.forEach(b => binaryStr += String.fromCharCode(b));
      const base64Content = btoa(binaryStr);

      const commitBody = {
        message: 'Update AI portfolio works metadata [via Web Editor]',
        content: base64Content,
        branch: branch
      };

      if (currentSha) {
        commitBody.sha = currentSha;
      }

      const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commitBody)
      });

      if (!putRes.ok) {
        const errJson = await putRes.json();
        throw new Error(errJson.message || `HTTP ${putRes.status}`);
      }

      ghSyncStatus.style.color = '#10b981';
      ghSyncStatus.textContent = '✓ Successfully committed & pushed! GitHub Pages will update in ~1 min.';
      if (window.PORTFOLIO_APP) {
        window.PORTFOLIO_APP.showToast('Pushed directly to GitHub!');
      }
    } catch (err) {
      console.error('GitHub Sync Error:', err);
      ghSyncStatus.style.color = '#f87171';
      ghSyncStatus.textContent = `Push Failed: ${err.message}`;
    } finally {
      btnPushGitHub.disabled = false;
    }
  }

  function switchTab(tab) {
    if (tab === 'addNew') {
      tabEditExisting.classList.remove('active');
      tabAddNew.classList.add('active');
      panelEditExisting.style.display = 'none';
      panelAddNew.style.display = 'flex';
      setTimeout(() => newFieldFile.focus(), 80);
    } else {
      tabAddNew.classList.remove('active');
      tabEditExisting.classList.add('active');
      panelAddNew.style.display = 'none';
      panelEditExisting.style.display = 'flex';
    }
  }

  function handleNewImageFileInput() {
    let filename = newFieldFile.value.trim();
    if (!filename) {
      if (newPreviewStrip) newPreviewStrip.style.display = 'none';
      return;
    }

    let filePath = filename;
    if (!filePath.startsWith('images/') && !filePath.startsWith('http')) {
      filePath = `images/${filePath}`;
    }

    if (newFieldTitle && (!newFieldTitle.value || newFieldTitle.dataset.autoGenerated === 'true')) {
      const base = filename.replace(/^images\//, '').replace(/\.[^/.]+$/, '');
      const cleaned = base.replace(/^[0-9]+_/, '').replace(/_/g, ' ');
      newFieldTitle.value = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      newFieldTitle.dataset.autoGenerated = 'true';
    }

    if (newPreviewStrip && newPreviewImg) {
      newPreviewImg.src = filePath;
      if (newPreviewTitleText) newPreviewTitleText.textContent = newFieldTitle.value || 'New Artwork';
      if (newPreviewPathText) newPreviewPathText.textContent = filePath;
      newPreviewStrip.style.display = 'flex';
    }
  }

  function submitNewArtwork() {
    if (!newFieldFile) return;
    let rawFile = newFieldFile.value.trim();
    if (!rawFile) {
      alert('Please enter an image file name (e.g. 3d_print_mini_0032.png).');
      newFieldFile.focus();
      return;
    }

    let filePath = rawFile;
    if (!filePath.startsWith('images/') && !filePath.startsWith('http')) {
      filePath = `images/${filePath}`;
    }

    const title = (newFieldTitle && newFieldTitle.value.trim()) || 'New Artwork';

    // Collect AI Models
    let selectedModels = [];
    if (newModelCheckboxGroup) {
      const checkedBoxes = newModelCheckboxGroup.querySelectorAll('input[type="checkbox"]:checked');
      selectedModels = Array.from(checkedBoxes).map(cb => cb.value);
    }
    if (selectedModels.length === 0) selectedModels = ['Midjourney'];

    const category = (newFieldCategory && newFieldCategory.value) || 'Creatures & Art';
    const desc = (newFieldDesc && newFieldDesc.value.trim()) || 'AI generated artwork.';

    // Calculate next ID
    const currentWorks = window.PORTFOLIO_WORKS || [];
    const maxNum = currentWorks.reduce((max, w) => {
      const num = parseInt(w.id, 10);
      return !isNaN(num) && num > max ? num : max;
    }, currentWorks.length);
    const nextId = String(maxNum + 1).padStart(3, '0');

    const newItem = {
      id: nextId,
      name: title,
      file: filePath,
      model: selectedModels,
      category: category,
      description: desc
    };

    currentWorks.push(newItem);

    // Save to localStorage immediately
    try {
      localStorage.setItem('portfolio_ai_saved_works', JSON.stringify(currentWorks));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }

    // Refresh application & UI
    populateSelectOptions(newItem.id);
    loadItemIntoForm(newItem);
    switchTab('edit');

    if (window.PORTFOLIO_APP) {
      window.PORTFOLIO_APP.refreshData(currentWorks);
      window.PORTFOLIO_APP.showToast(`Added "${newItem.name}" to gallery!`);
    }

    // Reset add form fields
    newFieldFile.value = '';
    if (newFieldTitle) {
      newFieldTitle.value = '';
      delete newFieldTitle.dataset.autoGenerated;
    }
    if (newFieldDesc) newFieldDesc.value = '';
    if (newPreviewStrip) newPreviewStrip.style.display = 'none';
  }

  function bindEditorEvents() {
    // Tab switching
    if (tabEditExisting) {
      tabEditExisting.addEventListener('click', () => switchTab('edit'));
    }
    if (tabAddNew) {
      tabAddNew.addEventListener('click', () => switchTab('addNew'));
    }

    // Real-time input handling for Add New Artwork
    if (newFieldFile) {
      newFieldFile.addEventListener('input', handleNewImageFileInput);
    }
    if (newFieldTitle) {
      newFieldTitle.addEventListener('input', () => {
        delete newFieldTitle.dataset.autoGenerated;
        if (newPreviewTitleText) {
          newPreviewTitleText.textContent = newFieldTitle.value || 'New Artwork';
        }
      });
    }

    // Model Checkbox styling for Add New form
    if (newModelCheckboxGroup) {
      newModelCheckboxGroup.addEventListener('change', (e) => {
        const cb = e.target.closest('input[type="checkbox"]');
        if (cb) {
          cb.closest('.model-checkbox-label').classList.toggle('is-checked', cb.checked);
        }
      });
    }

    // Submit Add New Artwork button
    if (btnSubmitNewWork) {
      btnSubmitNewWork.addEventListener('click', submitNewArtwork);
    }

    // Open editor
    if (btnOpenEditor) {
      btnOpenEditor.addEventListener('click', () => {
        switchTab('edit');
        editorDialog.showModal();
      });
    }

    // Close editor
    if (editorClose) {
      editorClose.addEventListener('click', () => {
        editorDialog.close();
      });
    }

    // Light dismiss
    editorDialog.addEventListener('click', (e) => {
      if (e.target === editorDialog) {
        editorDialog.close();
      }
    });

    // Auto-save on field changes in Edit form
    const autoSaveInputFields = [editFieldTitle, editFieldDesc];
    autoSaveInputFields.forEach(field => {
      if (field) {
        field.addEventListener('input', () => saveCurrentItem(false));
      }
    });

    if (editFieldCategory) {
      editFieldCategory.addEventListener('change', () => saveCurrentItem(false));
    }

    // Model Checkbox styling toggle & auto-save on change (Edit form)
    if (modelCheckboxGroup) {
      modelCheckboxGroup.addEventListener('change', (e) => {
        const cb = e.target.closest('input[type="checkbox"]');
        if (cb) {
          cb.closest('.model-checkbox-label').classList.toggle('is-checked', cb.checked);
        }
        saveCurrentItem(false);
      });
    }

    // Dropdown change: auto-save current item before switching
    selectWorkItem.addEventListener('change', (e) => {
      saveCurrentItem(false);
      const selected = (window.PORTFOLIO_WORKS || []).find(w => w.id === e.target.value);
      if (selected) {
        loadItemIntoForm(selected);
      }
    });

    // Toggle GitHub Sync Box
    if (syncHeaderToggle && syncBoxBody) {
      syncHeaderToggle.addEventListener('click', () => {
        syncHeaderToggle.classList.toggle('open');
        syncBoxBody.classList.toggle('open');
      });
    }

    // Manual Save button
    if (btnSaveItem) btnSaveItem.addEventListener('click', () => saveCurrentItem(true));

    // Delete Artwork button
    if (btnDeleteItem) btnDeleteItem.addEventListener('click', deleteCurrentItem);

    // Download button
    btnDownloadJs.addEventListener('click', downloadWorksFile);

    // Copy button
    btnCopyJs.addEventListener('click', copyCodeToClipboard);

    // Direct GitHub Push button
    if (btnPushGitHub) {
      btnPushGitHub.addEventListener('click', pushDirectlyToGitHub);
    }

    // Reset to defaults
    if (btnResetDefaults) {
      btnResetDefaults.addEventListener('click', () => {
        if (confirm('Revert all local changes and reset back to the default repository data?')) {
          if (window.PORTFOLIO_APP && window.PORTFOLIO_APP.resetToDefaults) {
            window.PORTFOLIO_APP.resetToDefaults();
          }
        }
      });
    }

    // Footer "+ Add New Image" button switches to Add New tab
    if (btnAddNewWork) {
      btnAddNewWork.addEventListener('click', () => switchTab('addNew'));
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Public API
  window.PORTFOLIO_EDITOR = {
    openWithItem: function (item) {
      if (!editorDialog) return;
      populateSelectOptions(item.id);
      loadItemIntoForm(item);
      editorDialog.showModal();
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
