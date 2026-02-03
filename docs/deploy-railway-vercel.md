# Full deploy guide: Railway (Postgres + API) → Vercel (dashboard)

Do these steps in order. You already have Postgres on Railway; we add the API, then wire the dashboard on Vercel.

---

## Part 1: Railway – Postgres

1. **Wait for Postgres to be running**  
   In Railway, open your project → Postgres service. Wait until it shows as running (green).

2. **Copy the real connection string**  
   - Open the **Variables** (or **Connect**) tab for the Postgres service.  
   - Copy the value of **`DATABASE_URL`** (or `POSTGRES_URL` / similar).  
   - It should look like:  
     `postgresql://postgres:xxxxx@containers-us-west-xxx.railway.app:5432/railway`  
   - Save it somewhere (you’ll use it in Part 2 and Part 4).  
   - Do **not** use strings with `${{...}}`; use the actual URL Railway shows.
postgresql://postgres:LxodJoLxhmKgDEsJbrVhuUWdJSzOUAco@postgres.railway.internal:5432/railway
---

## Part 2: Railway – Add the API service

3. **New service from GitHub**  
   - In the **same** Railway project, click **+ New** → **GitHub Repo**.  
   - Select **BareMelon/RoCam** (or your repo name).  
   - Railway creates a new service from that repo.

4. **Set build and start (monorepo)**  
   Open the new service → **Settings** (or **Configure**):

   - **Root Directory:** leave **empty** (use repo root).
   - **Build Command:**  
     `npm install && npm run build --workspace=@feedback/shared && npm run build --workspace=api`
   - **Start Command:**  
     `cd api && node dist/index.js`
   - **Watch Paths (optional):** leave default so only relevant changes trigger deploys.

5. **Env vars for the API service**  
   In the API service, go to **Variables** and add:

   | Variable | Value |
   |----------|--------|
   | `DATABASE_URL` | Paste the **real** `DATABASE_URL` you copied from the Postgres service (Step 2). Or, if Railway offers “Add variable from another service”, reference the Postgres `DATABASE_URL`. |
   | `PORT` | Railway sets this automatically; you can leave it unset or set `4000`. |
   | `DASHBOARD_ORIGIN` | Set **after** you have the Vercel URL (Step 11). For now you can use `*` or leave empty to fix later. |

   Do **not** add `DASHBOARD_ACCOUNT_ID` or `DASHBOARD_TOKEN` yet (we create those in Part 4).

6. **Deploy**  
   Save and let Railway build and deploy. Note the **public URL** of this service (e.g. `https://your-api.up.railway.app`). That is your **API base URL** for Vercel.

---

## Part 3: Run migrations (once)

7. **Point your local API at Railway Postgres**  
   On your machine, in the project folder, open `api/.env` and set:

   ```env
   DATABASE_URL=<paste the same DATABASE_URL from Railway Postgres>
   ```

   (Nothing else has to be set for this step.)

8. **Run migrations**  
   In a terminal, from the **repo root**:

   ```bash
   cd api
   npm run migrate
   ```

   You should see “Applied: 001_init.sql”, etc. If it errors, check that `DATABASE_URL` in `api/.env` is the exact URL from Railway (no `${{...}}`, no typos).

---

## Part 4: First dashboard account (so the dashboard can talk to the API)

9. **Create the first account and get a token**  
   Still in `api/` with the same `DATABASE_URL` in `api/.env`:

   ```bash
   npm run seed-first-account
   ```

   The script prints something like:

   ```
   DASHBOARD_ACCOUNT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   DASHBOARD_TOKEN=fb_dash_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

   Copy both values.

10. **Add them to Railway**  
    In Railway → your **API service** → **Variables**, add:

    | Variable | Value |
    |----------|--------|
    | `DASHBOARD_ACCOUNT_ID` | The UUID from the script output. |
    | `DASHBOARD_TOKEN` | The long token from the script output. |

    Save. Railway will redeploy the API with the new vars.

---

## Part 5: Vercel – Dashboard

11. **Deploy the dashboard**  
    - In Vercel, import the **same** repo (BareMelon/RoCam).  
    - Set **Root Directory** to **`dashboard`**.  
    - Deploy.  
    - Copy your dashboard URL (e.g. `https://ro-cam.vercel.app`).

12. **Set dashboard env on Vercel**  
    In Vercel → your project → **Settings** → **Environment Variables**, add:

    | Name | Value |
    |------|--------|
    | `VITE_API_BASE_URL` | Your **Railway API URL** from Step 6 (e.g. `https://your-api.up.railway.app`) — no trailing slash. |
    | `VITE_DASHBOARD_TOKEN` | The **same** `DASHBOARD_TOKEN` you put in Railway (Step 10). |

    Redeploy the dashboard so the new env is baked in.

13. **Allow the dashboard origin on the API**  
    In Railway → **API service** → **Variables**, set:

    | Variable | Value |
    |----------|--------|
    | `DASHBOARD_ORIGIN` | Your Vercel dashboard URL, e.g. `https://ro-cam.vercel.app` (or comma-separated if you have more than one). |

    Save so the API allows CORS from that origin.

---

## Part 6: Check

14. **API**  
    - Open `https://your-api-url/health` → should return 200.  
    - Open `https://your-api-url/ready` → should return 200 if DB is connected.

15. **Dashboard**  
    - Open your Vercel URL.  
    - You should see the app; “Add experience” should work (no beta key unless you turned that on).  
    - Add an experience, copy the API key, then submit feedback from your Roblox game or with curl using that key.

---

## Quick reference

| What | Where |
|------|--------|
| **API base URL** | Railway → API service → public URL (Settings / Deploy). |
| **DATABASE_URL** | Railway → Postgres service → Variables. |
| **DASHBOARD_ACCOUNT_ID** / **DASHBOARD_TOKEN** | From `cd api && npm run seed-first-account` → add to Railway API service. |
| **VITE_API_BASE_URL** | Same as API base URL → set in Vercel. |
| **VITE_DASHBOARD_TOKEN** | Same as `DASHBOARD_TOKEN` → set in Vercel. |
| **DASHBOARD_ORIGIN** | Your Vercel dashboard URL → set in Railway API service. |

If something fails (e.g. “invalid_api_key”, CORS, or 401 on dashboard calls), double-check that the same `DASHBOARD_TOKEN` is in both Railway (API) and Vercel (`VITE_DASHBOARD_TOKEN`), and that `DASHBOARD_ORIGIN` matches the Vercel URL exactly.
