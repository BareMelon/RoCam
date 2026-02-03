/**
 * Create a beta access key (admin only). Requires DATABASE_URL and migrations applied.
 * Usage: npm run create-beta-key [-- --uses=N] [-- --days=N]
 * Example: npm run create-beta-key -- --uses=5 --days=30
 */
import "dotenv/config";
import { createBetaKey } from "../src/services/betaAccessService.js";

const DEFAULT_USES = 1;
const DEFAULT_DAYS = 30;

function parseArg(name: string, defaultValue: number): number {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!arg) return defaultValue;
  const value = parseInt(arg.split("=")[1], 10);
  if (Number.isNaN(value) || value < 1) return defaultValue;
  return value;
}

async function main() {
  const maxUses = parseArg("uses", DEFAULT_USES);
  const days = parseArg("days", DEFAULT_DAYS);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  const { key, id } = await createBetaKey(maxUses, expiresAt);
  console.log("Beta access key created.");
  console.log("ID:", id);
  console.log("Key (show once, copy now):", key);
  console.log("Max uses:", maxUses, "| Expires:", expiresAt.toISOString());
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
