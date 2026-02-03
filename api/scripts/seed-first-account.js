/**
 * Create the first dashboard account and print env vars for first launch.
 * Run after migrations. Requires DATABASE_URL.
 * Usage: npm run seed-first-account
 */
import "dotenv/config";
import pg from "pg";
import crypto from "crypto";

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  try {
    await client.connect();

    const existing = await client.query(
      "SELECT id FROM accounts WHERE provider = $1 AND provider_account_id = $2",
      ["dashboard", "first-launch"]
    );
    if (existing.rowCount > 0) {
      console.log("First account already exists:");
      console.log("  DASHBOARD_ACCOUNT_ID=" + existing.rows[0].id);
      console.log("  Set DASHBOARD_TOKEN in .env to a secret and use it as Bearer token from the dashboard.");
      return;
    }

    const accountId = crypto.randomUUID();
    await client.query(
      `INSERT INTO accounts (id, provider, provider_account_id, display_name)
       VALUES ($1, $2, $3, $4)`,
      [accountId, "dashboard", "first-launch", "First launch"]
    );

    const token = "fb_dash_" + crypto.randomBytes(24).toString("hex");
    console.log("First dashboard account created. Add these to your api/.env:\n");
    console.log("DASHBOARD_ACCOUNT_ID=" + accountId);
    console.log("DASHBOARD_TOKEN=" + token);
    console.log("\nUse DASHBOARD_TOKEN as the Bearer token when the dashboard calls the API.");
    console.log("(Dashboard can send it in Authorization header once you wire it in.)");
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
