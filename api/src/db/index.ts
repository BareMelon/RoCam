import pg from "pg";
import { config } from "../config.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export const isDbConfigured = () => Boolean(config.databaseUrl);

export const getPool = () => {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 10
    });
  }

  return pool;
};

export const query = async <T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
) => {
  const activePool = getPool();
  const result = await activePool.query<T>(text, params);
  return result;
};

export const checkDbReady = async () => {
  if (!config.databaseUrl) {
    return false;
  }

  try {
    const result = await query("SELECT 1 as ok");
    return result.rowCount === 1;
  } catch {
    return false;
  }
};
