# RubinOT Boss Tracker

Track boss spawns and kill statistics across all 14 RubinOT game worlds.

Built with Next.js 15 (App Router), PostgreSQL, Prisma, ShadCN UI, Framer Motion, and Recharts.

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** running locally or on your VPS

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the database

Copy the example env file and edit it with your PostgreSQL credentials:

```bash
cp .env.example .env
```

Edit `.env` — the `DATABASE_URL` should look like:

```
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/boss_tracker?schema=public"
```

If you don't have a `boss_tracker` database yet, create it:

```bash
# Connect to PostgreSQL and create the database
psql -U postgres -c "CREATE DATABASE boss_tracker;"
```

### 3. Run the database migration

This creates the `KillRecord` table in your database:

```bash
npx prisma migrate dev --name init
```

You should see output like:

```
Applying migration `20260227_init`
The following migration(s) have been created and applied from new schema changes:
  migrations/20260227_init/migration.sql
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dashboard will show all 126 tracked bosses with zero kills (since you haven't scraped yet).

---

## Scraper

The scraper uses **Puppeteer** (headless Chrome) to fetch data from the RubinOT API. A headless browser is required because the API is behind Cloudflare protection and requires cookies from the main site.

### Test the API connection (no database needed)

This command fetches data for one world and prints results to the terminal — no database required:

```bash
npm run scrape:test
```

Expected output:

```
--- RubinOT API Test (Puppeteer + Stealth) ---
World: Elysian (id: 1)
...
Total creatures returned: 1499
Tracked bosses found: 62 / 126

Sample boss entries (first 10):
Boss Name                      | 24h Kills | 7d Kills
-------------------------------+-----------+----------
Acolyte of Darkness            |         0 |       28
Bakragore                      |         3 |       17
...
```

### Run the full scraper (requires database)

Make sure your database is set up first (steps 2-3 above), then:

```bash
npm run scrape
```

This fetches all 14 worlds and saves the data to PostgreSQL. Expected output:

```
Starting scrape for Tibia Day: 2026-02-27
Establishing session on rubinot.com.br...
Session established.

[OK] Elysian — 62 bosses synced
[OK] Lunarian — 58 bosses synced
...
Scrape complete.
```

### Set up a cron job (VPS)

Run the scraper every 30 minutes:

```bash
crontab -e
```

Add this line:

```cron
*/30 * * * * cd /path/to/boss-tracker-vps && /usr/bin/npm run scrape >> /var/log/boss-scraper.log 2>&1
```

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — boss kill table for a selected world |
| `/boss/[name]` | Boss history — kill chart over time (Recharts) |
| `/compare` | World comparison — compare a boss across all worlds |

## API Routes

| Endpoint | Description |
|----------|-------------|
| `GET /api/kills?worldId=1&date=YYYY-MM-DD` | Kill data for a world on a date |
| `GET /api/boss/{name}?worldId=1&days=30` | Boss kill history over N days |
| `GET /api/compare?boss=Ferumbras&date=YYYY-MM-DD` | Cross-world comparison |

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run scrape` | Run the scraper (fetches all 14 worlds, saves to DB) |
| `npm run scrape:test` | Test API connectivity (no DB required) |

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Styling:** Tailwind CSS + ShadCN UI + BEM CSS
- **Animations:** Framer Motion
- **Charts:** Recharts
- **Scraper:** Puppeteer (headless Chrome) with stealth plugin
