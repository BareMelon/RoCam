/**
 * Run all SQL migrations in order. Requires DATABASE_URL.
 * Usage: npm run migrate   (from api directory)
 */
import "dotenv/config";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migrationsDir = path.join(__dirname, "../migrations");
const migrationFiles = ["001_init.sql", "002_add_developer_notes.sql", "003_beta_access_keys.sql"];

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required. Set it in .env or the environment.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log("Connected to database.");

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      if (!fs.existsSync(filePath)) {
        console.warn("Skip (not found):", file);
        continue;
      }
      const sql = fs.readFileSync(filePath, "utf8");
      await client.query(sql);
      console.log("Applied:", file);
    }

    console.log("Migrations complete.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
