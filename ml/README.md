# Machine Learning

## Crop Recommendation Models

```bash
cd ml/notebooks
pip install scikit-learn pandas matplotlib seaborn joblib
python train_crop_model.py            # Model 1: 22 crops
python train_crop_model_extended.py   # Model 2: +9 crops
```

Outputs go to `../results/` and the `.pkl` files should be moved to `backend/models/`.

## Disease Detection Model

`notebooks/disease_model_training.ipynb` trains a MobileNetV2 classifier on PlantVillage (54,303 images, 38 classes).

**Run this on Google Colab**, not locally — it needs a GPU.

1. Upload the notebook to [Colab](https://colab.research.google.com)
2. **Runtime → Change runtime type → T4 GPU**
3. **Runtime → Run all** (~30 minutes)
4. Download `disease_model.keras` and `disease_classes.json`
5. Place both in `backend/models/`

### Method
- Transfer learning from ImageNet-pretrained MobileNetV2
- Two-phase training: frozen-base head training, then fine-tuning the top 50 layers at a 100× lower learning rate
- Augmentation: random flips, rotation, zoom, contrast
- Dropout and early stopping for regularisation
- 70/15/15 train/validation/test split

### Expected results
Roughly 97–99% test accuracy. Note that PlantVillage images are captured in controlled conditions against plain backgrounds; accuracy on real field photographs with variable lighting and cluttered backgrounds will be materially lower. Training on PlantDoc (real-world field images) is the natural next step.
