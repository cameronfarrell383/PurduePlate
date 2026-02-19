import { supabase } from './supabase';

export interface HallAverage {
  avg: number;
  count: number;
}

export interface HallReview {
  rating: number;
  review_text: string;
  date: string;
  user_name: string;
}

export interface UserRating {
  id: number;
  rating: number;
  review_text: string | null;
}

/**
 * Rate a dining hall (upsert — one rating per user per hall per day).
 * If the user already rated this hall today, their rating is updated.
 */
export async function rateHall(
  userId: string,
  hallId: number,
  rating: number,
  reviewText?: string,
  date?: string
): Promise<void> {
  try {
    const ratingDate =
      date ??
      (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })();

    const { error } = await supabase
      .from('hall_ratings')
      .upsert(
        {
          user_id: userId,
          dining_hall_id: hallId,
          rating,
          review_text: reviewText ?? null,
          date: ratingDate,
          updated_at: new Date().toISOString(), // timestamptz column — toISOString is safe
        },
        { onConflict: 'user_id,dining_hall_id,date' }
      );

    if (error) throw new Error(`Failed to save rating: ${error.message}`);
  } catch (err) {
    throw err instanceof Error ? err : new Error('Failed to save rating');
  }
}

/**
 * Get average ratings for all halls via RPC.
 * Returns a map of hallId → { avg, count }.
 */
export async function getHallAverages(): Promise<Record<number, HallAverage>> {
  try {
    const { data, error } = await supabase.rpc('get_hall_averages');

    if (error) throw new Error(`Failed to fetch hall averages: ${error.message}`);

    const map: Record<number, HallAverage> = {};
    if (data) {
      for (const row of data) {
        map[row.dining_hall_id] = {
          avg: parseFloat(row.avg_rating),
          count: Number(row.total_ratings),
        };
      }
    }
    return map;
  } catch (err) {
    throw err instanceof Error ? err : new Error('Failed to fetch hall averages');
  }
}

/**
 * Get recent reviews for a specific hall via RPC.
 */
export async function getHallReviews(hallId: number): Promise<HallReview[]> {
  try {
    const { data, error } = await supabase.rpc('get_hall_reviews', {
      p_hall_id: hallId,
      p_limit: 20,
    });

    if (error) throw new Error(`Failed to fetch hall reviews: ${error.message}`);
    return (data as HallReview[]) ?? [];
  } catch (err) {
    throw err instanceof Error ? err : new Error('Failed to fetch hall reviews');
  }
}

/**
 * Check if the user already rated a specific hall on a given date.
 * Returns the existing rating or null.
 */
export async function getUserRating(
  userId: string,
  hallId: number,
  date?: string
): Promise<UserRating | null> {
  try {
    const ratingDate =
      date ??
      (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })();

    const { data, error } = await supabase
      .from('hall_ratings')
      .select('id, rating, review_text')
      .eq('user_id', userId)
      .eq('dining_hall_id', hallId)
      .eq('date', ratingDate)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch user rating: ${error.message}`);
    return data ?? null;
  } catch (err) {
    throw err instanceof Error ? err : new Error('Failed to fetch user rating');
  }
}
