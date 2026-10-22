# WINON CAR

Car-rental website for **Agadir, Morocco** (airport & city delivery), built on
**Cloudflare Pages** with **Cloudflare Pages Functions** (serverless API) and a
**Cloudflare D1** SQLite database.

The site is multilingual (French / English / Arabic) and takes reservations via
WhatsApp. An admin dashboard manages the vehicle catalogue, reservations, users,
and analytics.

---

## Quick map (repository root)

```text
winoncar/                         <- git repository root (NOT the deploy root)
├── WINON CAR/                    <- THE APPLICATION — Cloudflare Pages root dir
├── docs/
│   └── PROJECT_STRUCTURE.md      <- detailed structure of the application
├── README.md                     <- this file
│
├── backups/                      <- historical backups (NOT deployed) — see below
├── sandbox_restore_test/         <- restore-test sandbox & scripts (NOT deployed)
├── sandbox_stage2/               <- migration/API test scripts (NOT deployed)
├── backup_winon_car_production_2026-10-17.zip   <- production backup archive
├── winon-logo.jpeg               <- stray copy at repo root (see note)
└── winon-logo.jpeg.jpeg          <- stray copy at repo root (see note)
```

> **Important:** The deployable application is the **`WINON CAR/`** folder, not the
> repository root. Cloudflare Pages is configured with that folder as its
> **root directory**, and `wrangler.toml` inside it sets
> `pages_build_output_dir = "."`. Everything outside `WINON CAR/` is history,
> backups, or local test tooling and is **not** part of the deployed site.

---

## The application — `WINON CAR/`

| Path | What it is |
|------|------------|
| `index.html` | **Public landing page** (hero, vehicle catalogue, WhatsApp reservation) |
| `admin/index.html` | **Admin dashboard** (login-protected management UI) |
| `assets/translations.js` | Multilingual dictionary (FR / EN / AR) |
| `assets/analytics.js` | Privacy-preserving visit beacon |
| `assets/cars/*.jpg` | Vehicle photos |
| `winon-logo.jpeg` | Logo / favicon |
| `functions/api/` | Serverless API routes (Cloudflare Pages Functions) |
| `migrations/` | D1 database migrations `0001`–`0005` (source of truth) |
| `schema.sql` | Convenience snapshot of the schema |
| `scripts/seed_admin.mjs` | Seeds the initial admin user |
| `wrangler.toml` | Cloudflare config + D1 binding (`DB`) |
| `_headers` | Cloudflare Pages caching & security headers |

A full breakdown — every page, API route, and asset — is in
[`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md).

---

## Run & deploy (existing setup — unchanged)

All commands run from inside the `WINON CAR/` folder:

```bash
cd "WINON CAR"

# Local development (serves pages + functions, binds a local D1 database)
npx wrangler pages dev .

# Apply database migrations locally
npx wrangler d1 migrations apply winon-car-db --local

# Apply database migrations to production (remote)
npx wrangler d1 migrations apply winon-car-db --remote

# Seed the initial admin user (see scripts/seed_admin.mjs for usage)
node scripts/seed_admin.mjs

# Deploy (or let Cloudflare Pages auto-deploy from git)
npx wrangler pages deploy .
```

> Cloudflare Pages typically auto-deploys on push. If you deploy manually,
> make sure the **root directory** is set to `WINON CAR`.

---

## Historical & local-only folders (kept, not cleaned up on purpose)

These were **deliberately left untouched** — they are backups or local recovery
test tooling, and moving/deleting them could break a recovery procedure or a
test script that relies on relative paths. They are safe to ignore for normal
development.

| Folder / file | Purpose |
|---------------|---------|
| `backups/` | Zip + a full pre-phase-3 snapshot of the app |
| `backup_winon_car_production_2026-10-17.zip` | Dated production backup |
| `sandbox_restore_test/` | Local `.sqlite` databases + restore-verification scripts |
| `sandbox_stage2/` | `.mjs` scripts used to test migrations/APIs locally |
| `winon-logo.jpeg`, `winon-logo.jpeg.jpeg` (repo root) | Stray logo copies at the repo root. They appear to duplicate `WINON CAR/winon-logo.jpeg` and are not required for deployment. Left in place per a "do not delete" policy — remove manually if you confirm they are unused. |

See [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md) for more detail on why
these were not reorganized.
