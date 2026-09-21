# AI Generative Art & Imagery Portfolio

A modern, high-aesthetic portfolio web application designed for AI artists, concept designers, and creative technologists. Designed to run directly on **GitHub Pages** (or any static web host) with zero build steps or npm installations.

---

## ✨ Features

- **Divided by Curated Categories**:
  - `3D Miniatures`: Resin 3D print figurine sculpts and tabletop characters.
  - `Product & Tech`: Tactile hardware devices, microchips, and PCBs.
  - `Characters & Fashion`: Studio portraits and cinematic characters.
  - `Environments & Sci-Fi`: Space station lounges, coastal twilight lighthouses, and vehicles.
  - `Creatures & Art`: Stylized animals, classical still lifes, and whimsical concepts.
- **AI Model Pipeline Badges**:
  - Support for `Midjourney`, `ChatGPT`, `NanoBanana`, and `ComfyUI` with color-coded badges.
- **Clean Thumbnails**: Badges and categories appear cleanly underneath each thumbnail without obstructing artwork.
- **GitHub Pages Ready**: Zero build dependencies, pure HTML5, modern Vanilla CSS, and modular JavaScript. Uses relative paths so it functions immediately on `https://<username>.github.io/<repo>/`.
- **Owner Mode & Privacy**:
  - Regular visitors to your GitHub Pages site **only see your clean portfolio** with edit controls hidden.
  - Open Owner Mode anytime by pressing **`Ctrl + Alt + E`** (or visiting with `?edit=1`), or clicking the **"Owner Access"** button in the footer.
  - Protected with cryptographic authentication (`GBs13L168MKp`).
- **Interactive Lightbox Modal**: Native HTML `<dialog>` with backdrop blur, full-resolution display, dynamic zoom & pan controls, and keyboard navigation (Left/Right arrows, `+`, `-`, `0`, Escape).
- **Instant Filtering & Search**:
  - Filter chips by Category.
  - Filter chips by AI Model.
  - Live full-text search across artwork titles, AI models, categories, and prompt descriptions.
  - Sort by default, name (A-Z / Z-A), and Category.
  - Layout toggle between dynamic **Masonry** flow and structured **Grid**.

---

## 🚀 How to Publish to GitHub Pages

1. **Push this repository to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial AI portfolio release"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository on GitHub.
   - Click **Settings** → **Pages** (in the left sidebar).
   - Under **Build and deployment** → **Source**, select **Deploy from a branch**.
   - Under **Branch**, select `main` and folder `/ (root)`.
   - Click **Save**.
   - Your portfolio will be live at `https://<your-username>.github.io/<your-repo-name>/` in 1–2 minutes!

---

## 💾 How to Save & Publish Your Metadata Changes

### 1. Instant Browser Persistence (`localStorage`)
- Any change you make in the on-page editor and click **"Save Changes"** is **automatically saved to your browser** (`localStorage`).
- Refreshing the page or reopening the browser will NOT lose your edits.

### 2. Making Changes Live on GitHub Pages (for everyone):

#### Option A: One-Click Direct GitHub Sync (Recommended)
1. In the **Metadata Inspector** modal, expand **"Direct GitHub Sync"**.
2. Enter your repository (`username/portfolio_ai`) and a GitHub Personal Access Token (with `repo` write permission).
3. Click **"Commit & Push to GitHub"**.
4. The site commits `data/works.js` directly to your GitHub repository! GitHub Pages will rebuild and update automatically in ~60 seconds.

#### Option B: Download & Git Push
1. In the on-page editor, click **"Download works.js"** (or **"Copy Code"**).
2. Replace `data/works.js` with your downloaded file.
3. Commit and push:
   ```bash
   git add data/works.js
   git commit -m "Update AI portfolio metadata"
   git push
   ```

---

## 🖼️ Adding New Images

1. Drop your new image file into the `images/` folder (e.g. `images/my_new_ai_art.png`).
2. Add a new entry to `data/works.js` with its filename:
   ```javascript
   {
     id: "025",
     name: "My New AI Artwork",
     file: "images/my_new_ai_art.png",
     model: ["Midjourney"],
     category: "Creatures & Art",
     description: "Prompt description and style notes."
   }
   ```
   *(Or click **"Edit Metadata"** → **"+ Add New Artwork"** right in your browser!)*

---

## 📁 Project Structure

```
portfolio_ai/
├── index.html            # Core HTML structure & semantic layout
├── .nojekyll             # Ensures GitHub Pages serves all assets
├── README.md             # Documentation & deployment guide
├── assets/
│   └── EB_avatar_office.png # Profile avatar
├── css/
│   └── style.css         # Dark studio design system, AI badges & responsive layout
├── js/
│   ├── app.js            # Gallery renderer, category & model filter logic, lightbox
│   └── editor.js         # Interactive metadata editor, GitHub API sync & export utility
├── data/
│   └── works.js          # All 24 artworks with Category and AI Model metadata
└── images/               # 24 AI artwork files
```
