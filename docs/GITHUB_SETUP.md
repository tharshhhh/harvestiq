# How to Upload HarvestIQ to GitHub

Two methods — pick whichever you're comfortable with.

---

## Method A: Web upload (no command line)

Easiest if you've never used git.

### 1. Create the repository
1. Go to **github.com** and sign in (create an account if needed)
2. Click the **+** in the top right → **New repository**
3. Repository name: `harvestiq`
4. Description: `AI-powered precision agriculture platform for Indian farmers`
5. Choose **Public**
6. **Do NOT** tick "Add a README" — this project already has one
7. Click **Create repository**

### 2. Upload the files
1. On the empty repo page, click **uploading an existing file**
2. Open the `harvestiq` folder on your computer
3. Select **all files and folders inside it** and drag them into the browser
4. Wait for uploads to finish (the `.pkl` model files are ~7 MB each, so give it a moment)
5. Commit message: `Initial commit — HarvestIQ platform`
6. Click **Commit changes**

Done. Your README will render automatically on the repo homepage.

> **Note:** Drag-and-drop sometimes flattens folder structure in older browsers. If your folders don't appear correctly, use Method B instead.

---

## Method B: Command line (recommended)

### 1. Create the repository on GitHub
Same as Method A, steps 1–6 above.

### 2. Install git if you don't have it
```bash
git --version
```
No version shown? Install from **git-scm.com/downloads**.

### 3. Push the project

```bash
cd path/to/harvestiq

git init
git add .
git commit -m "Initial commit — HarvestIQ platform"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/harvestiq.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

### 4. Authentication

GitHub no longer accepts passwords over HTTPS. When prompted for a password, use a **Personal Access Token**:

1. GitHub → click your avatar → **Settings**
2. Scroll down → **Developer settings**
3. **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**
4. Note: `harvestiq upload`, Expiration: 30 days
5. Tick the **repo** scope
6. **Generate token** and copy it immediately — it's shown only once
7. Paste it as the password when git asks

---

## Making future changes

```bash
git add .
git commit -m "Describe what changed"
git push
```

---

## After uploading

### Add topics
On the repo page, click the gear next to **About** and add topics:
`machine-learning` `agriculture` `react` `fastapi` `python` `precision-agriculture` `tensorflow` `scikit-learn`

### Add a description
Same panel: `AI-powered precision agriculture platform — GPS soil analysis, ML crop recommendation, and plant disease detection.`

### Add screenshots (strongly recommended)
Screenshots make a repository far more compelling than text alone.

1. Create a `docs/screenshots/` folder
2. Screenshot your app's welcome, field, soil, and assistant screens
3. Add them to the README:
```markdown
## Screenshots

![Welcome](docs/screenshots/welcome.png)
![Field](docs/screenshots/field.png)
```

---

## What is deliberately excluded

The `.gitignore` blocks these on purpose:

| Excluded | Why |
|---|---|
| `venv/`, `node_modules/` | Regenerated from `requirements.txt` and `package.json` — they'd add hundreds of MB |
| `*.keras`, `*.h5` | Disease model is too large for git; the notebook regenerates it |
| `.env`, `*.key` | Never commit secrets |
| `__pycache__/`, `.DS_Store` | Build artefacts and OS clutter |

**Before pushing, double-check** you haven't hardcoded any API key in `frontend/src/App.jsx` — search for `GEMINI_API_KEY` and make sure it's still an empty string. Committing a key to a public repo means it's compromised, and GitHub will email you about it.

---

## Verifying it worked

Clone your own repo into a fresh folder and confirm it runs:

```bash
git clone https://github.com/YOUR-USERNAME/harvestiq.git test-clone
cd test-clone/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

If that starts cleanly, anyone can run your project from the repo — which is the real test of whether it's uploaded properly.
