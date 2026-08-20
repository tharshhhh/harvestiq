"""
HarvestIQ — Crop Recommendation Model
Trains and evaluates a Random Forest classifier on the standard
Crop Recommendation Dataset (2200 samples, 22 crop classes,
7 features: N, P, K, temperature, humidity, ph, rainfall).
"""

import pandas as pd
import numpy as np
import joblib
import json
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

# ---------------- Load data ----------------
df = pd.read_csv("../data/crop_data.csv")
print(f"Dataset shape: {df.shape}")
print(f"Crop classes ({df['label'].nunique()}): {sorted(df['label'].unique())}\n")

X = df[["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]]
y = df["label"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ---------------- Compare multiple algorithms ----------------
models = {
    "Random Forest": RandomForestClassifier(n_estimators=200, random_state=42),
    "Decision Tree": DecisionTreeClassifier(random_state=42),
    "KNN": KNeighborsClassifier(n_neighbors=5),
    "SVM (RBF)": SVC(kernel="rbf", probability=True, random_state=42),
    "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
}

results = {}
print("=" * 55)
print(f"{'Model':<22}{'Test Accuracy':<18}{'5-Fold CV Mean'}")
print("=" * 55)

for name, model in models.items():
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    cv = cross_val_score(model, X, y, cv=5).mean()
    results[name] = {"test_accuracy": acc, "cv_mean": cv}
    print(f"{name:<22}{acc*100:>6.2f}%{'':<10}{cv*100:>6.2f}%")

best_name = max(results, key=lambda k: results[k]["test_accuracy"])
best_model = models[best_name]
print("=" * 55)
print(f"\nBest model: {best_name} ({results[best_name]['test_accuracy']*100:.2f}% test accuracy)\n")

# ---------------- Detailed report on best model ----------------
preds = best_model.predict(X_test)
report = classification_report(y_test, preds, output_dict=True)
print(classification_report(y_test, preds))

# ---------------- Confusion matrix ----------------
labels = sorted(y.unique())
cm = confusion_matrix(y_test, preds, labels=labels)
plt.figure(figsize=(11, 9))
sns.heatmap(cm, annot=True, fmt="d", cmap="YlGnBu", xticklabels=labels, yticklabels=labels)
plt.title(f"Confusion Matrix — {best_name} ({results[best_name]['test_accuracy']*100:.1f}% accuracy)")
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.xticks(rotation=45, ha="right")
plt.tight_layout()
plt.savefig("../results/confusion_matrix.png", dpi=150)
print("Saved confusion_matrix.png")

# ---------------- Feature importance (Random Forest) ----------------
if best_name == "Random Forest":
    importances = pd.Series(best_model.feature_importances_, index=X.columns).sort_values(ascending=False)
    plt.figure(figsize=(7, 4.5))
    sns.barplot(x=importances.values, y=importances.index, palette="crest")
    plt.title("Feature Importance — Random Forest")
    plt.xlabel("Importance")
    plt.tight_layout()
    plt.savefig("../results/feature_importance.png", dpi=150)
    print("Saved feature_importance.png")

# ---------------- Model comparison chart ----------------
plt.figure(figsize=(8, 4.5))
names = list(results.keys())
test_accs = [results[n]["test_accuracy"] * 100 for n in names]
cv_accs = [results[n]["cv_mean"] * 100 for n in names]
x = np.arange(len(names))
width = 0.35
plt.bar(x - width/2, test_accs, width, label="Test Accuracy", color="#3B9C6B")
plt.bar(x + width/2, cv_accs, width, label="5-Fold CV Mean", color="#E8B84B")
plt.xticks(x, names, rotation=20, ha="right")
plt.ylabel("Accuracy (%)")
plt.ylim(80, 101)
plt.title("Model Comparison — Crop Recommendation")
plt.legend()
plt.tight_layout()
plt.savefig("../results/model_comparison.png", dpi=150)
print("Saved model_comparison.png")

# ---------------- Save the trained model ----------------
joblib.dump(best_model, "../results/crop_model.pkl")
with open("../results/model_results.json", "w") as f:
    json.dump({k: {"test_accuracy": round(v["test_accuracy"], 4),
                    "cv_mean": round(v["cv_mean"], 4)} for k, v in results.items()}, f, indent=2)
print("Saved crop_model.pkl and model_results.json")

# ---------------- Example inference (matches the app's demo field) ----------------
sample = pd.DataFrame([{
    "N": 240 / 2.5,  # convert kg/ha style reading to dataset's per-plot scale ballpark
    "P": 18,
    "K": 310 / 2.5,
    "temperature": 31,
    "humidity": 68,
    "ph": 6.8,
    "rainfall": 220,
}])
pred = best_model.predict(sample)[0]
proba = best_model.predict_proba(sample).max() if hasattr(best_model, "predict_proba") else None
print(f"\nSample field prediction: {pred}" + (f" (confidence: {proba*100:.1f}%)" if proba else ""))
