export const AGE_OPTIONS = [
  { value: 1, label: '18-24' },
  { value: 2, label: '25-29' },
  { value: 3, label: '30-34' },
  { value: 4, label: '35-39' },
  { value: 5, label: '40-44' },
  { value: 6, label: '45-49' },
  { value: 7, label: '50-54' },
  { value: 8, label: '55-59' },
  { value: 9, label: '60-64' },
  { value: 10, label: '65-69' },
  { value: 11, label: '70-74' },
  { value: 12, label: '75-79' },
  { value: 13, label: '80+' },
];

export const EDUCATION_OPTIONS = [
  { value: 1, label: 'Never attended school' },
  { value: 2, label: 'Elementary' },
  { value: 3, label: 'Some high school' },
  { value: 4, label: 'High school graduate' },
  { value: 5, label: 'Some college' },
  { value: 6, label: 'College graduate' },
];

export const INCOME_OPTIONS = [
  { value: 1, label: 'Less than $10,000' },
  { value: 2, label: '$10,000–$15,000' },
  { value: 3, label: '$15,000–$20,000' },
  { value: 4, label: '$20,000–$25,000' },
  { value: 5, label: '$25,000–$35,000' },
  { value: 6, label: '$35,000–$50,000' },
  { value: 7, label: '$50,000–$75,000' },
  { value: 8, label: '$75,000 or more' },
];

export const GENHLTH_OPTIONS = [
  { value: 1, label: 'Excellent' },
  { value: 2, label: 'Very good' },
  { value: 3, label: 'Good' },
  { value: 4, label: 'Fair' },
  { value: 5, label: 'Poor' },
];

export const INITIAL_FORM = {
  HighBP: 0,
  HighChol: 0,
  CholCheck: 1,
  BMI: '',
  Smoker: 0,
  Stroke: 0,
  HeartDiseaseorAttack: 0,
  PhysActivity: 1,
  Fruits: 1,
  Veggies: 1,
  HvyAlcoholConsump: 0,
  AnyHealthcare: 1,
  NoDocbcCost: 0,
  GenHlth: 3,
  MentHlth: '',
  PhysHlth: '',
  DiffWalk: 0,
  Sex: 0,
  Age: '',
  Education: 4,
  Income: 5,
};

/** Convert age in years (1-200) to BRFSS age group (1-13) */
export function ageYearsToBRFSS(years) {
  const age = parseInt(years, 10);
  if (isNaN(age) || age < 1 || age > 200) return null;
  if (age <= 24) return 1;
  if (age <= 29) return 2;
  if (age <= 34) return 3;
  if (age <= 39) return 4;
  if (age <= 44) return 5;
  if (age <= 49) return 6;
  if (age <= 54) return 7;
  if (age <= 59) return 8;
  if (age <= 64) return 9;
  if (age <= 69) return 10;
  if (age <= 74) return 11;
  if (age <= 79) return 12;
  return 13;
}
