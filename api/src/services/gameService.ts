import { createHash, randomUUID } from "node:crypto";
import { config } from "../config.js";
import { query } from "../db/index.js";

export type GameSettings = {
  rateLimit?: {
    windowMs?: number;
    max?: number;
  };
  features?: {
    categories?: boolean;
    severity?: boolean;
    attachments?: boolean;
    statusVisibility?: boolean;
  };
};

export type GameRecord = {
  id: string;
  name: string;
  settings: GameSettings;
};

type GameWithKey = GameRecord & { apiKey: string };

const inMemoryGamesByAccount = new Map<string, GameWithKey[]>();
const inMemoryApiKeyToGameId = new Map<string, string>();

export const getGameByApiKey = async (apiKey: string): Promise<GameRecord | null> => {
  if (!apiKey) {
    return null;
  }

  if (!config.databaseUrl) {
    const gameId = inMemoryApiKeyToGameId.get(apiKey);
    if (gameId) {
      for (const games of inMemoryGamesByAccount.values()) {
        const g = games.find((x) => x.id === gameId);
        if (g) return { id: g.id, name: g.name, settings: g.settings };
      }
    }
    if (config.devApiKey && config.devGameId && apiKey === config.devApiKey) {
      return {
        id: config.devGameId,
        name: "Development Game",
        settings: {}
      };
    }
    return null;
  }

  const result = await query<{
    id: string;
    name: string;
    settings: GameSettings;
  }>(
    `SELECT g.id, g.name, g.settings
     FROM game_api_keys ak
     JOIN games g ON g.id = ak.game_id
     WHERE ak.key_hash = encode(digest($1, 'sha256'), 'hex')
     AND ak.revoked_at IS NULL`,
    [apiKey]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
};

export const listGamesByAccountId = async (accountId: string): Promise<GameRecord[]> => {
  if (!config.databaseUrl) {
    const games = inMemoryGamesByAccount.get(accountId) ?? [];
    return games.map((g) => ({ id: g.id, name: g.name, settings: g.settings }));
  }

  const result = await query<{ id: string; name: string; settings: GameSettings }>(
    `SELECT id, name, settings FROM games WHERE account_id = $1 ORDER BY created_at DESC`,
    [accountId]
  );
  return result.rows;
};

export const createGame = async (
  accountId: string,
  name: string
): Promise<{ game: GameRecord; apiKey: string }> => {
  const id = randomUUID();
  const apiKey = `fb_${randomUUID().replace(/-/g, "")}`;
  const settings: GameSettings = {};

  if (!config.databaseUrl) {
    const record: GameWithKey = { id, name, settings, apiKey };
    const list = inMemoryGamesByAccount.get(accountId) ?? [];
    list.unshift(record);
    inMemoryGamesByAccount.set(accountId, list);
    inMemoryApiKeyToGameId.set(apiKey, id);
    return { game: { id, name, settings }, apiKey };
  }

  const keyHash = createHash("sha256").update(apiKey).digest("hex");
  await query(
    `INSERT INTO games (id, account_id, name, settings) VALUES ($1, $2, $3, $4::jsonb)`,
    [id, accountId, name, JSON.stringify(settings)]
  );
  await query(
    `INSERT INTO game_api_keys (game_id, key_hash) VALUES ($1, $2)`,
    [id, keyHash]
  );
  return { game: { id, name, settings }, apiKey };
};

export const getGameByIdAndAccount = async (
  gameId: string,
  accountId: string
): Promise<GameRecord | null> => {
  if (!config.databaseUrl) {
    const games = inMemoryGamesByAccount.get(accountId) ?? [];
    const g = games.find((x) => x.id === gameId);
    return g ? { id: g.id, name: g.name, settings: g.settings } : null;
  }

  const result = await query<{ id: string; name: string; settings: GameSettings }>(
    `SELECT id, name, settings FROM games WHERE id = $1 AND account_id = $2`,
    [gameId, accountId]
  );
  return result.rowCount && result.rows[0] ? result.rows[0] : null;
};
