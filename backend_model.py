# -*- coding: utf-8 -*-
"""backend_model.py

Standalone diabetes risk prediction backend.
Multi-phase optimization: XGBoost → Stacking Ensemble → Threshold Optimization.
"""

import json
import os
import threading
from datetime import datetime, timezone
from typing import Optional

import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.metrics import (
    accuracy_score, classification_report, roc_auc_score, confusion_matrix,
    recall_score, precision_score, f1_score
)
from sklearn.ensemble import RandomForestClassifier, StackingClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
import joblib

_model_load_lock = threading.Lock()

# Optional imports (install if needed)
try:
    import lightgbm as lgb
    HAS_LGB = True
except ImportError:
    HAS_LGB = False

try:
    from imblearn.combine import SMOTETomek
    HAS_SMOTE = True
except ImportError:
    HAS_SMOTE = False

# --- Paths ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DATA_PATH = os.path.join(DATA_DIR, "diabetes_binary_5050split_health_indicators_BRFSS2015.csv")
MODEL_PATH = os.path.join(BASE_DIR, "diabetes_model.pkl")
FEATURE_NAMES_PATH = os.path.join(BASE_DIR, "feature_names.pkl")
THRESHOLD_PATH = os.path.join(BASE_DIR, "prediction_threshold.pkl")
EVOLUTION_PLOT_PATH = os.path.join(BASE_DIR, "evolution_performance.png")
EVOLUTION_JSON_PATH = os.path.join(BASE_DIR, "evolution_metrics.json")

# --- Constants ---
RANDOM_STATE = 42
OPTIMIZED_THRESHOLD = 0.42


def find_best_threshold(y_true, proba, n_grid: int = 199) -> float:
    """Threshold on predicted probabilities that maximizes accuracy (validation set)."""
    y_true = np.asarray(y_true)
    proba = np.asarray(proba)
    best_t, best_acc = 0.5, -1.0
    for t in np.linspace(0.01, 0.99, n_grid):
        acc = accuracy_score(y_true, (proba >= t).astype(int))
        if acc > best_acc:
            best_acc, best_t = acc, t
    return float(best_t)


def load_threshold() -> float:
    if os.path.isfile(THRESHOLD_PATH):
        return float(joblib.load(THRESHOLD_PATH))
    return OPTIMIZED_THRESHOLD


def engineer_features(data: pd.DataFrame) -> pd.DataFrame:
    """Apply feature engineering to match training pipeline."""
    df_eng = data.copy()
    df_eng['Metabolic_Syndrome'] = (
        (df_eng['HighBP'] == 1) & (df_eng['HighChol'] == 1) & (df_eng['BMI'] >= 30)
    ).astype(int)
    df_eng['Lifestyle_Score'] = df_eng['PhysActivity'] + df_eng['Fruits'] + df_eng['Veggies'] - df_eng['Smoker']
    df_eng['Health_Burden'] = df_eng['PhysHlth'] + df_eng['MentHlth']
    df_eng['Age_BMI_Product'] = df_eng['Age'] * df_eng['BMI']
    return df_eng


def load_data(path: str = None):
    """Load dataset and return X, y. Creates data dir and seeds if needed."""
    path = path or DATA_PATH
    os.makedirs(DATA_DIR, exist_ok=True)

    if not os.path.exists(path):
        from seed_data import seed
        seed()
        if not os.path.exists(path):
            raise FileNotFoundError(
                f"Dataset not found at {path}\n"
                "Download from Kaggle: 'alexteboul/diabetes-health-indicators-dataset'\n"
                "Place CSV in data/ folder, or run: python seed_data.py"
            )

    df = pd.read_csv(path)
    df_final = engineer_features(df)
    X = df_final.drop('Diabetes_binary', axis=1)
    y = df_final['Diabetes_binary']
    return X, y, df


def train_model(X_train, y_train, X_test, y_test, verbose=True):
    """Train the full multi-phase model pipeline."""
    # Phase 1: XGBoost with hyperparameter search
    xgb = XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=RANDOM_STATE)
    param_grid = {
        'n_estimators': [100, 300, 500],
        'max_depth': [3, 6, 9],
        'learning_rate': [0.01, 0.05, 0.1],
        'subsample': [0.8, 1.0],
        'colsample_bytree': [0.8, 1.0],
        'gamma': [0, 0.1, 0.2]
    }
    random_search = RandomizedSearchCV(
        xgb,
        param_grid,
        n_iter=20,
        cv=3,
        scoring="accuracy",
        n_jobs=-1,
        verbose=1 if verbose else 0,
        random_state=RANDOM_STATE,
    )
    random_search.fit(X_train, y_train)
    best_model = random_search.best_estimator_
    if verbose:
        print(f"Best Parameters: {random_search.best_params_}")

    # Phase 2: Stacking ensemble
    base_models = [
        ('xgb', best_model),
        (
            "rf",
            RandomForestClassifier(
                n_estimators=400, max_depth=12, min_samples_leaf=2, random_state=RANDOM_STATE
            ),
        ),
    ]
    if HAS_LGB:
        base_models.append(('lgbm', lgb.LGBMClassifier(learning_rate=0.05, n_estimators=200, importance_type='gain')))

    stacking_model = StackingClassifier(
        estimators=base_models,
        final_estimator=LogisticRegression(),
        cv=5,
        passthrough=False
    )
    stacking_model.fit(X_train, y_train)

    return stacking_model, best_model, X_train.columns.tolist()


def _metrics_at_threshold(y_true, y_proba, threshold: float) -> dict:
    yt = np.asarray(y_true)
    pr = np.asarray(y_proba, dtype=float)
    y_pred = (pr >= threshold).astype(int)
    return {
        "accuracy": float(accuracy_score(yt, y_pred)),
        "recall": float(recall_score(yt, y_pred, zero_division=0)),
        "precision": float(precision_score(yt, y_pred, zero_division=0)),
        "f1_score": float(f1_score(yt, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(yt, pr)),
    }


def compute_evolution_phases(
    best_xgb,
    stacking_model,
    X_test,
    y_test,
    optimized_threshold: float,
) -> list[dict]:
    """Held-out test metrics after each phase (Phase 3 uses validation-tuned threshold)."""
    y_test = np.asarray(y_test)
    p1 = best_xgb.predict_proba(X_test)[:, 1]
    p2 = stacking_model.predict_proba(X_test)[:, 1]
    t = float(optimized_threshold)
    return [
        {
            "phase": 1,
            "label": "Phase 1: Tuned XGBoost",
            **_metrics_at_threshold(y_test, p1, 0.5),
        },
        {
            "phase": 2,
            "label": "Phase 2: Stacking Ensemble",
            **_metrics_at_threshold(y_test, p2, 0.5),
        },
        {
            "phase": 3,
            "label": "Phase 3: Threshold Optimization",
            **_metrics_at_threshold(y_test, p2, t),
        },
    ]


def save_evolution_artifacts(phases: list[dict], optimized_threshold: float) -> None:
    payload = {
        "generated": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "optimized_threshold": float(optimized_threshold),
        "phases": phases,
    }
    with open(EVOLUTION_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def save_evolution_plot(phases: list[dict], path: Optional[str] = None) -> None:
    import matplotlib.pyplot as plt

    out = path or EVOLUTION_PLOT_PATH
    metric_keys = ["accuracy", "recall", "precision", "f1_score", "roc_auc"]
    legend_labels = ["Accuracy", "Recall", "Precision", "F1-Score", "ROC-AUC"]
    n_phases = len(phases)
    x = np.arange(n_phases, dtype=float)
    n_m = len(metric_keys)
    width = min(0.8 / n_m, 0.14)
    fig, ax = plt.subplots(figsize=(10, 6))
    try:
        cmap = plt.colormaps["viridis"]
    except (AttributeError, KeyError):
        from matplotlib.cm import get_cmap

        cmap = get_cmap("viridis")
    colors = [cmap(0.12 + 0.72 * i / max(1, n_m - 1)) for i in range(n_m)]
    for i, (key, lab, c) in enumerate(zip(metric_keys, legend_labels, colors)):
        vals = [float(p[key]) for p in phases]
        offset = (i - (n_m - 1) / 2) * width
        ax.bar(
            x + offset,
            vals,
            width,
            label=lab,
            color=c,
            edgecolor="white",
            linewidth=0.4,
        )
    ax.set_title("Evolution of Model Performance across Phases", fontsize=13, fontweight="bold")
    ax.set_xlabel("Phase")
    ax.set_ylabel("Score")
    ax.set_xticks(x)
    ax.set_xticklabels([p["label"] for p in phases], fontsize=9, rotation=12, ha="right")
    ymax = max(float(p[k]) for p in phases for k in metric_keys)
    ax.set_ylim(0.0, min(1.0, ymax * 1.12 + 0.02))
    ax.yaxis.grid(True, linestyle="--", alpha=0.45)
    ax.set_axisbelow(True)
    ax.legend(loc="lower right", fontsize=8, framealpha=0.95)
    fig.tight_layout()
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)


def predict(
    raw_data: dict,
    model=None,
    feature_names=None,
    threshold: Optional[float] = None,
) -> tuple[int, float]:
    """
    Predict diabetes risk from a single patient's raw data.

    Args:
        raw_data: Dict with keys HighBP, HighChol, CholCheck, BMI, Smoker, Stroke,
                  HeartDiseaseorAttack, PhysActivity, Fruits, Veggies, HvyAlcoholConsump,
                  AnyHealthcare, NoDocbcCost, GenHlth, MentHlth, PhysHlth, DiffWalk,
                  Sex, Age, Education, Income
        model: Loaded model (or loads from disk if None)
        feature_names: List of feature names (or loads from disk if None)
        threshold: Classification threshold (default: saved value or 0.42)

    Returns:
        (prediction: 0 or 1, probability: float)
    """
    if threshold is None:
        threshold = load_threshold()
    if model is None:
        model = joblib.load(MODEL_PATH)
    if feature_names is None:
        feature_names = joblib.load(FEATURE_NAMES_PATH)

    df = pd.DataFrame([raw_data])
    df['Metabolic_Syndrome'] = (
        (df['HighBP'] == 1) & (df['HighChol'] == 1) & (df['BMI'] >= 30)
    ).astype(int)
    df['Lifestyle_Score'] = df['PhysActivity'] + df['Fruits'] + df['Veggies'] - df['Smoker']
    df['Health_Burden'] = df['MentHlth'] + df['PhysHlth']
    df['Age_BMI_Product'] = df['Age'] * df['BMI']

    df = df[feature_names]
    prob = model.predict_proba(df)[0][1]
    pred = 1 if prob >= threshold else 0
    return pred, float(prob)


def save_model(model, feature_names, threshold: Optional[float] = None):
    """Save trained model, feature names, and optional decision threshold to disk."""
    joblib.dump(model, MODEL_PATH)
    joblib.dump(feature_names, FEATURE_NAMES_PATH)
    if threshold is not None:
        joblib.dump(float(threshold), THRESHOLD_PATH)
    print(f"Model saved to {MODEL_PATH}")


def train_baseline_and_save():
    """
    Fast training when no checkpoint exists so the API can start immediately.
    For the full stacking pipeline, run: python backend_model.py
    """
    print(
        "No diabetes_model.pkl found; training a quick baseline (scaled logistic regression)..."
    )
    X, y, _ = load_data()
    feature_names = X.columns.tolist()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )
    X_tr, X_val, y_tr, y_val = train_test_split(
        X_train, y_train, test_size=0.15, random_state=RANDOM_STATE, stratify=y_train
    )
    model = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "clf",
                LogisticRegression(max_iter=2000, random_state=RANDOM_STATE, solver="lbfgs"),
            ),
        ]
    )
    model.fit(X_tr, y_tr)
    val_proba = model.predict_proba(X_val)[:, 1]
    best_t = find_best_threshold(y_val, val_proba)
    model.fit(X_train, y_train)
    save_model(model, feature_names, threshold=best_t)
    print("Baseline model ready. Run `python backend_model.py` for the full stacking ensemble.")


def load_model():
    """Load model and feature names from disk; train a fast baseline if missing."""
    with _model_load_lock:
        if not (os.path.isfile(MODEL_PATH) and os.path.isfile(FEATURE_NAMES_PATH)):
            train_baseline_and_save()
        return joblib.load(MODEL_PATH), joblib.load(FEATURE_NAMES_PATH)


# --- Sample patient for testing ---
SAMPLE_HIGH_RISK = {
    'HighBP': 1, 'HighChol': 1, 'CholCheck': 1, 'BMI': 35.0, 'Smoker': 1,
    'Stroke': 0, 'HeartDiseaseorAttack': 1, 'PhysActivity': 0, 'Fruits': 0,
    'Veggies': 0, 'HvyAlcoholConsump': 0, 'AnyHealthcare': 1, 'NoDocbcCost': 0,
    'GenHlth': 5, 'MentHlth': 10, 'PhysHlth': 20, 'DiffWalk': 1, 'Sex': 1,
    'Age': 10, 'Education': 4, 'Income': 3
}


if __name__ == "__main__":
    print("Loading data...")
    X, y, df = load_data()
    print(f"Dataset loaded: {df.shape}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )
    X_tr, X_val, y_tr, y_val = train_test_split(
        X_train, y_train, test_size=0.15, random_state=RANDOM_STATE, stratify=y_train
    )

    print("Training model (Phases 1–2) on an inner train split...")
    stacking_model, best_model, feature_names = train_model(X_tr, y_tr, X_val, y_val)

    val_proba = stacking_model.predict_proba(X_val)[:, 1]
    best_threshold = find_best_threshold(y_val, val_proba)
    print(f"Validation-tuned probability threshold: {best_threshold:.4f}")

    phase_rows = compute_evolution_phases(
        best_model, stacking_model, X_test, y_test, best_threshold
    )
    save_evolution_artifacts(phase_rows, best_threshold)
    save_evolution_plot(phase_rows)
    print(f"Evolution metrics: {EVOLUTION_JSON_PATH}")
    print(f"Evolution chart: {EVOLUTION_PLOT_PATH}")

    print("Refitting ensemble on full training fold (80% of data)...")
    stacking_model.fit(X_train, y_train)

    s_proba = stacking_model.predict_proba(X_test)[:, 1]
    y_pred_custom = (s_proba >= best_threshold).astype(int)

    print("\n--- MODEL PERFORMANCE (held-out test, 20%) ---")
    print(f"Accuracy: {accuracy_score(y_test, y_pred_custom):.4f}")
    print(f"ROC-AUC: {roc_auc_score(y_test, s_proba):.4f}")
    print(f"Recall: {recall_score(y_test, y_pred_custom):.4f}")
    print("\nClassification Report:\n", classification_report(y_test, y_pred_custom))
    print(
        "\n(Realistic expectation: this BRFSS benchmark rarely reaches ~97% test accuracy without "
        "overfitting or data leakage; ~0.74–0.85 is typical for strong models.)"
    )

    save_model(stacking_model, feature_names, threshold=best_threshold)

    # Test prediction
    pred, prob = predict(SAMPLE_HIGH_RISK, stacking_model, feature_names)
    print(f"\nSample prediction (high-risk patient): {prob:.2%} → {'Diabetic' if pred == 1 else 'Healthy'}")
