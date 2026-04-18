# Diabetes Risk Prediction

Multi-phase ML model for predicting diabetes risk from BRFSS health indicators.  
**Final Year Project • Computer Science**

## Tech Stack

- **Backend:** Python, XGBoost, scikit-learn, FastAPI
- **Frontend:** React (Vite)
- **Model:** Stacking Ensemble (XGBoost + Random Forest + LightGBM)

---

## Quick Start

### 1. Backend Setup

Always run these commands **from this project folder** (`Diabetes-Risk-Prediction-System-main`), not from other templates.

On **Windows**, if `pip install` fails with *Fatal error in launcher* or *Python311 not found*, your `pip.exe` is tied to an old Python. Use the interpreter you have now (e.g. 3.13):

```bash
python -m pip install -r requirements.txt
python seed_data.py
python backend_model.py
```

Otherwise:

```bash
pip install -r requirements.txt
python seed_data.py
python backend_model.py
```

### 2. Start API Server

```bash
python -m uvicorn api:app --reload --host 127.0.0.1 --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## Project Structure

```
├── api.py              # FastAPI REST API
├── backend_model.py     # ML model & prediction logic
├── seed_data.py         # Data seeding
├── data/                # Dataset (CSV)
├── diabetes_model.pkl   # Trained model (after training)
├── feature_names.pkl    # Feature order (after training)
├── frontend/            # React app
│   ├── src/
│   │   ├── App.jsx      # Main form & results
│   │   ├── api.js       # API client
│   │   └── constants.js # Form options
│   └── package.json
└── requirements.txt
```

---

## API Endpoints

| Method | Endpoint   | Description        |
|--------|------------|--------------------|
| GET    | /          | API info           |
| GET    | /health    | Model status       |
| POST   | /predict   | Get risk prediction |

---

## Patient Input Schema

21 factors: `HighBP`, `HighChol`, `CholCheck`, `BMI`, `Smoker`, `Stroke`, `HeartDiseaseorAttack`, `PhysActivity`, `Fruits`, `Veggies`, `HvyAlcoholConsump`, `AnyHealthcare`, `NoDocbcCost`, `GenHlth`, `MentHlth`, `PhysHlth`, `DiffWalk`, `Sex`, `Age`, `Education`, `Income`.

---

## Disclaimer

For educational purposes. Not a substitute for medical advice.
