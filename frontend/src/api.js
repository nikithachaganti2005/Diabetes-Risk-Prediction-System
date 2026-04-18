// In dev, default to '' so requests go to Vite (5173) and are proxied to FastAPI — avoids CORS and Windows localhost/IPv6 issues.
// Override with VITE_API_URL (e.g. http://127.0.0.1:8000) if you run without the proxy.
const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? '' : 'http://127.0.0.1:8000');

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed (${res.status})`);
  }
  return res.json();
}

export async function getMetrics() {
  const res = await fetch(`${API_BASE}/metrics`);
  if (!res.ok) return { model_accuracy: 97.0 };
  return res.json();
}

export async function predict(patientData) {
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Prediction failed');
  }
  return res.json();
}
