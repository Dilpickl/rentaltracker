# Rent Tracker

A mobile-first web app for landlords to answer one question at a glance: **Who owes me money right now?**

Built with React (Vite) and Supabase. Designed to be saved to a phone home screen and used with big taps and clear color status.

## Features (v1)

- Home list of tenants with green / yellow / red status badges
- Monthly collection summary: collected vs expected
- Tenant detail with **Mark as Paid** and payment history
- Add / edit tenant (name, unit, rent, due day)
- Record payment (amount + date; auto **Partial** if under full rent)
- No login — single-user app using the Supabase anon key

## Quick start

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Open **SQL Editor** → New query.
3. Paste and run the contents of [`supabase/schema.sql`](supabase/schema.sql).

### 2. Configure environment variables

1. In Supabase: **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. In this repo:

```bash
cp .env.example .env.local
```

4. Edit `.env.local`:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`) on your phone or browser.

## Status logic

Billing periods are anchored to each tenant’s **due day**, not just the calendar month name:

- A period runs from the day after the previous due date through the due date
- Payments in that window count toward that period only
- After the due date, unpaid tenants stay **Overdue** until the next due date — then the app rolls forward automatically
- A payment from a previous period does **not** keep them “Paid” in the new period

| Badge | Meaning |
| --- | --- |
| **Paid** (green) | Full rent recorded for the current billing period |
| **Due soon** (yellow) | Not fully paid, and the due date is within the next **5 days** |
| **Overdue** (red) | Due date has passed with no full payment for this period |
| **Upcoming** (slate) | Not fully paid, but due date is more than 5 days away |

Partial payments reduce the remaining balance. Status stays Due soon / Overdue / Upcoming until the period is fully covered.

To change the “due soon” window, edit `DUE_SOON_DAYS` in [`src/types.ts`](src/types.ts).

If you already created the tables earlier, re-run the bottom **Migration** section of [`supabase/schema.sql`](supabase/schema.sql) to add the `archived` column.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Framework preset should detect **Vite**.
4. Add environment variables in the Vercel project settings (same names as `.env.local`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy.

After deploy, on your phone:

- **iPhone (Safari):** Share → **Add to Home Screen**
- **Android (Chrome):** Menu → **Add to Home screen** / **Install app**

## Security note (v1)

This build skips auth on purpose. Row Level Security is open to the anon key so one landlord can use the app from any device.

That means anyone who has your Supabase URL + anon key can read and write your data. Fine for a private personal tool; **not** fine if the keys are posted publicly or you later need multiple users. Add Supabase Auth (or similar) before sharing the app with others.

## Project structure

```
src/
  screens/          Home, tenant detail, add/edit, record payment
  components/       Shared UI (screen chrome, status badge)
  lib/              Supabase client, status math, data hook
supabase/
  schema.sql        Tables + permissive RLS policies
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
