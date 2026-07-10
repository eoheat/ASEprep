# DEPLOY.md — deploying ase-prep

Two tiers. **Tier 1 needs zero credentials** and gets the full study tool live in
~10 minutes. Tier 2 adds login + cross-device progress sync (the M7 backend) and
is optional — add it later.

> Status note: the Tier-2 sync features are still being wired into the app (M7 in
> progress). Until that lands, deploy **Tier 1** — the app is fully functional on
> a single device (progress is saved in that browser's local storage). The five
> Tier-2 environment variables only become *required* once the auth/DB code is
> merged.

---

## Tier 1 — Get the site live (no credentials)

Everything works on Tier 1: the 26 summaries, every coding workspace (Pyodide +
Monaco are self-hosted, so no CDN needed), and the timed auto-graded exams.
Progress is stored per-browser in local storage.

### 1. Put the code on GitHub

1. Go to **github.com/new** → Repository name `ase-prep`. **Leave "Add a README",
   ".gitignore", and "license" all unset** — you already have a local repo, and
   initializing any of these makes your first push get rejected.
2. Click **Create repository**. On the "…push an existing repository" page, copy
   the repo URL (HTTPS looks like `https://github.com/<you>/ase-prep.git`).
3. In your terminal, in the project folder:
   ```bash
   git remote add origin https://github.com/<you>/ase-prep.git
   git push -u origin master
   ```
   ⚠️ The branch is **`master`**, not `main` — GitHub's on-screen snippet says
   `main`; use `master`.
4. **First-push auth** (GitHub doesn't accept your account password over HTTPS) —
   pick one:
   - **GitHub CLI (easiest):** `brew install gh` → `gh auth login` (choose
     GitHub.com → HTTPS → login with browser) → `gh auth setup-git`. Then push.
   - **Personal access token:** when `git push` asks for a "password", paste a
     token instead. Create one at github.com → Settings → Developer settings →
     Personal access tokens. A **fine-grained** token needs
     **Contents: Read and write** on this repo; a **classic** token needs the
     **`repo`** scope. Copy it immediately (shown once).
   - **SSH:** `ssh-keygen -t ed25519`, add the `.pub` at Settings → SSH and GPG
     keys, and use the `git@github.com:...` remote URL.

### 2. Deploy on Vercel

1. Go to **vercel.com** → **Sign up** → **Continue with GitHub**. Choose the free
   **Hobby** plan (personal, non-commercial — matches this tool).
2. **Add New… → Project** → find `ase-prep` → **Import**. (If it's not listed,
   click **Adjust GitHub App Permissions** and grant access to the repo.)
3. On "Configure Project": the **Framework Preset** auto-detects as **Next.js**.
   Leave everything at defaults (the build command runs `npm run build`, which
   vendors Pyodide + Monaco into `/public`, then builds). **No environment
   variables are needed.** Click **Deploy**.
4. ~1–3 min later you get a live URL like `https://ase-prep-xxxx.vercel.app`.
   **That's the whole app, live.**
5. **Set the production branch to `master`:** Project → **Settings → Git** →
   Production Branch → `master`. Otherwise future pushes to `master` won't
   auto-deploy (Vercel defaults to `main`).

---

## Tier 2 — Add login + cross-device sync (optional, after M7 is wired)

This adds GitHub sign-in (locked to just you) and stores your progress in a
Postgres database so it follows you across devices. **Do these in this order** —
some steps depend on earlier ones.

### The five values and where each comes from

| Env var | Where to get it |
|---|---|
| `DATABASE_URL` | **Neon** — see A below |
| `AUTH_GOOGLE_ID` | **Google Cloud OAuth client** — Client ID (see B) |
| `AUTH_GOOGLE_SECRET` | **Google Cloud OAuth client** — Client secret (see B) |
| `AUTH_SECRET` | Generate it yourself (see C) |

### A. `DATABASE_URL` — Neon (free serverless Postgres)

1. **neon.tech** → **Sign up** (GitHub/Google/email) → you land in the Neon Console.
2. Create a **Project** (name it `ase-prep`; default database `neondb`; pick a
   nearby region). Click **Create project**.
3. On the project dashboard click the **Connect** button → the **"Connect to your
   database"** modal opens (older docs call this "Connection Details").
4. Leave **Connection pooling ON** and copy the connection string. It looks like:
   ```
   postgresql://user:pass@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   Keep the `?sslmode=require` (Neon requires SSL). That whole string is
   `DATABASE_URL`.

### B. `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` — a Google Cloud OAuth client

> Do this **after** the Vercel deploy — you need the app URL for the redirect URI.
> Access is **open**: anyone with a Google account can sign in and gets their own
> progress (the app separates users in the database).

1. **console.cloud.google.com** → project menu (top bar) → **New Project** → name
   it `ase-prep` → **Create**, then select it.
2. **APIs & Services → OAuth consent screen** → **External** → fill the app name +
   your email in the support/developer fields → Save. To let *anyone* sign in,
   **Publish app** ("In production"). We only request basic `email`/`profile`, so
   no Google verification review is required — the first time, users may see an
   "unverified app" screen and click **Advanced → Go to ase-prep**. (Or leave it
   in **Testing** and add each person under *Test users* — no warning, capped at 100.)
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** →
   Application type **Web application**. Under **Authorized redirect URIs** add
   BOTH (Google allows several on one client, so it works in prod *and* locally):
   - `https://<your-app>.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
4. **Create** → copy the **Client ID** (ends `.apps.googleusercontent.com`) =
   `AUTH_GOOGLE_ID`, and the **Client secret** = `AUTH_GOOGLE_SECRET`.

### C. `AUTH_SECRET` — generate one

```bash
openssl rand -base64 32
```
(I already generated one for you and will put it in `.env.local`; you can also use
your own.)

### Put them in Vercel + redeploy

1. Vercel → Project → **Settings → Environment Variables** → add all four for
   **Production** (and **Preview**).
2. **Redeploy** — env-var changes are not retroactive: Deployments → latest → **⋯
   → Redeploy**. Only after this does auth/sync take effect.
3. **Apply the DB schema** (creates the 5 tables — the migration exists but hasn't
   been run against your Neon DB yet):
   ```bash
   DATABASE_URL="<your neon string>" npm run db:migrate
   ```
   (When we wire M7, I'll run this for you once you share `DATABASE_URL`.)

### Local development (Tier 2)

Create `.env.local` (gitignored) with the same four vars. Google OAuth clients
allow **multiple** redirect URIs, so the single client above — with both the Vercel
and `localhost:3000` callbacks — works for local dev too; no second app needed.

---

## Gotchas checklist

- Branch is **`master`** — push `master`, and set Vercel's Production Branch to
  `master`.
- Don't initialize the GitHub repo with a README/.gitignore/license.
- GitHub HTTPS auth = token or `gh`, never your account password.
- Google sign-in is **open** — anyone with a Google account can use the app.
- The redirect URI must be **byte-exact**; a Google client accepts several, so add
  both the Vercel and `localhost:3000` callbacks to the one client.
- After changing any Vercel env var, **redeploy**.
- Neon: use the **pooled** string (`-pooler` in the host) and keep
  `?sslmode=require`; wrap it in quotes in `.env` (it contains `@ / ? &`).
- **Never commit secrets** — `.env` and `.env*.local` are gitignored; only
  `.env.example` (the template) is committed.
- NextAuth v5 auto-reads `AUTH_SECRET` / `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
  by name — don't rename to v4 forms (`NEXTAUTH_SECRET`).
