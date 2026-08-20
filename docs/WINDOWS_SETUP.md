# HarvestIQ — Windows Setup Guide

Everything you need to run HarvestIQ on a Windows desktop.

---

## Part 0 — Install prerequisites

| Software | Where | Notes |
|---|---|---|
| **Python 3.11 or 3.12** | python.org/downloads | ⚠️ **CHECK "Add Python to PATH"** on the first install screen — this is the #1 thing Windows users miss |
| **Node.js (LTS)** | nodejs.org | Default options are fine |
| **VS Code** (optional but recommended) | code.visualstudio.com | Much easier than Notepad for editing files |

**Verify both installed.** Open **Command Prompt** (press `Win + R`, type `cmd`, Enter):

```cmd
python --version
node --version
```

Both should print version numbers. If `python` isn't recognized, reinstall Python with the PATH box checked.

> **Note:** Windows uses `python`, not `python3`. Windows uses `\` in paths, not `/`.

---

## Part 1 — Backend setup

### 1.1 Create the folder
```cmd
cd %USERPROFILE%\Desktop
mkdir harvestiq-backend
cd harvestiq-backend
```

### 1.2 Copy your files in
Using File Explorer, move these into `Desktop\harvestiq-backend`:
- `main.py` (use `main_with_disease.py`, renamed to `main.py`)
- `crop_model.pkl`
- `disease_model.keras` (only if you trained it)
- `disease_classes.json` (only if you trained it)

### 1.3 Create a virtual environment
```cmd
python -m venv venv
venv\Scripts\activate
```

> **Windows difference:** it's `venv\Scripts\activate`, NOT `source venv/bin/activate` like on Mac.

Your prompt should now start with `(venv)`.

**If you get an error about execution policies** (happens in PowerShell, not Command Prompt), either use Command Prompt instead, or run this once in PowerShell as Administrator:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### 1.4 Install packages
```cmd
pip install fastapi uvicorn scikit-learn pandas joblib
```

If you have the disease model, also:
```cmd
pip install tensorflow pillow python-multipart
```

### 1.5 Run the backend
```cmd
python -m uvicorn main:app --reload
```

✅ Should print `Uvicorn running on http://127.0.0.1:8000`

**If Windows Firewall pops up**, click **Allow access**.

**Test it:** open `http://127.0.0.1:8000/docs` in your browser.

**Leave this window open.** Closing it stops the backend.

---

## Part 2 — Frontend setup

### 2.1 Open a SECOND Command Prompt
(Don't reuse the backend one — it needs to keep running.)

### 2.2 Create the app
```cmd
cd %USERPROFILE%\Desktop
npm create vite@latest harvestiq-app -- --template react
cd harvestiq-app
npm install
npm install lucide-react
```

When prompted:
- Linter: pick either (Oxlint is fine)
- "Install with npm and start now?": **Yes**

### 2.3 Add Tailwind CSS
Open `Desktop\harvestiq-app\index.html` in VS Code or Notepad.

Add this line inside the `<head>` section:
```html
<script src="https://cdn.tailwindcss.com"></script>
```
Save.

> If using Notepad and it won't open the file: right-click → Open with → Notepad.

### 2.4 Replace App.jsx
Copy your `HarvestIQ_v3.jsx` (or `HarvestIQ_final.jsx`) into `Desktop\harvestiq-app\src\`, then **rename it to `App.jsx`**, replacing the existing file.

Via Command Prompt instead:
```cmd
copy %USERPROFILE%\Downloads\HarvestIQ_v3.jsx %USERPROFILE%\Desktop\harvestiq-app\src\App.jsx
```

### 2.5 Run the frontend
```cmd
cd %USERPROFILE%\Desktop\harvestiq-app
npm run dev
```

✅ Should print `Local: http://localhost:5173/`

Open that URL in your browser.

---

## Part 3 — Daily startup (after first setup)

You need **two Command Prompt windows** open every time:

**Window 1 — Backend:**
```cmd
cd %USERPROFILE%\Desktop\harvestiq-backend
venv\Scripts\activate
python -m uvicorn main:app --reload
```

**Window 2 — Frontend:**
```cmd
cd %USERPROFILE%\Desktop\harvestiq-app
npm run dev
```

Then open `http://localhost:5173/`

---

## Mac → Windows command reference

| Task | Mac | Windows |
|---|---|---|
| Python | `python3` | `python` |
| Activate venv | `source venv/bin/activate` | `venv\Scripts\activate` |
| Home folder | `~/` | `%USERPROFILE%\` |
| Copy file | `cp a b` | `copy a b` |
| List files | `ls -la` | `dir` |
| Make folder | `mkdir x` | `mkdir x` |
| Stop server | `Ctrl + C` | `Ctrl + C` |
| Path separator | `/` | `\` |

---

## Troubleshooting

**"'python' is not recognized"**
Python isn't on PATH. Reinstall from python.org and check "Add Python to PATH".

**"'npm' is not recognized"**
Node.js isn't installed or needs a restart. Reinstall, then close and reopen Command Prompt.

**"Could not reach backend" in the app**
The backend window isn't running. Start it (Part 3, Window 1) and confirm `http://127.0.0.1:8000/docs` loads.

**TensorFlow won't install**
TensorFlow needs 64-bit Python 3.9–3.12. Check with `python --version`. If you're on 3.13+, install 3.12 instead.

**Port already in use**
Something else is using 8000 or 5173. Either close it, or run on a different port:
```cmd
python -m uvicorn main:app --reload --port 8001
```
(If you change the backend port, update the fetch URLs in `App.jsx` to match.)

**Camera or location not working**
Browsers only allow these on `localhost` or HTTPS. Make sure you're using `http://localhost:5173/`, not the network IP address.
