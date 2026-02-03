import { createHash, randomBytes } from "node:crypto";
import { config } from "../config.js";
import { query } from "../db/index.js";

const KEY_PREFIX = "beta_";
const KEY_BYTES = 16;

export type BetaKeyRecord = {
  id: string;
  keyPrefix: string;
  maxUses: number;
  usesCount: number;
  expiresAt: string;
};

function hashKey(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

function keyPrefix(plain: string): string {
  return plain.slice(0, KEY_PREFIX.length + 8);
}

/** Validate without consuming. Returns key id if valid and not expired. */
export async function validateBetaKey(plainKey: string): Promise<string | null> {
  if (!plainKey || !plainKey.startsWith(KEY_PREFIX) || plainKey.length < 20) {
    return null;
  }
  if (!config.databaseUrl) {
    return null;
  }
  const h = hashKey(plainKey);
  const result = await query<{ id: string; max_uses: number; uses_count: number; expires_at: string }>(
    `SELECT id, max_uses, uses_count, expires_at FROM beta_access_keys
     WHERE key_hash = $1 AND expires_at > now()`,
    [h]
  );
  if (result.rowCount === 0) return null;
  const row = result.rows[0];
  if (row.uses_count >= row.max_uses) return null;
  return row.id;
}

/** Consume one use. Returns true if consumed. */
export async function consumeBetaKey(keyId: string): Promise<boolean> {
  if (!config.databaseUrl) return false;
  const result = await query(
    `UPDATE beta_access_keys SET uses_count = uses_count + 1
     WHERE id = $1 AND uses_count < max_uses RETURNING id`,
    [keyId]
  );
  return (result.rowCount ?? 0) > 0;
}

/** Create a new beta key (admin). Returns the plain key (show once). */
export async function createBetaKey(
  maxUses: number,
  expiresAt: Date
): Promise<{ key: string; id: string }> {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL required to create beta keys");
  }
  const raw = randomBytes(KEY_BYTES).toString("hex");
  const key = `${KEY_PREFIX}${raw}`;
  const keyHash = hashKey(key);
  const prefix = keyPrefix(key);
  const result = await query<{ id: string }>(
    `INSERT INTO beta_access_keys (key_hash, key_prefix, max_uses, expires_at)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [keyHash, prefix, maxUses, expiresAt.toISOString()]
  );
  return { key, id: result.rows[0].id };
}
