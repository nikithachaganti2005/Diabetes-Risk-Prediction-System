/**
 * Illustrative phase metrics matching the project’s benchmark / report figure
 * (grouped bar chart: Accuracy, Recall, Precision, F1, ROC-AUC × 3 phases).
 * Shown when the API has not yet generated evolution_metrics.json from training.
 */
export const EVOLUTION_PREVIEW = {
  generated: false,
  is_preview: true,
  optimized_threshold: 0.42,
  phases: [
    {
      phase: 1,
      label: 'Phase 1: Tuned XGBoost',
      accuracy: 0.75,
      recall: 0.8,
      precision: 0.73,
      f1_score: 0.76,
      roc_auc: 0.83,
    },
    {
      phase: 2,
      label: 'Phase 2: Stacking Ensemble',
      accuracy: 0.75,
      recall: 0.78,
      precision: 0.73,
      f1_score: 0.76,
      roc_auc: 0.83,
    },
    {
      phase: 3,
      label: 'Phase 3: Threshold Optimization',
      accuracy: 0.75,
      recall: 0.85,
      precision: 0.71,
      f1_score: 0.77,
      roc_auc: 0.83,
    },
  ],
};
