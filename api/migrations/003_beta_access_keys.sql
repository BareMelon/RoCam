CREATE TABLE IF NOT EXISTS beta_access_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  max_uses int NOT NULL DEFAULT 1,
  uses_count int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beta_access_keys_key_hash ON beta_access_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_beta_access_keys_expires_at ON beta_access_keys(expires_at);
