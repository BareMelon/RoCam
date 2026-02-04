CREATE TABLE IF NOT EXISTS game_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  stat_type text NOT NULL,
  period text NOT NULL,
  value numeric NOT NULL,
  metadata jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_date date NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_game_stats_game_id ON game_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_type_period ON game_stats(stat_type, period);
CREATE INDEX IF NOT EXISTS idx_game_stats_recorded_at ON game_stats(recorded_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_stats_unique ON game_stats(game_id, stat_type, period, recorded_date);

-- Stat types: ccu, daily_users, visits, avg_play_time, user_age, country
-- Period: 24h, 7d, 30d
-- Metadata can store series data (e.g., hourly CCU values, country breakdowns)
