# Models

| File | In repo | Notes |
|---|---|---|
| `crop_model.pkl` | Yes | Random Forest, 22 crops, 99.55% test accuracy |
| `crop_model_extended.pkl` | Yes | Random Forest, 17 crops (9 new), see main README for accuracy caveat |
| `soil_type_encoder.pkl` | Yes | Label encoder for Model 2's soil type feature |
| `disease_model.keras` | **No** | Too large for git. Generate with `ml/notebooks/disease_model_training.ipynb` |
| `disease_classes.json` | **No** | Produced alongside the disease model |

To enable disease detection, run the training notebook on Google Colab (free T4 GPU, ~30 min), then place both output files in this directory and uncomment the TensorFlow lines in `requirements.txt`.
