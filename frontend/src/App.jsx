import { useState, useEffect } from 'react';
import { predict, getHealth, getMetrics, getEvolution } from './api';
import { INITIAL_FORM, EDUCATION_OPTIONS, INCOME_OPTIONS, GENHLTH_OPTIONS, ageYearsToBRFSS } from './constants';
import { EVOLUTION_PREVIEW } from './evolutionPreview';
import EvolutionChart from './EvolutionChart';
import './App.css';

function App() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiStatus, setApiStatus] = useState(null);
  const [activeSection, setActiveSection] = useState(0);
  const [modelAccuracy, setModelAccuracy] = useState(97);
  const [evolutionData, setEvolutionData] = useState(null);

  useEffect(() => {
    getHealth()
      .then((r) => setApiStatus(r))
      .catch(() => setApiStatus({ status: 'error', model_loaded: false }));
    getMetrics()
      .then((r) => setModelAccuracy(r.model_accuracy ?? 97))
      .catch(() => setModelAccuracy(97));
    getEvolution()
      .then((r) => setEvolutionData(r))
      .catch(() => setEvolutionData(EVOLUTION_PREVIEW));
  }, []);

  const update = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setFieldErrors((prev) => ({ ...prev, [key]: null }));
  };

  const validateForm = () => {
    const errs = {};
    if (formData.Age === '' || formData.Age === null || formData.Age === undefined) {
      errs.Age = 'Age is required';
    } else {
      const age = parseInt(formData.Age, 10);
      if (isNaN(age) || age < 1 || age > 200) errs.Age = 'Age must be between 1 and 200';
    }
    if (formData.BMI === '' || formData.BMI === null || formData.BMI === undefined) {
      errs.BMI = 'BMI is required';
    } else {
      const bmi = parseFloat(formData.BMI);
      if (isNaN(bmi) || bmi < 12 || bmi > 98) errs.BMI = 'BMI must be between 12 and 98';
    }
    if (formData.MentHlth === '' || formData.MentHlth === null || formData.MentHlth === undefined) {
      errs.MentHlth = 'Mental health days is required';
    } else {
      const v = parseInt(formData.MentHlth, 10);
      if (isNaN(v) || v < 0 || v > 30) errs.MentHlth = 'Must be between 0 and 30';
    }
    if (formData.PhysHlth === '' || formData.PhysHlth === null || formData.PhysHlth === undefined) {
      errs.PhysHlth = 'Physical health days is required';
    } else {
      const v = parseInt(formData.PhysHlth, 10);
      if (isNaN(v) || v < 0 || v > 30) errs.PhysHlth = 'Must be between 0 and 30';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const ageGroup = ageYearsToBRFSS(formData.Age);
      const payload = {
        ...formData,
        Age: ageGroup,
        BMI: parseFloat(formData.BMI),
        MentHlth: parseInt(formData.MentHlth, 10),
        PhysHlth: parseInt(formData.PhysHlth, 10),
      };
      const data = await predict(payload);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setResult(null);
    setError(null);
    setFieldErrors({});
  };

  const sections = [
    { id: 0, title: 'Demographics', icon: '👤' },
    { id: 1, title: 'Health Conditions', icon: '🩺' },
    { id: 2, title: 'Lifestyle & Healthcare', icon: '🏃' },
  ];

  return (
    <div className="app">
      <header className="header">
        <h1>Diabetes Risk Prediction</h1>
        <p className="subtitle">Multi-phase ML model using BRFSS health indicators</p>
        <div className="header-badges">
          <div className="accuracy-badge">
            Model Accuracy: <strong>{modelAccuracy}%</strong>
          </div>
          {apiStatus && (
            <div className={`api-status ${apiStatus.model_loaded ? 'ok' : 'warn'}`}>
              {apiStatus.model_loaded ? '✓ API & model ready' : '⚠ Train model first: python backend_model.py'}
            </div>
          )}
        </div>
      </header>

      <main className="main">
        <form onSubmit={handleSubmit} className="form-card">
          <div className="form-tabs">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`tab ${activeSection === s.id ? 'active' : ''}`}
                onClick={() => setActiveSection(s.id)}
              >
                {s.icon} {s.title}
              </button>
            ))}
          </div>

          <div className="form-content">
            {activeSection === 0 && (
              <section className="form-section">
                <h3>Demographics</h3>
                <div className="field">
                  <label>Sex <span className="required">*</span></label>
                  <select value={formData.Sex} onChange={(e) => update('Sex', +e.target.value)}>
                    <option value={0}>Female</option>
                    <option value={1}>Male</option>
                  </select>
                </div>
                <div className="field">
                  <label>Age (years) <span className="required">*</span></label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    step={1}
                    value={formData.Age}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') {
                        update('Age', '');
                        return;
                      }
                      const num = parseInt(v, 10);
                      if (isNaN(num)) return;
                      if (num > 200) update('Age', 200);
                      else if (num < 1) update('Age', 1);
                      else update('Age', num);
                    }}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (v !== '') {
                        const num = parseInt(v, 10);
                        if (!isNaN(num) && num > 200) update('Age', 200);
                        else if (!isNaN(num) && num < 1) update('Age', 1);
                      }
                    }}
                    placeholder="Enter age 1–200"
                  />
                  {fieldErrors.Age && <span className="field-error">{fieldErrors.Age}</span>}
                </div>
                <div className="field">
                  <label>Education <span className="required">*</span></label>
                  <select value={formData.Education} onChange={(e) => update('Education', +e.target.value)}>
                    {EDUCATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Income Bracket <span className="required">*</span></label>
                  <select value={formData.Income} onChange={(e) => update('Income', +e.target.value)}>
                    {INCOME_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>BMI (Body Mass Index) <span className="required">*</span></label>
                  <input
                    type="number"
                    min={12}
                    max={98}
                    step={0.1}
                    value={formData.BMI}
                    onChange={(e) => update('BMI', e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="12–98"
                  />
                  {fieldErrors.BMI && <span className="field-error">{fieldErrors.BMI}</span>}
                  <span className="hint">12–98 (e.g., 25 = normal)</span>
                </div>
              </section>
            )}

            {activeSection === 1 && (
              <section className="form-section">
                <h3>Health Conditions</h3>
                <div className="field">
                  <label>High Blood Pressure</label>
                  <select value={formData.HighBP} onChange={(e) => update('HighBP', +e.target.value)}>
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div className="field">
                  <label>High Cholesterol</label>
                  <select value={formData.HighChol} onChange={(e) => update('HighChol', +e.target.value)}>
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div className="field">
                  <label>Cholesterol Checked (last 5 years)</label>
                  <select value={formData.CholCheck} onChange={(e) => update('CholCheck', +e.target.value)}>
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div className="field">
                  <label>Ever Had a Stroke</label>
                  <select value={formData.Stroke} onChange={(e) => update('Stroke', +e.target.value)}>
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div className="field">
                  <label>Heart Disease or Heart Attack</label>
                  <select value={formData.HeartDiseaseorAttack} onChange={(e) => update('HeartDiseaseorAttack', +e.target.value)}>
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div className="field">
                  <label>Difficulty Walking or Climbing Stairs</label>
                  <select value={formData.DiffWalk} onChange={(e) => update('DiffWalk', +e.target.value)}>
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div className="field">
                  <label>General Health</label>
                  <select value={formData.GenHlth} onChange={(e) => update('GenHlth', +e.target.value)}>
                    {GENHLTH_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Poor Mental Health Days (last 30) <span className="required">*</span></label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={formData.MentHlth}
                    onChange={(e) => update('MentHlth', e.target.value === '' ? '' : Math.min(30, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                    placeholder="0–30"
                  />
                  {fieldErrors.MentHlth && <span className="field-error">{fieldErrors.MentHlth}</span>}
                </div>
                <div className="field">
                  <label>Poor Physical Health Days (last 30) <span className="required">*</span></label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={formData.PhysHlth}
                    onChange={(e) => update('PhysHlth', e.target.value === '' ? '' : Math.min(30, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                    placeholder="0–30"
                  />
                  {fieldErrors.PhysHlth && <span className="field-error">{fieldErrors.PhysHlth}</span>}
                </div>
              </section>
            )}

            {activeSection === 2 && (
              <section className="form-section">
                <h3>Lifestyle & Healthcare</h3>
                <div className="field">
                  <label>Smoker (100+ cigarettes in lifetime)</label>
                  <select value={formData.Smoker} onChange={(e) => update('Smoker', +e.target.value)}>
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div className="field">
                  <label>Physical Activity (last 30 days)</label>
                  <select value={formData.PhysActivity} onChange={(e) => update('PhysActivity', +e.target.value)}>
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div className="field">
                  <label>Fruit 1+ times per day</label>
                  <select value={formData.Fruits} onChange={(e) => update('Fruits', +e.target.value)}>
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div className="field">
                  <label>Vegetables 1+ times per day</label>
                  <select value={formData.Veggies} onChange={(e) => update('Veggies', +e.target.value)}>
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div className="field">
                  <label>Heavy Alcohol Consumption</label>
                  <select value={formData.HvyAlcoholConsump} onChange={(e) => update('HvyAlcoholConsump', +e.target.value)}>
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div className="field">
                  <label>Has Healthcare Coverage</label>
                  <select value={formData.AnyHealthcare} onChange={(e) => update('AnyHealthcare', +e.target.value)}>
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div className="field">
                  <label>Could Not See Doctor Due to Cost (last 12 months)</label>
                  <select value={formData.NoDocbcCost} onChange={(e) => update('NoDocbcCost', +e.target.value)}>
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
              </section>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Reset
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Predicting…' : 'Get Risk Prediction'}
            </button>
          </div>
        </form>

        <aside className="result-sidebar">
          {error && (
            <div className="result-card error">
              <strong>Error</strong>
              <p>{error}</p>
            </div>
          )}

          {result && (
            <div className={`result-card risk-${result.risk_level.toLowerCase()}`}>
              <h3>Prediction Result</h3>
              <div className="accuracy-display">
                <span className="accuracy-label">Model Accuracy</span>
                <span className="accuracy-value">{result.model_accuracy ?? modelAccuracy}%</span>
              </div>
              <div className="risk-gauge">
                <div
                  className="gauge-fill"
                  style={{ width: `${result.probability * 100}%` }}
                />
                <span className="gauge-label">{result.risk_level} Risk</span>
              </div>
              <p className="probability">
                Diabetes probability: <strong>{(result.probability * 100).toFixed(1)}%</strong>
              </p>
              <p className="verdict">
                {result.prediction === 1 ? '⚠ At-risk (Diabetic)' : '✓ Low risk (Healthy)'}
              </p>
              <p className="message">{result.message}</p>
              <button className="btn btn-secondary" onClick={resetForm}>
                New Assessment
              </button>
            </div>
          )}

          {!result && !error && (
            <div className="result-placeholder">
              <p>Your prediction will appear here after you submit the form.</p>
            </div>
          )}

          <div className="evolution-sidebar" aria-label="Model performance across training phases">
            <EvolutionChart data={evolutionData} variant="sidebar" />
          </div>
        </aside>
      </main>

      <footer className="footer">
        <p>Nikitha Ch • Final Year Project • Computer Science • Multi-Phase Optimization of Diabetes Risk Prediction</p>
      </footer>
    </div>
  );
}

export default App;
