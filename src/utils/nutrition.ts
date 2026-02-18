export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';

export type GoalType = 'aggressive_cut' | 'moderate_cut' | 'maintain' | 'lean_bulk' | 'aggressive_bulk';

const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

const goalMultipliers: Record<GoalType, number> = {
  aggressive_cut: 0.75,
  moderate_cut: 0.85,
  maintain: 1.0,
  lean_bulk: 1.10,
  aggressive_bulk: 1.20,
};

export const GOAL_OPTIONS: { key: GoalType; label: string; description: string }[] = [
  { key: 'aggressive_cut', label: 'Lose weight fast (-25%)', description: '~1.5 lbs/week. Best for short-term cuts.' },
  { key: 'moderate_cut', label: 'Lose weight steadily (-15%)', description: '~1 lb/week. Sustainable fat loss.' },
  { key: 'maintain', label: 'Maintain weight', description: 'Stay at current weight.' },
  { key: 'lean_bulk', label: 'Build muscle slowly (+10%)', description: 'Minimize fat gain. ~0.5 lb/week.' },
  { key: 'aggressive_bulk', label: 'Build muscle fast (+20%)', description: 'Maximum growth. ~1 lb/week.' },
];

export const calculateTDEE = (
  weight: number,
  height: number,
  age: number,
  isMale: boolean,
  activityLevel: ActivityLevel = 'light'
): number => {
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr = isMale ? bmr + 5 : bmr - 161;
  return Math.round(bmr * activityMultipliers[activityLevel]);
};

export const calculateDailyGoal = (
  weight: number,
  height: number,
  age: number,
  isMale: boolean,
  goal: GoalType | 'cut' | 'bulk',
  activityLevel: ActivityLevel = 'light'
): number => {
  const tdee = calculateTDEE(weight, height, age, isMale, activityLevel);

  // Legacy support
  if (goal === 'cut') return Math.round(tdee * 0.85);
  if (goal === 'bulk') return Math.round(tdee * 1.10);

  const multiplier = goalMultipliers[goal as GoalType] ?? 1.0;
  return Math.round(tdee * multiplier);
};

export const getWeeklyProjection = (goalCalories: number, tdee: number): string => {
  const weeklyDiff = (goalCalories - tdee) * 7;
  const lbsPerWeek = Math.abs(weeklyDiff) / 3500;
  if (Math.abs(weeklyDiff) < 100) return 'Maintain current weight';
  const direction = weeklyDiff < 0 ? 'loss' : 'gain';
  return `Estimated: ~${lbsPerWeek.toFixed(1)} lb/week ${direction}`;
};
