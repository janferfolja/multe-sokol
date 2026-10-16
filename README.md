# Multe Sokol 🦅

Hall of Shame for the team's fines. Anyone with the link can look; admins log in with email + password to add fines, mark them paid, and manage players and fine types.

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
4. Create each admin's login: **Authentication → Users → Add user → Create new user**, enter email + password and tick **Auto Confirm User** (no email is sent). Then allow them to write (SQL Editor):
   ```sql
   insert into public.admins (email) values ('you@example.com');
   ```
5. Recommended: **Authentication → Sign In / Providers → Email**: turn off **Allow new users to sign up**, so only accounts you create can log in.
6. **Project Settings → API**: copy the *Project URL* and the *anon public* key.

### 2. GitHub
1. Push this folder to a new repo.
2. **Settings → Pages → Source:** GitHub Actions.
3. **Settings → Secrets and variables → Actions → Variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The anon key is meant to be public; the database's row-level security does the protecting.
4. Push to `main`. The workflow builds and deploys.

For local development against the real database, copy `.env.example` to `.env.local` and fill it in.

## Daily use

- **Admin → Nove multe:** pick a date and a fine type, tap every player who earned it, then press *Dodaj*. *Zadnje dodane* lets you undo mistakes.
- **Admin → Plačila:** *Vse plačano* settles a player in one go, or tick individual fines and mark them paid.
- **Admin → Uredi multe:** edit, un-pay or delete any fine.
- **Admin → Igralci / Vrste mult:** add players or fine types and change prices. A price change only affects new fines; each fine keeps the amount it was given with.

Adding another admin later: create their user in **Authentication → Users** (Auto Confirm) and run the `insert into public.admins …` line. Each admin can change their password from the admin panel (*Spremeni geslo*). A forgotten password can be reset by another admin from the same Users page.

## Notes

- Seasons run July → June. The leaderboard defaults to the latest season that has fines, and "Tutte" shows all time. *Da recuperare* always lists every unpaid fine.
- `scripts/import-legacy.mjs` regenerates `supabase/seed.sql` and the demo data from the old site's JSON in `seed/`.
