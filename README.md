# HarvestIQ

**AI-powered precision agriculture platform for Indian farmers.**

HarvestIQ uses a farmer's GPS location to analyse their field's soil, recommends suitable crops using a trained machine learning model, detects plant diseases from leaf photographs, and provides crop-specific guidance across the full farming lifecycle.

---

## Features

| Feature | Status | Description |
|---|---|---|
| **GPS field detection** | Working | Detects location via browser geolocation, with IP-based and manual fallbacks |
| **Live soil analysis** | Working | Queries SoilGrids (ISRIC) for pH, clay/sand/silt, organic carbon, and nitrogen at the user's coordinates; derives USDA texture class |
| **Live weather** | Working | Current conditions and 5-day forecast from Open-Meteo, keyed to the detected location |
| **AI crop recommendation** | Working | Random Forest classifier, 99.55% test accuracy across 22 crop classes |
| **Extended crop coverage** | Working | Second model adds 9 more crops (wheat, sugarcane, barley, groundnut, millets, and others) — 31 unique crops total |
| **Disease detection** | Partial | Camera capture and upload pipeline complete; CNN training notebook provided but model not included in this repo |
| **Crop lifecycle guidance** | Working | Stage-by-stage guidance from land preparation through harvest |
| **AI assistant** | Working | 20-topic agricultural knowledge base, with optional LLM integration |
| **Alerts** | Demo | Weather, pest, and irrigation advisories |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  React Frontend (Vite)                      │
│  Geolocation · Camera · Live weather · UI   │
└──────────────────┬──────────────────────────┘
                   │ REST
┌──────────────────▼──────────────────────────┐
│  FastAPI Backend                            │
│  /predict         crop recommendation       │
│  /detect-disease  leaf image classification │
└──────────────────┬──────────────────────────┘
                   │
       ┌───────────┴────────────┐
       ▼                        ▼
┌──────────────┐        ┌──────────────────┐
│ Random Forest│        │ MobileNetV2 CNN  │
│ (scikit-learn)│       │ (TensorFlow)     │
└──────────────┘        └──────────────────┘

External APIs: SoilGrids (ISRIC) · Open-Meteo · Nominatim
```

---

## Model Results

### Crop Recommendation (Model 1)

Benchmarked five algorithms on the Crop Recommendation Dataset (2,200 samples, 22 classes, 7 features):

| Model | Test Accuracy | 5-Fold CV Mean |
|---|---|---|
| **Random Forest** | **99.55%** | **99.45%** |
| SVM (RBF) | 98.86% | 97.95% |
| Decision Tree | 98.64% | 98.68% |
| Logistic Regression | 96.36% | 96.50% |
| KNN | 97.05% | 97.09% |

Random Forest selected. Feature importance ranks rainfall and humidity highest, consistent with agronomic expectation.

### Extended Crop Coverage (Model 2)

Trained on a second dataset (552 samples, 17 classes) with a different feature schema — soil type and moisture rather than pH and rainfall. Adds 9 crop classes not present in Model 1.

**Note on honesty:** Model 2 reports 100% test accuracy. This reflects a small, cleanly-separable dataset (some classes have only 3-5 test samples) rather than production-grade performance. It is reported here as-is with that caveat stated.

The two datasets were deliberately **not merged**, since fabricating the missing feature columns to force a join would corrupt both. A region/season pre-filter would route queries to the appropriate specialist model in a production system.

---

## Quick Start

### Prerequisites
- Python 3.9–3.12
- Node.js 18+

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
Runs at `http://127.0.0.1:8000` — interactive API docs at `/docs`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:5173`.

Both servers must be running for AI predictions to work.

---

## Repository Structure

```
harvestiq/
├── backend/              FastAPI server and trained models
│   ├── main.py
│   ├── requirements.txt
│   └── models/           .pkl model files
├── frontend/             React application
│   ├── src/App.jsx
│   ├── index.html
│   └── package.json
├── ml/
│   ├── notebooks/        Training notebooks
│   ├── data/             Datasets
│   └── results/          Confusion matrices, charts
└── docs/                 Setup guides
```

---

## Datasets

| Dataset | Size | Source | Used For |
|---|---|---|---|
| Crop Recommendation | 2,200 rows, 22 crops | Public (Kaggle) | Model 1 |
| Crop & Fertilizer | 552 rows, 17 crops | Public | Model 2 |
| PlantVillage | 54,303 images, 38 classes | Public | Disease model (notebook provided) |

Live data sources: SoilGrids (ISRIC), Open-Meteo, Nominatim (OpenStreetMap).

---

## Known Limitations

Stated plainly, because a project's credibility depends on it:

- **The disease model is not included.** The training notebook is provided and runs on Colab's free GPU in roughly 30 minutes, but the trained weights are not in this repository. Until it is trained and placed in `backend/`, the disease endpoint returns a 503.
- **SoilGrids has coverage gaps.** It returns null values for urban areas (verified: Chennai, Kanchipuram, Bangalore). The app falls back to regional estimates and labels them as such rather than presenting them as measured.
- **SoilGrids is modelled, not sampled.** It is a global 250m-resolution prediction, not a soil test of the specific field. India's Soil Health Card scheme would provide ground-truth data and is the natural next integration.
- **NPK values are partly estimated.** SoilGrids provides nitrogen but not plant-available phosphorus or potassium, so those use regional defaults in the crop model input.
- **99.55% reflects a clean benchmark.** Real field data is noisier; deployment accuracy would be lower.
- **The assistant is knowledge-base driven,** not a language model, unless a Gemini API key is configured. It covers 20 agricultural topics and falls back gracefully outside them.
- **No user authentication or persistence.** Profiles exist for the session only.

---

## Roadmap

- [ ] Train and integrate the disease detection CNN
- [ ] Soil Health Card API integration for India-specific ground truth
- [ ] Expand crop coverage toward 100+ species using agronomic data
- [ ] Disease knowledge base decoupled from the image classifier, allowing documentation of many more diseases than are photo-detectable
- [ ] User accounts and persistent field history
- [ ] Regional language support (Tamil, Hindi, Telugu)
- [ ] Deployment (Vercel + Render)

---

## Tech Stack

**Frontend:** React 18, Vite, Tailwind CSS, Lucide icons
**Backend:** FastAPI, Uvicorn
**ML:** scikit-learn, TensorFlow/Keras, pandas, NumPy
**APIs:** SoilGrids, Open-Meteo, Nominatim

---

## License

MIT — see [LICENSE](LICENSE).

## Acknowledgements

ISRIC (SoilGrids), Open-Meteo, OpenStreetMap/Nominatim, and the PlantVillage dataset authors.
