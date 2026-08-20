"""
HarvestIQ — Crop Model #2 (Extended Variety)
Trains on a second, genuinely different real dataset (Temperature, Humidity,
Moisture, Soil Type, N, P, K -> Crop Type) to add crop classes the first
model doesn't cover: Wheat, Sugarcane, Barley, Ground Nuts, Millets,
Oil Seeds, Paddy, Pulses, Tobacco.

NOTE ON HONESTY: This dataset uses a DIFFERENT feature schema than Model 1
(no pH/rainfall; has Moisture + Soil Type instead). I am NOT fabricating
pH/rainfall values to force-merge it with Model 1 — that would corrupt both
datasets. Instead this is a second, independently-real model. In a real
HarvestIQ build, a region/season pre-filter would route a farmer's query to
whichever specialist model covers their candidate crops.
"""

import pandas as pd
import numpy as np
import joblib
import json
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

df = pd.read_csv("../data/fertilizer_data.csv")
df.columns = [c.strip() for c in df.columns]
print(f"Dataset shape: {df.shape}")
print(f"Crop classes ({df['Crop_Type'].nunique()}): {sorted(df['Crop_Type'].unique())}\n")

soil_encoder = LabelEncoder()
df["Soil_Type_enc"] = soil_encoder.fit_transform(df["Soil_Type"])

features = ["Temparature", "Humidity", "Moisture", "Soil_Type_enc", "Nitrogen", "Potassium", "Phosphorous"]
X = df[features]
y = df["Crop_Type"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

model = RandomForestClassifier(n_estimators=300, random_state=42)
model.fit(X_train, y_train)
preds = model.predict(X_test)
acc = accuracy_score(y_test, preds)
cv = cross_val_score(model, X, y, cv=5).mean()

print(f"Model 2 (Random Forest) test accuracy: {acc*100:.2f}%")
print(f"5-fold CV mean: {cv*100:.2f}%\n")
print(classification_report(y_test, preds, zero_division=0))

labels = sorted(y.unique())
cm = confusion_matrix(y_test, preds, labels=labels)
plt.figure(figsize=(9, 7.5))
sns.heatmap(cm, annot=True, fmt="d", cmap="YlOrBr", xticklabels=labels, yticklabels=labels)
plt.title(f"Confusion Matrix — Model 2, Extended Crops ({acc*100:.1f}% accuracy)")
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.xticks(rotation=45, ha="right")
plt.tight_layout()
plt.savefig("../results/confusion_matrix_model2.png", dpi=150)
print("Saved confusion_matrix_model2.png")

joblib.dump(model, "../results/crop_model_extended.pkl")
joblib.dump(soil_encoder, "../results/soil_type_encoder.pkl")

# ---------------- Coverage summary ----------------
model1_crops = set(pd.read_csv("../data/crop_data.csv")["label"].str.lower().unique())
model2_crops = set(y.str.lower().str.strip().unique())
union = model1_crops | model2_crops
new_crops = model2_crops - model1_crops

summary = {
    "model_1_crop_count": len(model1_crops),
    "model_2_crop_count": len(model2_crops),
    "new_crops_added": sorted(new_crops),
    "total_unique_crop_coverage": len(union),
    "model_2_test_accuracy": round(acc, 4),
    "model_2_cv_mean": round(cv, 4),
}
with open("../results/coverage_summary.json", "w") as f:
    json.dump(summary, f, indent=2)

print(f"\nModel 1 covers: {len(model1_crops)} crops")
print(f"Model 2 adds:   {len(new_crops)} NEW crops -> {sorted(new_crops)}")
print(f"Combined unique coverage: {len(union)} crops")
