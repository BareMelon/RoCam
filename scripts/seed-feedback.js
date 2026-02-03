/**
 * Send varied feedback to the API to simulate many users.
 * Usage:
 *   API_KEY=fb_xxx node scripts/seed-feedback.js
 *   API_KEY=fb_xxx node scripts/seed-feedback.js --delay 2000   (2s between each)
 *   API_KEY=fb_xxx node scripts/seed-feedback.js --bulk 20     (send 20 in quick succession, then pause)
 */

const API_BASE = process.env.API_BASE_URL || "http://localhost:4000";
const API_KEY = process.env.API_KEY || "fb_61067771c226495c81672ca4ac199010";
const args = process.argv.slice(2);
const delayMs = args.includes("--delay") ? Number(args[args.indexOf("--delay") + 1]) || 1500 : 0;
const bulkSize = args.includes("--bulk") ? Number(args[args.indexOf("--bulk") + 1]) || 15 : 0;

const BUGS = [
  "Game crashes when I leave the vehicle",
  "Can't jump after respawning",
  "UI buttons don't respond sometimes",
  "FPS drops in the city area",
  "Inventory item duplicated after trade",
  "Screen goes black when opening settings",
  "Sound cuts out after 10 minutes",
  "Can't invite friends to party",
  "Leaderboard shows wrong rank",
  "Daily reward didn't claim",
];

const FEATURES = [
  "Add a minimap please",
  "Would love custom keybinds",
  "Night mode for the lobby",
  "More character customization",
  "Trading system between players",
  "Private servers with passwords",
  "Achievements and badges",
  "Voice chat option",
  "Replay system for races",
  "Cross-platform save sync",
];

const GENERAL = [
  "Great game, keep it up",
  "The new update is awesome",
  "When is the next event?",
  "Can we get more maps?",
  "Thanks for fixing the bug from last week",
  "Suggest adding a tutorial for new players",
  "Love the graphics",
  "Music is a bit loud in menu",
  "Any plans for mobile?",
  "Community is really friendly",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const TYPES = [
  { type: "bug_report", identityOption: "anonymous", body: () => pick(BUGS) },
  { type: "bug_report", identityOption: "anonymous", body: () => pick(BUGS) },
  { type: "feature_request", identityOption: "anonymous", body: () => pick(FEATURES) },
  { type: "feature_request", identityOption: "anonymous", body: () => pick(FEATURES) },
  { type: "general", identityOption: "anonymous", body: () => pick(GENERAL) },
  { type: "general", identityOption: "anonymous", body: () => pick(GENERAL) },
  { type: "bug_report", identityOption: "userId", body: () => pick(BUGS), identity: { userId: "12345" } },
  { type: "feature_request", identityOption: "usernameUserId", body: () => pick(FEATURES), identity: { userId: "67890", username: "PlayerOne" } },
];

function payload() {
  const t = pick(TYPES);
  return {
    type: t.type,
    identityOption: t.identityOption,
    body: typeof t.body === "function" ? t.body() : t.body,
    ...(t.identity && { identity: t.identity }),
  };
}

async function sendOne() {
  const res = await fetch(`${API_BASE}/v1/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(payload()),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  const data = await res.json();
  return data.id;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("API:", API_BASE);
  console.log("Key:", API_KEY.slice(0, 12) + "...");
  if (delayMs) console.log("Delay between requests:", delayMs, "ms");
  if (bulkSize) console.log("Bulk mode: send", bulkSize, "then pause 5s, repeat 3 times");
  console.log("");

  const total = bulkSize ? bulkSize * 3 : (delayMs ? 15 : 25);
  let sent = 0;
  let failed = 0;

  if (bulkSize) {
    for (let round = 0; round < 3; round++) {
      console.log(`Round ${round + 1}/3: sending ${bulkSize}...`);
      for (let i = 0; i < bulkSize; i++) {
        try {
          const id = await sendOne();
          sent++;
          process.stdout.write(".");
        } catch (e) {
          failed++;
          console.error("\n", e.message);
        }
      }
      console.log(` ${sent} sent`);
      if (round < 2) {
        console.log("Pausing 5s...");
        await sleep(5000);
      }
    }
  } else {
    for (let i = 0; i < total; i++) {
      try {
        const id = await sendOne();
        sent++;
        console.log(`[${sent}/${total}] ${id}`);
        if (delayMs) await sleep(delayMs);
      } catch (e) {
        failed++;
        console.error("Error:", e.message);
      }
    }
  }

  console.log("\nDone. Sent:", sent, "Failed:", failed);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
