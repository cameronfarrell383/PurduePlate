import { getCurrentMealPeriod } from './meals';

export interface AIContextProfile {
  goal_calories: number | null;
  goal_protein_g: number | null;
  goal_carbs_g: number | null;
  goal_fat_g: number | null;
  dietary_needs: string | null;
  high_protein: boolean | null;
  goal: string | null;
}

export interface AIContextConsumed {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface AIContextMenuItem {
  id: number;
  hall: string;
  meal: string;
  station: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  dietary_flags: string[] | null;
}

export interface AIContext {
  profile: AIContextProfile | null;
  consumed_today: AIContextConsumed | null;
  todays_menu: AIContextMenuItem[] | null;
}

const MAX_MENU_CHARS = 60000;

/**
 * Returns the current meal period and the next one (if any).
 * Breakfast → [Breakfast, Lunch], Lunch → [Lunch, Dinner], Dinner → [Dinner]
 */
export function getRelevantMealPeriods(): string[] {
  const current = getCurrentMealPeriod();
  if (current === 'Breakfast') return ['Breakfast', 'Lunch'];
  if (current === 'Lunch') return ['Lunch', 'Dinner'];
  return ['Dinner'];
}

/**
 * Filters the full menu to only items relevant to the current + next meal period.
 * Always includes 'Daily Items'. Includes 'Lunch/Dinner' when Lunch or Dinner is relevant.
 */
function filterMenuByPeriod(
  menu: AIContextMenuItem[],
  periods: string[]
): AIContextMenuItem[] {
  return menu.filter((item) => {
    if (periods.includes(item.meal)) return true;
    if (item.meal === 'Daily Items') return true;
    if (item.meal === 'Lunch/Dinner') {
      return periods.includes('Lunch') || periods.includes('Dinner');
    }
    return false;
  });
}

/**
 * Truncates menu JSON to stay within the character limit.
 * Progressively removes items until under the limit.
 */
function truncateMenu(items: AIContextMenuItem[]): string {
  let json = JSON.stringify(items);
  if (json.length <= MAX_MENU_CHARS) return json;

  let truncated = items;
  while (json.length > MAX_MENU_CHARS && truncated.length > 0) {
    truncated = truncated.slice(0, Math.floor(truncated.length * 0.75));
    json = JSON.stringify(truncated);
  }
  return json;
}

/**
 * Builds the system prompt for the AI chat Edge Function.
 * Takes the RPC context output, calculates remaining macros,
 * filters menu to current + next meal period, and formats the prompt.
 */
export function buildSystemPrompt(context: AIContext): string {
  const profile = context.profile;
  const consumed = context.consumed_today;
  const fullMenu = context.todays_menu ?? [];

  const goalCal = profile?.goal_calories ?? 2000;
  const goalP = profile?.goal_protein_g ?? 150;
  const goalC = profile?.goal_carbs_g ?? 250;
  const goalF = profile?.goal_fat_g ?? 65;

  const remainCal = Math.max(0, goalCal - (consumed?.calories ?? 0));
  const remainP = Math.max(0, goalP - (consumed?.protein ?? 0));
  const remainC = Math.max(0, goalC - (consumed?.carbs ?? 0));
  const remainF = Math.max(0, goalF - (consumed?.fat ?? 0));

  const relevantPeriods = getRelevantMealPeriods();
  const filteredMenu = filterMenuByPeriod(fullMenu, relevantPeriods);
  const menuJson = truncateMenu(filteredMenu);

  const dietaryNeeds = profile?.dietary_needs ?? 'none specified';
  const bodyGoal = profile?.goal ?? 'not specified';
  const highProtein = profile?.high_protein ? 'Yes — prioritize protein.' : '';

  return `You are PurduePlate AI, a friendly and concise nutrition assistant for Purdue students.

## User Profile
- Daily goals: ${goalCal} cal | ${goalP}g protein | ${goalC}g carbs | ${goalF}g fat
- Body goal: ${bodyGoal}
- Dietary needs: ${dietaryNeeds}
${highProtein ? `- High protein preference: ${highProtein}` : ''}

## Today's Progress
- Consumed: ${consumed?.calories ?? 0} cal | ${consumed?.protein ?? 0}g P | ${consumed?.carbs ?? 0}g C | ${consumed?.fat ?? 0}g F
- Remaining: ${remainCal} cal | ${remainP}g P | ${remainC}g C | ${remainF}g F

## Available Menu Items (${relevantPeriods.join(' & ')})
${menuJson}

## Rules
1. ONLY recommend items from the menu above. Never invent items.
2. Always include the dining hall name, station, and nutrition info (calories, protein, carbs, fat) for each recommendation.
3. Respect the user's dietary restrictions and body goal.
4. Be concise and friendly. Use short paragraphs. Purdue students are busy.
5. When suggesting a menu item, include it as a structured block so the app can offer one-tap logging. Use this exact format:
   [MEAL_ITEM]{"id":<menu_item_id>,"name":"<item name>","hall":"<dining hall>","calories":<cal>,"protein_g":<p>,"carbs_g":<c>,"fat_g":<f>}[/MEAL_ITEM]
6. You can suggest multiple items. Place each [MEAL_ITEM] block on its own line after describing it.
7. If the user has already consumed most of their daily calories, suggest lighter options.
8. If no menu items are available, let the user know that today's menu hasn't been loaded yet and to check back later.`;
}
