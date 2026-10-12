# Multe Sokol 🦅

Hall of Shame for the team's fines. Anyone with the link can look; admins log in by email to add fines, mark them paid, and manage players and fine types.

- **Frontend:** Vite + React, deployed to GitHub Pages
- **Data:** Supabase (Postgres). Everyone can read, only emails in the `admins` table can write. This is enforced by the database, not just the UI.

## Run locally

```bash
npm install
npm run dev
```

Without Supabase keys the app runs in **demo mode**: it uses the imported data and saves changes only in your browser. Any email works for the admin login.

## One-time setup (~10 minutes)

### 1. Supabase
1. Create a free project at <https://supabase.com>.
2. **SQL Editor** → paste `supabase/schema.sql` → Run.
3. **SQL Editor** → paste `supabase/seed.sql` → Run. This imports last season's 213 fines, 33 players and 27 fine types.
4. Add the admins (SQL Editor):
   ```sql
   insert into public.admins (email) values ('you@example.com'), ('teammate@example.com');
   ```
5. **Authentication → URL Configuration**: set *Site URL* to your Pages URL (e.g. `https://<user>.github.io/multe-sokol/`) and add the same URL under *Redirect URLs*. Also add `http://localhost:5173/` if you want to log in while running locally.
6. **Project Settings → API**: copy the *Project URL* and the *anon public* key.

### 2. GitHub
1. Push this folder to a new repo.
2. **Settings → Pages → Source:** GitHub Actions.
3. **Settings → Secrets and variables → Actions → Variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The anon key is meant to be public; the database's row-level security does the protecting.
4. Push to `main`. The workflow builds and deploys.

For local development against the real database, copy `.env.example` to `.env.local` and fill it in.

## Daily use

- **Admin → Nuove multe:** pick a date and a fine type, tap every player who earned it, then press *Aggiungi*. *Ultime aggiunte* lets you undo mistakes.
- **Admin → Pagamenti:** *Tutto pagato* settles a player in one go, or tick individual fines and mark them paid.
- **Admin → Storico:** edit, un-pay or delete any fine.
- **Admin → Giocatori / Tipi multa:** add players or fine types and change prices. A price change only affects new fines; each fine keeps the amount it was given with.

Adding another admin later is the same `insert into public.admins …` line.

## Notes

- Seasons run July → June. The leaderboard defaults to the latest season that has fines, and "Tutte" shows all time. *Da recuperare* always lists every unpaid fine.
- `scripts/import-legacy.mjs` regenerates `supabase/seed.sql` and the demo data from the old site's JSON in `seed/`.
