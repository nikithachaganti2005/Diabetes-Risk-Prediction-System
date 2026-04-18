import { EVOLUTION_PREVIEW } from './evolutionPreview';

const SERIES = [
  { key: 'accuracy', label: 'Accuracy', color: '#482878' },
  { key: 'recall', label: 'Recall', color: '#414487' },
  { key: 'precision', label: 'Precision', color: '#2a788e' },
  { key: 'f1_score', label: 'F1-Score', color: '#22a884' },
  { key: 'roc_auc', label: 'ROC-AUC', color: '#7ad151' },
];

const PHASE_LINES_SIDEBAR = {
  1: ['Phase 1', 'Tuned XGBoost'],
  2: ['Phase 2', 'Stacking'],
  3: ['Phase 3', 'Threshold opt.'],
};

function phasesForChart(data) {
  if (data?.phases?.length) return data.phases;
  return EVOLUTION_PREVIEW.phases;
}

function showPreviewNote(data) {
  return Boolean(
    data?.is_preview ||
      data?.fallback_reason ||
      !data?.phases?.length
  );
}

function EvolutionChart({ data, variant = 'default' }) {
  const sidebar = variant === 'sidebar';

  if (data == null) {
    return (
      <div className={`evolution-chart evolution-chart--empty ${sidebar ? 'evolution-chart--sidebar' : ''}`}>
        <h3 className="evolution-chart__title">Evolution of Model Performance across Phases</h3>
        <p className="evolution-chart__hint">Loading chart…</p>
      </div>
    );
  }

  const phases = phasesForChart(data);
  const W = sidebar ? 300 : 360;
  const H = sidebar ? 248 : 260;
  const padL = sidebar ? 38 : 44;
  const padR = sidebar ? 6 : 8;
  const padT = sidebar ? 26 : 28;
  const padB = sidebar ? 52 : 56;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const allVals = phases.flatMap((p) => SERIES.map((s) => p[s.key] ?? 0));
  const yMax = Math.min(1, Math.max(0.5, ...allVals) * 1.12 + 0.02);

  const toY = (v) => padT + innerH * (1 - v / yMax);

  const nP = phases.length;
  const nS = SERIES.length;
  const groupW = innerW / nP;
  const barW = Math.min((groupW * 0.72) / nS, sidebar ? 7.5 : 10);

  const gridYs = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].filter((g) => g <= yMax + 1e-6);

  return (
    <div className={`evolution-chart${sidebar ? ' evolution-chart--sidebar' : ''}`}>
      <h3 className="evolution-chart__title">Evolution of Model Performance across Phases</h3>
      {showPreviewNote(data) && (
        <p className="evolution-chart__preview-note">
          Preview — benchmark figure values. For live metrics, run{' '}
          <code className="evolution-chart__code">python backend_model.py</code> and start the API (
          <code className="evolution-chart__code">uvicorn api:app --port 8000</code>).
        </p>
      )}
      {(data.optimized_threshold != null || showPreviewNote(data)) && (
        <p className="evolution-chart__meta">
          Optimized threshold (Phase 3):{' '}
          <strong>
            {Number(data.optimized_threshold ?? EVOLUTION_PREVIEW.optimized_threshold).toFixed(2)}
          </strong>
        </p>
      )}
      <svg
        className="evolution-chart__svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Grouped bar chart of accuracy, recall, precision, F1 and ROC-AUC across three training phases"
      >
        {gridYs.map((g) => {
          const y = toY(g);
          return (
            <g key={g}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} className="evolution-chart__grid" />
              <text x={padL - 6} y={y + 4} className="evolution-chart__tick" textAnchor="end">
                {g.toFixed(1)}
              </text>
            </g>
          );
        })}
        <text x={padL - 36} y={padT + innerH / 2} className="evolution-chart__ylabel" transform={`rotate(-90 ${padL - 36} ${padT + innerH / 2})`}>
          Score
        </text>
        {phases.map((p, pi) => {
          const gx = padL + pi * groupW + groupW / 2;
          const xLines = sidebar ? PHASE_LINES_SIDEBAR[p.phase] || [p.label, ''] : null;
          return (
            <g key={p.phase ?? pi}>
              {SERIES.map((s, si) => {
                const v = p[s.key] ?? 0;
                const x = gx + (si - (nS - 1) / 2) * barW;
                const y = toY(v);
                const h = padT + innerH - y;
                return (
                  <rect
                    key={s.key}
                    x={x - barW / 2}
                    y={y}
                    width={barW}
                    height={Math.max(h, 0)}
                    fill={s.color}
                    stroke="#fff"
                    strokeWidth={0.35}
                    rx={0.5}
                  />
                );
              })}
              <text x={gx} y={H - (sidebar ? 40 : 36)} className="evolution-chart__xlabel" textAnchor="middle">
                {sidebar ? (
                  <>
                    <tspan x={gx} dy="0">
                      {xLines[0]}
                    </tspan>
                    <tspan x={gx} dy="10">
                      {xLines[1]}
                    </tspan>
                  </>
                ) : (
                  p.label
                )}
              </text>
            </g>
          );
        })}
        <text x={W / 2} y={H - 8} className="evolution-chart__xaxis-title" textAnchor="middle">
          Phase
        </text>
      </svg>
      <div className="evolution-chart__legend">
        {SERIES.map((s) => (
          <span key={s.key} className="evolution-chart__legend-item">
            <span className="evolution-chart__swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <p className="evolution-chart__caption">
        Held-out test set; Phase 3 uses the validation-tuned probability threshold.
      </p>
    </div>
  );
}

export default EvolutionChart;
