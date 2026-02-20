// ── Types ────────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  calories: { points: number; max: 40; pct: number };
  protein:  { points: number; max: 20; pct: number };
  carbs:    { points: number; max: 10; pct: number };
  fat:      { points: number; max: 10; pct: number };
  meals:    { points: number; max: 10; count: number };
  water:    { points: number; max: 10; pct: number };
}

export interface DailyScore {
  score: number;
  grade: string;
  gradeColor: string;
  breakdown: ScoreBreakdown;
}

// Accent colors (identical in both themes)
const COLORS = {
  green:  '#34C759',
  blue:   '#5B7FFF',
  orange: '#E87722',
  yellow: '#FFD60A',
  red:    '#FF453A',
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function accuracyPoints(consumed: number, goal: number, maxPoints: number): { points: number; pct: number } {
  if (goal <= 0) return { points: 0, pct: 0 };
  const safe = Math.max(0, consumed);
  const pct = safe / goal;
  const deviation = Math.abs(1 - pct);
  const points = Math.max(0, maxPoints - deviation * maxPoints * 10);
  return { points, pct };
}

function mealPoints(count: number): number {
  if (count >= 3) return 10;
  if (count === 2) return 7;
  if (count === 1) return 4;
  return 0;
}

function waterPoints(waterOz: number, goalOz: number): { points: number; pct: number } {
  if (goalOz <= 0) return { points: 0, pct: 0 };
  const pct = waterOz / goalOz;
  let points = 0;
  if (pct >= 1.0) points = 10;
  else if (pct >= 0.75) points = 7;
  else if (pct >= 0.5) points = 4;
  return { points, pct };
}

function getGrade(score: number): { grade: string; gradeColor: string } {
  if (score >= 95) return { grade: 'A+', gradeColor: COLORS.green };
  if (score >= 85) return { grade: 'A',  gradeColor: COLORS.green };
  if (score >= 75) return { grade: 'B',  gradeColor: COLORS.blue };
  if (score >= 65) return { grade: 'C',  gradeColor: COLORS.orange };
  if (score >= 50) return { grade: 'D',  gradeColor: COLORS.yellow };
  return { grade: 'F', gradeColor: COLORS.red };
}

// ── Main Function ────────────────────────────────────────────────────────────

export function calculateDailyScore(
  consumed: { calories: number; protein: number; carbs: number; fat: number },
  goals:    { calories: number; protein: number; carbs: number; fat: number },
  mealsLogged: number,
  waterOz: number,
  waterGoalOz: number
): DailyScore {
  // Edge case: no calorie goal set
  if (goals.calories === 0) {
    return {
      score: 0,
      grade: 'F',
      gradeColor: COLORS.red,
      breakdown: {
        calories: { points: 0, max: 40, pct: 0 },
        protein:  { points: 0, max: 20, pct: 0 },
        carbs:    { points: 0, max: 10, pct: 0 },
        fat:      { points: 0, max: 10, pct: 0 },
        meals:    { points: 0, max: 10, count: 0 },
        water:    { points: 0, max: 10, pct: 0 },
      },
    };
  }

  const cal  = accuracyPoints(consumed.calories, goals.calories, 40);
  const prot = accuracyPoints(consumed.protein,  goals.protein,  20);
  const carb = accuracyPoints(consumed.carbs,    goals.carbs,    10);
  const fat  = accuracyPoints(consumed.fat,      goals.fat,      10);
  const mPts = mealPoints(mealsLogged);
  const wtr  = waterPoints(waterOz, waterGoalOz);

  const total = Math.round(cal.points + prot.points + carb.points + fat.points + mPts + wtr.points);
  const { grade, gradeColor } = getGrade(total);

  return {
    score: total,
    grade,
    gradeColor,
    breakdown: {
      calories: { points: Math.round(cal.points),  max: 40, pct: cal.pct },
      protein:  { points: Math.round(prot.points), max: 20, pct: prot.pct },
      carbs:    { points: Math.round(carb.points), max: 10, pct: carb.pct },
      fat:      { points: Math.round(fat.points),  max: 10, pct: fat.pct },
      meals:    { points: mPts,                     max: 10, count: mealsLogged },
      water:    { points: wtr.points,               max: 10, pct: wtr.pct },
    },
  };
}
