# Backend & Algorithm Results

## Backend Results

### Prediction Response (POST /predict)

```json
{
  "prediction": 0 or 1,
  "probability": 0.0 to 1.0,
  "risk_level": "Low" | "Moderate" | "High",
  "message": "Personalized recommendation text"
}
```

### Risk Level Thresholds

| Risk Level | Probability Range |
|------------|-------------------|
| Low | < 0.30 |
| Moderate | 0.30 – 0.50 |
| High | ≥ 0.50 |

### Classification Threshold

- **Optimized threshold:** 0.42
- **Default threshold:** 0.5

---

## Algorithm Results

### Pipeline

| Phase | Description |
|-------|-------------|
| Phase 1 | XGBoost with RandomizedSearchCV (3-fold CV, F1 scoring) |
| Phase 2 | Stacking: XGBoost + Random Forest + LightGBM → Logistic Regression |
| Phase 3 | Threshold optimization (0.42) |

### Algorithms

| Algorithm | Role |
|-----------|------|
| XGBoost | Base learner |
| Random Forest | Base learner |
| LightGBM | Base learner |
| Logistic Regression | Meta-learner |

### Evaluation Metrics

| Metric | Value |
|--------|-------|
| Accuracy | ~0.55 |
| ROC-AUC | ~0.58 |
| Recall | ~0.75 |
| Precision | ~0.52 |
| F1-Score | ~0.62 |

### Classification Report

```
              precision    recall  f1-score   support

           0       0.62      0.37      0.46       521
           1       0.52      0.75      0.62       479

  weighted avg       0.57      0.55      0.54      1000
```

### Sample Prediction

- **High-risk patient:** 71.81% → Diabetic
- **Low-risk patient:** < 30% → Healthy
