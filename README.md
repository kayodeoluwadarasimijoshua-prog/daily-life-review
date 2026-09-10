# Daily Life Review

A full-stack journaling web app that turns everyday notes into **AI weekly insights** —
mood trends, recurring themes, wins/challenges, patterns, and gentle suggestions.

Built with **Next.js (App Router) + React + libSQL/SQLite**, styled with a custom design
system. Deployable to serverless (Vercel + Turso) or self-hosted with zero external
services.

---

## ✨ Features

- **Authentication** — sign up, log in, log out (salted scrypt hashes + httpOnly session
  cookies). Protected routes redirect to `/login`.
- **Dashboard** (`/`) — greeting, weekly stat tiles, a Mon–Sun "this week" tracker, a
  latest-review preview, and recent entries. Clean sidebar navigation.
- **Journal** (`/journal`) — full CRUD for notepad entries (title, body, date, optional
  mood tag). Search + mood filter, read/edit/delete, **optimistic updates** (entries
  appear instantly and roll back on failure).
- **AI weekly analysis** — the AI reads a week of entries and produces a structured
  report (summary, mood trend, themes, wins, challenges, patterns, suggestions).
- **Insights** (`/insights`) — a visual view of every generated weekly review, plus a
  one-click **Generate / Regenerate** button with a staged loading state.
- **Settings** (`/settings`) — account, AI-engine status, and your data summary.
- Empty states, skeleton loading states, optimistic CRUD, fully responsive UI.

---

## 🚀 Running it locally

```bash
npm install
npm run dev            # development  → http://localhost:3000
# or
npm run build && npm start            # production
```

No configuration is required — with no env vars the app uses a local SQLite file in
`./data/app.db` and the built-in offline AI engine.

### Log in with the seeded demo

The app seeds a realistic demo account on first run so it feels alive immediately:

| Email | Password |
| ----- | -------- |
| `demo@dailyreview.app` | `demo1234` |

Tap the **"✨ Try the demo"** pill on the login page to auto-fill. The demo account has
~28 days of journal entries across several weeks plus three pre-generated weekly reports.

---

## 🧠 How the AI analysis works

Weekly reviews are generated behind a single provider-agnostic interface:

- **Default (no config):** a built-in **local lexical engine** (`lib/ai/analysis.js`) does
  sentiment analysis, theme detection, mood averaging and pattern discovery entirely
  on-device. No account, no API key, no network calls.
- **Swap in a real LLM later:** set env vars and the same endpoint returns LLM-authored
  reports without any other code changes (an OpenAI-compatible provider is included at
  `lib/ai/openai-provider.js`).

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Reports are persisted to the database, so insights survive refreshes and logouts.

---

## ☁️ Deployment

The app talks to the database through **libSQL**, which works both as a local file and as
a hosted Turso database — so the same code runs in both places.

> **Why not plain SQLite on Vercel?** Vercel's filesystem is ephemeral and read-only at
> runtime, so file-based writes reset on every deploy/restart. A hosted database (or a
> host with a persistent disk) is required.

### Option A — Vercel + Turso (serverless)

1. **Create a Turso database** (free tier):
   ```bash
   turso db create daily-life-review
   turso db show daily-life-review --url        # → libsql://...
   turso db tokens create daily-life-review     # → token
   ```
2. **Deploy to Vercel** and set these environment variables (Project → Settings → Env
   Vars, for *all* environments):
   ```
   TURSO_DATABASE_URL = libsql://<your-db>.turso.io
   TURSO_AUTH_TOKEN   = <your-token>
   ```
3. **Create the schema** (run once, from your machine, with the same env vars set):
   ```bash
   npm run db:push
   ```
4. Redeploy if needed — the first request seeds the demo account automatically.

### Option B — Render / Railway / Fly.io (self-hosted, no external DB)

These hosts support a **persistent disk**, so the local SQLite file works as-is.
A ready-made blueprint is included:

1. Push to GitHub.
2. Render dashboard → **New + → Blueprint** → select the repo (uses `render.yaml`).
3. The blueprint mounts a 1 GB disk at `/var/data` and sets `DATA_DIR=/var/data`.

`Dockerfile` is also included for Fly.io / any container host:

```bash
docker build -t daily-life-review .
docker run -p 3000:3000 -v dlr-data:/var/data daily-life-review
```

---

## 🗂 Project layout

```
daily-life-review/
├─ app/
│  ├─ layout.jsx                # root layout (fonts, metadata)
│  ├─ globals.css               # design system
│  ├─ (app)/                    # authenticated group (sidebar shell)
│  │  ├─ layout.jsx             # auth gate + Shell
│  │  ├─ page.jsx               # Dashboard
│  │  ├─ journal/page.jsx       # Journal CRUD
│  │  ├─ insights/page.jsx      # Weekly reviews + generate
│  │  └─ settings/page.jsx      # Settings
│  ├─ login/, signup/           # public auth pages
│  ├─ api/…                     # route handlers (auth, entries, reports, system)
│  └─ components/               # UI + client components/hooks
├─ lib/
│  ├─ db.js                     # libSQL client + schema (local file or Turso)
│  ├─ store.js                  # async data access
│  ├─ auth.js / session.js      # hashing + session cookies
│  ├─ dates.js / moods.js       # helpers
│  ├─ seed.js                   # demo data + pre-generated reports
│  └─ ai/                       # analysis engine + provider interface
├─ scripts/db-push.mjs          # provision schema on a remote Turso DB
├─ Dockerfile / render.yaml     # self-hosted deployment
└─ instrumentation.js
```

Local data lives in `data/app.db`; delete it to reset to a fresh seed.
