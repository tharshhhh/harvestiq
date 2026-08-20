"""
HarvestIQ Backend

Endpoints:
  POST /predict          crop recommendation
                         - 4 measurable features (pH, temp, humidity, rainfall)
                           when no soil-test values are supplied
                         - 7 features when the farmer supplies N, P, K from a
                           soil test, which raises confidence substantially
  POST /detect-disease   leaf image classification (requires trained model)
  GET  /                 health check
"""

import io
import json
import os
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DISEASE_MODEL_PATH = os.path.join(MODELS_DIR, "disease_model.keras")
DISEASE_CLASSES_PATH = os.path.join(MODELS_DIR, "disease_classes.json")

app = FastAPI(title="HarvestIQ API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

full_model = joblib.load(os.path.join(MODELS_DIR, "crop_model.pkl"))
meas_model = joblib.load(os.path.join(MODELS_DIR, "crop_model_measurable.pkl"))

FULL_FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
MEAS_FEATURES = ["temperature", "humidity", "ph", "rainfall"]

CROP_INFO = {
    "rice": {"season": "Kharif", "duration": "120-150 days", "water": "High", "yield": "4-6 t/ha"},
    "maize": {"season": "Kharif/Rabi", "duration": "90-120 days", "water": "Medium", "yield": "5-8 t/ha"},
    "chickpea": {"season": "Rabi", "duration": "95-120 days", "water": "Low", "yield": "1.5-2.5 t/ha"},
    "kidneybeans": {"season": "Kharif", "duration": "90-120 days", "water": "Medium", "yield": "1-2 t/ha"},
    "pigeonpeas": {"season": "Kharif", "duration": "150-180 days", "water": "Low", "yield": "1-2 t/ha"},
    "mothbeans": {"season": "Kharif", "duration": "60-90 days", "water": "Very low", "yield": "0.5-1 t/ha"},
    "mungbean": {"season": "Kharif/Zaid", "duration": "60-75 days", "water": "Low", "yield": "1-1.5 t/ha"},
    "blackgram": {"season": "Kharif", "duration": "70-90 days", "water": "Low", "yield": "1-1.5 t/ha"},
    "lentil": {"season": "Rabi", "duration": "100-130 days", "water": "Low", "yield": "1-1.5 t/ha"},
    "pomegranate": {"season": "Perennial", "duration": "150-180 days/cycle", "water": "Medium", "yield": "15-20 t/ha"},
    "banana": {"season": "Perennial", "duration": "300-365 days", "water": "High", "yield": "40-60 t/ha"},
    "mango": {"season": "Perennial", "duration": "4-5 months/season", "water": "Medium", "yield": "8-12 t/ha"},
    "grapes": {"season": "Perennial", "duration": "150-180 days/cycle", "water": "Medium", "yield": "20-30 t/ha"},
    "watermelon": {"season": "Zaid", "duration": "80-100 days", "water": "Medium", "yield": "20-35 t/ha"},
    "muskmelon": {"season": "Zaid", "duration": "80-100 days", "water": "Medium", "yield": "15-25 t/ha"},
    "apple": {"season": "Perennial", "duration": "150-180 days/cycle", "water": "Medium", "yield": "10-20 t/ha"},
    "orange": {"season": "Perennial", "duration": "240-300 days", "water": "Medium", "yield": "15-25 t/ha"},
    "papaya": {"season": "Perennial", "duration": "270-300 days", "water": "Medium", "yield": "40-60 t/ha"},
    "coconut": {"season": "Perennial", "duration": "Year-round", "water": "Medium", "yield": "10-14k nuts/ha"},
    "cotton": {"season": "Kharif", "duration": "150-180 days", "water": "Medium", "yield": "2-3 t/ha"},
    "jute": {"season": "Kharif", "duration": "100-120 days", "water": "High", "yield": "2-3 t/ha"},
    "coffee": {"season": "Perennial", "duration": "8-9 months/cycle", "water": "Medium", "yield": "1-2 t/ha"},
}


class SoilInput(BaseModel):
    temperature: float
    humidity: float
    ph: float
    rainfall: float
    N: Optional[float] = None
    P: Optional[float] = None
    K: Optional[float] = None


def top_predictions(model, frame, k=3):
    proba = model.predict_proba(frame)[0]
    order = np.argsort(proba)[::-1][:k]
    return [
        {
            "crop": str(model.classes_[i]),
            "confidence": round(float(proba[i]) * 100, 1),
            "info": CROP_INFO.get(str(model.classes_[i]), {}),
        }
        for i in order
        if proba[i] > 0
    ]


@app.post("/predict")
def predict_crop(data: SoilInput):
    has_soil_test = None not in (data.N, data.P, data.K)

    if has_soil_test:
        frame = pd.DataFrame([{
            "N": data.N, "P": data.P, "K": data.K,
            "temperature": data.temperature, "humidity": data.humidity,
            "ph": data.ph, "rainfall": data.rainfall,
        }])[FULL_FEATURES]
        results = top_predictions(full_model, frame)
        mode, accuracy = "full", 99.55
    else:
        frame = pd.DataFrame([{
            "temperature": data.temperature, "humidity": data.humidity,
            "ph": data.ph, "rainfall": data.rainfall,
        }])[MEAS_FEATURES]
        results = top_predictions(meas_model, frame)
        mode, accuracy = "measurable", 96.36

    best = results[0] if results else None
    return {
        "recommended_crop": best["crop"] if best else None,
        "confidence": best["confidence"] if best else 0,
        "alternatives": results[1:],
        "all_predictions": results,
        "mode": mode,
        "model_accuracy": accuracy,
        "note": (
            "Prediction uses your soil-test N, P, K values."
            if has_soil_test
            else "Prediction uses measured pH and climate only. Adding soil-test N, P, K values increases confidence."
        ),
    }


disease_model = None
disease_meta = None


def load_disease_model():
    global disease_model, disease_meta
    if disease_model is not None:
        return True
    if not os.path.exists(DISEASE_MODEL_PATH):
        return False
    import tensorflow as tf

    disease_model = tf.keras.models.load_model(DISEASE_MODEL_PATH)
    with open(DISEASE_CLASSES_PATH) as f:
        disease_meta = json.load(f)
    return True


def prettify(raw_label):
    if "___" in raw_label:
        crop, disease = raw_label.split("___", 1)
    else:
        crop, disease = "Unknown", raw_label
    return crop.replace("_", " ").strip(), disease.replace("_", " ").strip()


TREATMENTS = {
    "scab": [
        "Remove and destroy fallen infected leaves to break the spore cycle",
        "Apply a protectant fungicide at green-tip and again at petal fall",
        "Prune for better canopy airflow to speed leaf drying",
    ],
    "blight": [
        "Remove and destroy infected foliage immediately",
        "Rotate away from this crop family for at least two seasons",
        "Water at the base of the plant, never overhead",
    ],
    "spot": [
        "Remove visibly infected leaves and dispose away from the field",
        "Apply neem-oil based spray every 7 days",
        "Avoid overhead irrigation to reduce leaf wetness",
    ],
    "rust": [
        "Remove infected plant debris from the field",
        "Apply sulphur or an appropriate systemic fungicide",
        "Increase plant spacing to improve airflow",
    ],
    "mildew": [
        "Improve airflow by pruning and widening plant spacing",
        "Apply sulphur or potassium bicarbonate spray",
        "Water early in the day so foliage dries quickly",
    ],
    "virus": [
        "Remove and destroy infected plants - there is no chemical cure",
        "Control the insect vector (whitefly, aphid, thrips)",
        "Disinfect tools between plants to prevent mechanical spread",
    ],
    "healthy": [
        "No disease detected - continue current management",
        "Keep monitoring weekly, especially after rain",
    ],
    "default": [
        "Isolate and remove visibly affected foliage",
        "Improve airflow and avoid overhead irrigation",
        "Consult your local agricultural extension officer",
    ],
}


def treatment_for(name):
    lower = name.lower()
    for key, actions in TREATMENTS.items():
        if key != "default" and key in lower:
            return actions
    return TREATMENTS["default"]


@app.post("/detect-disease")
async def detect_disease(file: UploadFile = File(...)):
    if not load_disease_model():
        raise HTTPException(
            status_code=503,
            detail="Disease model not available. Train it with ml/notebooks/disease_model_training.ipynb and place the output in backend/models/.",
        )

    from PIL import Image

    try:
        img = Image.open(io.BytesIO(await file.read())).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read that image.")

    size = disease_meta.get("img_size", 224)
    arr = np.array(img.resize((size, size)), dtype=np.float32)
    arr = np.expand_dims((arr / 127.5) - 1.0, axis=0)

    preds = disease_model.predict(arr, verbose=0)[0]
    top = int(np.argmax(preds))
    crop, disease = prettify(disease_meta["classes"][top])

    alts = []
    for i in np.argsort(preds)[-3:][::-1][1:]:
        c, d = prettify(disease_meta["classes"][int(i)])
        alts.append({"crop": c, "disease": d, "confidence": round(float(preds[i]) * 100, 1)})

    return {
        "crop": crop,
        "disease": disease,
        "is_healthy": "healthy" in disease.lower(),
        "confidence": round(float(preds[top]) * 100, 1),
        "actions": treatment_for(disease),
        "alternatives": alts,
        "model_accuracy": round(disease_meta.get("test_accuracy", 0) * 100, 1),
    }


@app.get("/")
def health():
    return {
        "status": "HarvestIQ backend running",
        "crop_model_full": "loaded (99.55% accuracy, 7 features)",
        "crop_model_measurable": "loaded (96.36% accuracy, 4 features)",
        "disease_model": "loaded" if os.path.exists(DISEASE_MODEL_PATH) else "not trained yet",
    }
