import { supabase } from './supabase';
import { getEffectiveMenuDate } from './meals';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  meal_items?: MealItem[] | null;
}

export interface MealItem {
  id: number;
  name: string;
  hall: string;
  meal: string;
  station: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface ChatLogRow {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  meal_items: MealItem[] | null;
  created_at: string;
}

/**
 * Sends a message to the AI chat Edge Function.
 * Returns the assistant's response content and any meal item suggestions.
 */
export async function sendMessage(
  userId: string,
  message: string,
  history: ChatMessage[]
): Promise<{ content: string; mealItems: MealItem[] | null }> {
  const date = await getEffectiveMenuDate();

  // Only send last 10 messages as history per rate limiting spec
  const trimmedHistory = history.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: { userId, message, history: trimmedHistory, date },
  });

  if (error) {
    throw new Error(error.message || 'Failed to get AI response');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return {
    content: data?.content ?? '',
    mealItems: data?.mealItems ?? null,
  };
}

/**
 * Fetches the full chat history for a user, ordered oldest-first.
 */
export async function getChatHistory(userId: string): Promise<ChatLogRow[]> {
  const { data, error } = await supabase
    .from('ai_chat_logs')
    .select('id, role, content, meal_items, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load chat history');
  }

  return (data as ChatLogRow[]) ?? [];
}

/**
 * Deletes all chat history for a user.
 */
export async function clearChatHistory(userId: string): Promise<void> {
  const { error } = await supabase
    .from('ai_chat_logs')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Failed to clear chat history');
  }
}
