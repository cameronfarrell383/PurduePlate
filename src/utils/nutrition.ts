export const calculateDailyGoal = (weight: number, height: number, age: number, isMale: boolean, goal: 'cut' | 'bulk' | 'maintain') => {
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr = isMale ? bmr + 5 : bmr - 161;
  const tdee = bmr * 1.3; 

  if (goal === 'cut') return Math.round(tdee - 500);
  if (goal === 'bulk') return Math.round(tdee + 300);
  return Math.round(tdee);
};