# First launch setup (backend)

Use this checklist to get the API and database ready for your first launch. This guide uses a **hosted PostgreSQL** (no Docker or local install required).

## 1. Database (hosted)

Create a PostgreSQL database with any provider that gives you a connection string, for example:

- **[Neon](https://neon.tech)** – free tier, no credit card
- **[Supabase](https://supabase.com)** – free tier, PostgreSQL included
- **[Railway](https://railway.app)** – add a Postgres service to your project
- **[Render](https://render.com)** – free PostgreSQL tier

Create a new project/database, then copy the **connection string** (often shown as `DATABASE_URL` or “Connection string”). It looks like:

`postgres://user:password@host:5432/database?sslmode=require`

You’ll paste this into `api/.env` in the next step.

---

## 2. API environment

From the repo root:

```bash
cp api/.env.example api/.env
```

Edit `api/.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes (for first launch) | PostgreSQL connection string, e.g. `postgres://user:pass@host:5432/feedback` |
| `DASHBOARD_ORIGIN` | Yes (production) | Comma-separated origins for the dashboard, e.g. `https://your-dashboard.vercel.app` |
| `PORT` | No | Default `4000`; host may set this |
| `DASHBOARD_ACCOUNT_ID` | Yes (with Postgres) | Set after running the seed script below |
| `DASHBOARD_TOKEN` | Yes (with Postgres) | Secret the dashboard sends as `Authorization: Bearer <token>` |
| `BETA_ACCESS_REQUIRED` | No | Set to `true` or `1` to require beta keys when adding experiences |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | No | Defaults: 60000 ms, 30 requests |

For **local dev** you can leave `DASHBOARD_TOKEN` and `DASHBOARD_ACCOUNT_ID` unset; the API uses a dev account. For **production** with Postgres you must set both (use the seed script to get them).

---

## 3. Run migrations

From the **api** directory:

```bash
cd api
npm run migrate
```

This applies, in order:

- `001_init.sql` – accounts, games, game_api_keys, feedback
- `002_add_developer_notes.sql` – developer_notes on feedback
- `003_beta_access_keys.sql` – beta_access_keys table

---

## 4. Create first dashboard account (Postgres only)

So the dashboard can list and create games, create the first account and get env values:

```bash
cd api
npm run seed-first-account
```

Copy the printed `DASHBOARD_ACCOUNT_ID` and `DASHBOARD_TOKEN` into `api/.env`.

**Dashboard:** So the dashboard can call the API in production, set in the dashboard env (e.g. Vercel):

- `VITE_API_BASE_URL` – your API URL (e.g. `https://your-api.railway.app`)
- `VITE_DASHBOARD_TOKEN` – the same value as `DASHBOARD_TOKEN` (dashboard sends it as `Authorization: Bearer <token>`)

Local dev can omit `VITE_DASHBOARD_TOKEN` if the API has no `DASHBOARD_TOKEN` set.

---

## 5. (Optional) Beta access keys

If you set `BETA_ACCESS_REQUIRED=true`, create keys for testers:

```bash
cd api
npm run create-beta-key              # 1 use, 30 days
npm run create-beta-key -- --uses=5 --days=14
```

Share the printed key with testers; they enter it when adding an experience in the dashboard.

---

## 6. Start the API

**Development**

```bash
cd api
npm run dev
```

**Production**

```bash
cd api
npm run build
npm start
```

Ensure `PORT` and `DATABASE_URL` are set in the environment (e.g. by your host).

---

## 7. Verify

- **Health:** `GET https://your-api-url/health` → 200  
- **Ready:** `GET https://your-api-url/ready` → 200 if DB is reachable  
- **Dashboard:** Open the dashboard, add an experience (with beta key if required), copy the API key and submit feedback from your Roblox game or with curl (see README).

---

## Quick reference

| Task | Command (from repo root) |
|------|---------------------------|
| Run migrations | `cd api && npm run migrate` |
| Seed first account | `cd api && npm run seed-first-account` |
| Create beta key | `cd api && npm run create-beta-key` |
| Run API (dev) | `cd api && npm run dev` |
| Run API (prod) | `cd api && npm run build && npm start` |
