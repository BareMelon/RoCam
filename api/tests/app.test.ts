import assert from "node:assert/strict";
import { test } from "node:test";

process.env.DEV_API_KEY = "test-api-key";
process.env.DEV_GAME_ID = "test-game";
process.env.RATE_LIMIT_MAX = "1";
process.env.RATE_LIMIT_WINDOW_MS = "60000";

const { buildApp } = await import("../src/app.js");

test("health and ready endpoints", async () => {
  const app = await buildApp();

  const health = await app.inject({ method: "GET", url: "/health" });
  assert.equal(health.statusCode, 200);
  assert.equal(JSON.parse(health.body).status, "ok");

  const ready = await app.inject({ method: "GET", url: "/ready" });
  assert.equal(ready.statusCode, 503);

  await app.close();
});

test("feedback submission and rate limit", async () => {
  const app = await buildApp();

  const payload = {
    type: "bug_report",
    identityOption: "anonymous",
    body: "Something broke in the game.",
    metadata: {
      platform: "roblox"
    }
  };

  const first = await app.inject({
    method: "POST",
    url: "/v1/feedback",
    headers: {
      authorization: "Bearer test-api-key"
    },
    payload
  });

  assert.equal(first.statusCode, 201);
  const firstBody = JSON.parse(first.body);
  assert.ok(firstBody.id);

  const second = await app.inject({
    method: "POST",
    url: "/v1/feedback",
    headers: {
      authorization: "Bearer test-api-key"
    },
    payload
  });

  assert.equal(second.statusCode, 429);
  assert.ok(second.headers["retry-after"]);

  await app.close();
});
