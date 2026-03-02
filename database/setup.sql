-- =============================================================================
-- PurduePlate — Complete Database Setup
-- Run this entire script in the Supabase SQL Editor
-- =============================================================================

-- ─── 1. TABLES ──────────────────────────────────────────────────────────────

-- dining_halls (text PK — 'earhart', 'ford', etc.)
CREATE TABLE IF NOT EXISTS dining_halls (
  id text PRIMARY KEY,
  name text NOT NULL,
  location_num text,
  created_at timestamptz DEFAULT now()
);

-- profiles (references auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text,
  name text DEFAULT 'Student',
  year text,
  dorm text,
  weight real,
  height real,
  age int,
  is_male boolean DEFAULT true,
  activity_level text,
  goal text,
  goal_calories int DEFAULT 2000,
  goal_protein_g int DEFAULT 150,
  goal_carbs_g int DEFAULT 250,
  goal_fat_g int DEFAULT 65,
  home_hall_id text REFERENCES dining_halls(id),
  dietary_needs text[] DEFAULT '{}',
  high_protein boolean DEFAULT false,
  meals_per_day int DEFAULT 2,
  water_goal_oz int DEFAULT 64,
  onboarding_complete boolean DEFAULT false,
  daily_summary_enabled boolean DEFAULT false,
  daily_summary_time text,
  reminder_prefs jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- menu_items
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dining_hall_id text NOT NULL REFERENCES dining_halls(id),
  name text NOT NULL,
  station text,
  meal text,
  date text NOT NULL,
  rec_num text,
  dietary_flags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_date ON menu_items(date);
CREATE INDEX IF NOT EXISTS idx_menu_items_hall_date ON menu_items(dining_hall_id, date);
CREATE INDEX IF NOT EXISTS idx_menu_items_rec_num ON menu_items(rec_num);

-- nutrition (one row per menu_item)
CREATE TABLE IF NOT EXISTS nutrition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  calories real DEFAULT 0,
  total_fat_g real DEFAULT 0,
  sat_fat_g real DEFAULT 0,
  trans_fat_g real DEFAULT 0,
  cholesterol_mg real DEFAULT 0,
  sodium_mg real DEFAULT 0,
  total_carbs_g real DEFAULT 0,
  dietary_fiber_g real DEFAULT 0,
  sugars_g real DEFAULT 0,
  added_sugars_g real DEFAULT 0,
  protein_g real DEFAULT 0,
  vitamin_d_mcg real DEFAULT 0,
  calcium_mg real DEFAULT 0,
  iron_mg real DEFAULT 0,
  potassium_mg real DEFAULT 0,
  ingredients text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_menu_item ON nutrition(menu_item_id);

-- meal_logs
CREATE TABLE IF NOT EXISTS meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  date text NOT NULL,
  meal text,
  servings real DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON meal_logs(user_id, date);

-- water_logs
CREATE TABLE IF NOT EXISTS water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date text NOT NULL,
  glasses int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- weight_logs
CREATE TABLE IF NOT EXISTS weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date text NOT NULL,
  weight real NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- favorites (keyed by rec_num, not menu_item_id)
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rec_num text NOT NULL,
  item_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

-- hall_ratings
CREATE TABLE IF NOT EXISTS hall_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dining_hall_id text NOT NULL REFERENCES dining_halls(id),
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  date text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, dining_hall_id, date)
);

-- dining_hall_hours
CREATE TABLE IF NOT EXISTS dining_hall_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dining_hall_id text NOT NULL REFERENCES dining_halls(id),
  date text NOT NULL,
  meal_label text NOT NULL,
  open_time text NOT NULL,
  close_time text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(dining_hall_id, date, meal_label)
);

CREATE INDEX IF NOT EXISTS idx_hall_hours_date ON dining_hall_hours(date);

-- scrape_logs
CREATE TABLE IF NOT EXISTS scrape_logs (
  id serial PRIMARY KEY,
  scrape_date text,
  hall_name text,
  items_scraped int DEFAULT 0,
  errors int DEFAULT 0,
  duration_seconds real DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- ai_chat_logs (stores individual messages with role)
CREATE TABLE IF NOT EXISTS ai_chat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  meal_items jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_logs_user ON ai_chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_logs_created ON ai_chat_logs(user_id, created_at);

-- meal_plans
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  date text NOT NULL,
  meal text,
  servings real DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date ON meal_plans(user_id, date);


-- ─── 2. ROW LEVEL SECURITY ─────────────────────────────────────────────────

-- Enable RLS on ALL tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_hall_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- ── profiles: users manage their own row ──
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- ── dining_halls: anyone can read, service_role can write ──
CREATE POLICY "Anyone can view dining halls"
  ON dining_halls FOR SELECT USING (true);
CREATE POLICY "Service role can manage dining halls"
  ON dining_halls FOR ALL USING (auth.role() = 'service_role');

-- ── menu_items: anyone can read, service_role can write ──
CREATE POLICY "Anyone can view menu items"
  ON menu_items FOR SELECT USING (true);
CREATE POLICY "Service role can manage menu items"
  ON menu_items FOR ALL USING (auth.role() = 'service_role');

-- ── nutrition: anyone can read, service_role can write ──
CREATE POLICY "Anyone can view nutrition"
  ON nutrition FOR SELECT USING (true);
CREATE POLICY "Service role can manage nutrition"
  ON nutrition FOR ALL USING (auth.role() = 'service_role');

-- ── meal_logs: users manage their own ──
CREATE POLICY "Users can view own meal logs"
  ON meal_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal logs"
  ON meal_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal logs"
  ON meal_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal logs"
  ON meal_logs FOR DELETE USING (auth.uid() = user_id);

-- ── water_logs: users manage their own ──
CREATE POLICY "Users can view own water logs"
  ON water_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own water logs"
  ON water_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own water logs"
  ON water_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own water logs"
  ON water_logs FOR DELETE USING (auth.uid() = user_id);

-- ── weight_logs: users manage their own ──
CREATE POLICY "Users can view own weight logs"
  ON weight_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weight logs"
  ON weight_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weight logs"
  ON weight_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own weight logs"
  ON weight_logs FOR DELETE USING (auth.uid() = user_id);

-- ── favorites: users manage their own ──
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites"
  ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE USING (auth.uid() = user_id);

-- ── hall_ratings: users manage their own, anyone can read (for averages) ──
CREATE POLICY "Anyone can view hall ratings"
  ON hall_ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert own ratings"
  ON hall_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ratings"
  ON hall_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ratings"
  ON hall_ratings FOR DELETE USING (auth.uid() = user_id);

-- ── dining_hall_hours: anyone can read, service_role can write ──
CREATE POLICY "Anyone can view dining hall hours"
  ON dining_hall_hours FOR SELECT USING (true);
CREATE POLICY "Service role can manage dining hall hours"
  ON dining_hall_hours FOR ALL USING (auth.role() = 'service_role');

-- ── scrape_logs: service_role only ──
CREATE POLICY "Service role can manage scrape logs"
  ON scrape_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anyone can view scrape logs"
  ON scrape_logs FOR SELECT USING (true);

-- ── ai_chat_logs: users manage their own, service_role for edge function ──
CREATE POLICY "Users can view own chat logs"
  ON ai_chat_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chat logs"
  ON ai_chat_logs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage chat logs"
  ON ai_chat_logs FOR ALL USING (auth.role() = 'service_role');

-- ── meal_plans: users manage their own ──
CREATE POLICY "Users can view own meal plans"
  ON meal_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal plans"
  ON meal_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal plans"
  ON meal_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal plans"
  ON meal_plans FOR DELETE USING (auth.uid() = user_id);


-- ─── 3. SEED DATA ──────────────────────────────────────────────────────────

INSERT INTO dining_halls (id, name, location_num) VALUES
  ('earhart', 'Earhart Dining Court', '01'),
  ('ford', 'Ford Dining Court', '02'),
  ('hillenbrand', 'Hillenbrand Dining Court', '03'),
  ('wiley', 'Wiley Dining Court', '04'),
  ('windsor', 'Windsor Dining Court', '05')
ON CONFLICT (id) DO NOTHING;


-- ─── 4. RPC FUNCTIONS ──────────────────────────────────────────────────────

-- get_ai_context: returns profile, consumed macros, and today's full menu
CREATE OR REPLACE FUNCTION get_ai_context(p_user_id uuid, p_date text)
RETURNS json AS $$
  SELECT json_build_object(
    'profile', (
      SELECT json_build_object(
        'goal_calories', goal_calories,
        'goal_protein_g', goal_protein_g,
        'goal_carbs_g', goal_carbs_g,
        'goal_fat_g', goal_fat_g,
        'dietary_needs', dietary_needs,
        'high_protein', high_protein,
        'goal', goal
      ) FROM profiles WHERE id = p_user_id
    ),
    'consumed_today', (
      SELECT json_build_object(
        'calories', COALESCE(SUM(n.calories * ml.servings), 0),
        'protein', COALESCE(SUM(n.protein_g * ml.servings), 0),
        'carbs', COALESCE(SUM(n.total_carbs_g * ml.servings), 0),
        'fat', COALESCE(SUM(n.total_fat_g * ml.servings), 0)
      )
      FROM meal_logs ml
      JOIN nutrition n ON n.menu_item_id = ml.menu_item_id
      WHERE ml.user_id = p_user_id AND ml.date = p_date
    ),
    'todays_menu', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', mi.id,
        'hall', dh.name,
        'meal', mi.meal,
        'station', mi.station,
        'name', mi.name,
        'calories', n.calories,
        'protein_g', n.protein_g,
        'carbs_g', n.total_carbs_g,
        'fat_g', n.total_fat_g,
        'dietary_flags', mi.dietary_flags
      )), '[]'::json)
      FROM menu_items mi
      JOIN dining_halls dh ON dh.id = mi.dining_hall_id
      JOIN nutrition n ON n.menu_item_id = mi.id
      WHERE mi.date = p_date
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- get_weekly_report: 7-day nutrition, water, weight, streak
CREATE OR REPLACE FUNCTION get_weekly_report(p_user_id uuid, p_end_date text)
RETURNS json AS $$
  SELECT json_build_object(
    'daily_totals', (
      SELECT COALESCE(json_agg(day_row ORDER BY day_row.log_date), '[]'::json)
      FROM (
        SELECT
          ml.date AS log_date,
          COALESCE(SUM(n.calories * ml.servings), 0) AS calories,
          COALESCE(SUM(n.protein_g * ml.servings), 0) AS protein,
          COALESCE(SUM(n.total_carbs_g * ml.servings), 0) AS carbs,
          COALESCE(SUM(n.total_fat_g * ml.servings), 0) AS fat,
          COUNT(DISTINCT ml.id) AS meals_logged
        FROM meal_logs ml
        JOIN nutrition n ON n.menu_item_id = ml.menu_item_id
        WHERE ml.user_id = p_user_id
          AND ml.date::date > p_end_date::date - 7
          AND ml.date::date <= p_end_date::date
        GROUP BY ml.date
      ) day_row
    ),
    'goals', (
      SELECT json_build_object(
        'calories', goal_calories,
        'protein', goal_protein_g,
        'carbs', goal_carbs_g,
        'fat', goal_fat_g,
        'water_goal_oz', COALESCE(water_goal_oz, 64)
      ) FROM profiles WHERE id = p_user_id
    ),
    'water_totals', (
      SELECT COALESCE(json_agg(json_build_object(
        'date', date,
        'total_oz', glasses
      ) ORDER BY date), '[]'::json)
      FROM water_logs
      WHERE user_id = p_user_id
        AND date::date > p_end_date::date - 7
        AND date::date <= p_end_date::date
    ),
    'weight_entries', (
      SELECT COALESCE(json_agg(json_build_object(
        'date', date,
        'weight', weight
      ) ORDER BY date), '[]'::json)
      FROM weight_logs
      WHERE user_id = p_user_id
        AND date::date > p_end_date::date - 7
        AND date::date <= p_end_date::date
    ),
    'streak', (
      WITH consecutive_days AS (
        SELECT DISTINCT date::date AS d
        FROM meal_logs
        WHERE user_id = p_user_id AND date::date <= p_end_date::date
        ORDER BY d DESC
      ),
      streak_calc AS (
        SELECT d,
               d - (ROW_NUMBER() OVER (ORDER BY d DESC))::int AS grp
        FROM consecutive_days
      )
      SELECT COALESCE(
        (SELECT COUNT(*)
         FROM streak_calc
         WHERE grp = (SELECT grp FROM streak_calc ORDER BY d DESC LIMIT 1)),
        0
      )
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- get_hall_averages: average rating + count per dining hall
CREATE OR REPLACE FUNCTION get_hall_averages()
RETURNS TABLE(dining_hall_id text, avg_rating numeric, total_ratings bigint) AS $$
  SELECT
    dining_hall_id,
    ROUND(AVG(rating)::numeric, 1) AS avg_rating,
    COUNT(*) AS total_ratings
  FROM hall_ratings
  GROUP BY dining_hall_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- get_hall_reviews: recent reviews for a specific hall
CREATE OR REPLACE FUNCTION get_hall_reviews(p_hall_id text, p_limit int DEFAULT 20)
RETURNS TABLE(rating int, review_text text, date text, user_name text) AS $$
  SELECT
    hr.rating,
    hr.review_text,
    hr.date,
    COALESCE(p.name, 'Anonymous') AS user_name
  FROM hall_ratings hr
  LEFT JOIN profiles p ON p.id = hr.user_id
  WHERE hr.dining_hall_id = p_hall_id
    AND hr.review_text IS NOT NULL
    AND hr.review_text != ''
  ORDER BY hr.created_at DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ─── 5. DONE ────────────────────────────────────────────────────────────────
-- All tables, RLS policies, seed data, and RPC functions created successfully.
