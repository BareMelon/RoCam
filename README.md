# Roblox Feedback Infrastructure

Scalable feedback and issue reporting platform for Roblox games. This repo is a monorepo with an API service, a dashboard SPA, and shared types.

## Project structure

- `api/` Fastify API (health/ready, game auth, feedback submission)
- `dashboard/` React + Vite dashboard scaffold
- `shared/` Shared TypeScript types and Zod validation
- `docs/` Roblox Lua example and integration notes
- `docker-compose.yml` Optional local PostgreSQL (if you use Docker)

For **first launch** (hosted database, migrations, first account, beta keys), see **[docs/first-launch.md](docs/first-launch.md)**.

## Quick start (no Docker)

Use a **hosted PostgreSQL** (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com), Railway, Render). No Docker or virtualization needed.

1. Create a Postgres database and copy its connection string.
2. Install dependencies: `npm install`
3. Copy env files and set `DATABASE_URL` in `api/.env`:
   - `cp api/.env.example api/.env`
   - Paste your connection string as `DATABASE_URL`
4. Run migrations: `cd api && npm run migrate`
5. Create first dashboard account: `cd api && npm run seed-first-account`  
   Add the printed `DASHBOARD_ACCOUNT_ID` and `DASHBOARD_TOKEN` to `api/.env`.
6. Start the API: `npm run dev:api`
7. Start the dashboard: `npm run dev:dashboard`

## Environment

Copy env examples:

- `api/.env.example` → `api/.env`
- `dashboard/.env.example` → `dashboard/.env`

### API env highlights

- `DATABASE_URL` PostgreSQL connection string
- `DASHBOARD_ORIGIN` Comma-separated origins allowed for the dashboard
- `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX` Rate limiting defaults
- `DEV_API_KEY` and `DEV_GAME_ID` Optional in-memory auth for local testing
- `BETA_ACCESS_REQUIRED` Set to `true` or `1` to require a beta access key when adding an experience (`POST /v1/games`). Used for closed beta.

## API overview

### Health

- `GET /health` Liveness check
- `GET /ready` Readiness check (DB connectivity)

### Submit feedback

- `POST /v1/feedback`
- Headers:
  - `Authorization: Bearer <api_key>` or `X-API-Key: <api_key>`

Example:

```
curl -X POST http://localhost:4000/v1/feedback \
  -H "Authorization: Bearer dev-api-key" \
  -H "Content-Type: application/json" \
  -d '{"type":"bug_report","identityOption":"anonymous","body":"UI is stuck"}'
```

### Dashboard API (Bearer auth optional in dev)

With no `DATABASE_URL`, the API runs in-memory and dashboard routes work without a token. With Postgres, set `DASHBOARD_TOKEN` and `DASHBOARD_ACCOUNT_ID` (see `api/.env.example`).

- `GET /v1/games` — List games for the current dashboard account.
- `POST /v1/games` — Add an experience; body `{ "name": "My Game" }` or, when `BETA_ACCESS_REQUIRED` is set, `{ "name": "My Game", "betaAccessKey": "<key>" }`; returns `{ game, apiKey }`.
- `GET /v1/games/:gameId/feedback` — List feedback for a game (query: `status`, `type`, `limit`, `offset`).
- `PATCH /v1/games/:gameId/feedback/:feedbackId` — Update status and/or developer notes; body `{ "status"?, "developerNotes"? }`.

Dashboard requests can send `Authorization: Bearer <DASHBOARD_TOKEN>` when the API is configured with `DASHBOARD_TOKEN`.

### Rate limiting

When the limit is reached:

- Status: `429 Too Many Requests`
- Headers: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Closed beta (beta access keys)

When `BETA_ACCESS_REQUIRED=true`, adding an experience in the dashboard (or via `POST /v1/games`) requires a valid beta access key. Keys are single-use by default (or N-use if created with `--uses=N`).

1. Apply migration `api/migrations/003_beta_access_keys.sql`.
2. From the `api/` directory, create a key:
   - `npm run create-beta-key` — 1 use, expires in 30 days
   - `npm run create-beta-key -- --uses=5 --days=14` — 5 uses, expires in 14 days
3. Share the printed key with testers. They enter it in the dashboard when adding an experience.
4. Keys are stored hashed; the plain key is only shown once when created.

## Creating game API keys

Keys are stored hashed with SHA-256 (pgcrypto extension):

```
INSERT INTO game_api_keys (game_id, key_hash)
VALUES ('<game_id>', encode(digest('<plain_api_key>', 'sha256'), 'hex'));
```

## Roblox integration

- Enable `HttpService` and add your API URL to the allow list in Game Settings → Security.
- Lua example: `docs/roblox-feedback-client.lua`

## OAuth notes

Dashboard OAuth is handled by the API service. Register OAuth apps with:

- Google
- Discord
- Roblox (Creator Dashboard → OAuth 2.0)

Store client IDs and secrets in your API environment when you implement auth endpoints.
