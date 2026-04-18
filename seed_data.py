    # -*- coding: utf-8 -*-
"""
Seed data script for Diabetes Risk Prediction backend.
Downloads or generates the dataset needed for training.
"""

import os
import numpy as np
import pandas as pd
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DATA_PATH = os.path.join(DATA_DIR, "diabetes_binary_5050split_health_indicators_BRFSS2015.csv")

# Direct download URLs (try in order)
DATASET_URLS = [
    "https://raw.githubusercontent.com/nikhitha-ai/diabetes-dataset/main/diabetes_binary_5050split_health_indicators_BRFSS2015.csv",
    # Add other mirrors if available
]


def download_dataset():
    """Try to download the dataset from a public URL."""
    os.makedirs(DATA_DIR, exist_ok=True)
    for url in DATASET_URLS:
        try:
            print(f"Trying {url[:50]}...")
            urllib.request.urlretrieve(url, DATA_PATH)
            df = pd.read_csv(DATA_PATH)
            if 'Diabetes_binary' in df.columns and len(df) > 100:
                print(f"Downloaded {len(df)} rows, {len(df.columns)} columns")
                return True
        except Exception as e:
            print(f"  Failed: {e}")
    return False


def create_synthetic_seed_data(n_rows=5000):
    """
    Create synthetic seed data matching BRFSS schema for testing/training.
    Use this when the real dataset is not available.
    """
    np.random.seed(42)
    os.makedirs(DATA_DIR, exist_ok=True)

    n = n_rows
    df = pd.DataFrame({
        'Diabetes_binary': np.random.randint(0, 2, n),
        'HighBP': np.random.randint(0, 2, n),
        'HighChol': np.random.randint(0, 2, n),
        'CholCheck': np.random.randint(0, 2, n),
        'BMI': np.clip(np.random.normal(28, 7, n), 12, 98).round(1),
        'Smoker': np.random.randint(0, 2, n),
        'Stroke': np.random.randint(0, 2, n),
        'HeartDiseaseorAttack': np.random.randint(0, 2, n),
        'PhysActivity': np.random.randint(0, 2, n),
        'Fruits': np.random.randint(0, 2, n),
        'Veggies': np.random.randint(0, 2, n),
        'HvyAlcoholConsump': np.random.randint(0, 2, n),
        'AnyHealthcare': np.random.randint(0, 2, n),
        'NoDocbcCost': np.random.randint(0, 2, n),
        'GenHlth': np.random.randint(1, 6, n),
        'MentHlth': np.random.randint(0, 31, n),
        'PhysHlth': np.random.randint(0, 31, n),
        'DiffWalk': np.random.randint(0, 2, n),
        'Sex': np.random.randint(0, 2, n),
        'Age': np.random.randint(1, 14, n),
        'Education': np.random.randint(1, 7, n),
        'Income': np.random.randint(1, 9, n),
    })

    # Make diabetes correlate with risk factors for more realistic data
    risk = (df['HighBP'] + df['HighChol'] + (df['BMI'] >= 30).astype(int)) / 3
    df['Diabetes_binary'] = (np.random.random(n) < 0.3 + 0.4 * risk).astype(int)

    df.to_csv(DATA_PATH, index=False)
    print(f"Created synthetic seed data: {DATA_PATH} ({n} rows)")
    return DATA_PATH


def seed():
    """Main seed entry: try download, fallback to synthetic."""
    if os.path.exists(DATA_PATH):
        print(f"Data already exists at {DATA_PATH}")
        df = pd.read_csv(DATA_PATH)
        print(f"  Rows: {len(df)}, Columns: {len(df.columns)}")
        return DATA_PATH

    if download_dataset():
        return DATA_PATH

    print("Using synthetic data for development. For production, download the real dataset from Kaggle.")
    return create_synthetic_seed_data()


if __name__ == "__main__":
    seed()
