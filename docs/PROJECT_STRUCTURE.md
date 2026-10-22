# WINON CAR — Project Structure

This document explains how the project is organized, where each page lives, how
the API is laid out, and which parts are production vs. historical.

It is **descriptive**: it documents the project as it actually is. No production
files were moved or renamed, so every path below is real and current.

---

## 1. Two different "roots"

There are two roots and it is important not to confuse them:

| Root | What it is |
|------|------------|
| **Repository root** — `winoncar/` | The git repo. Contains the app **plus** backups and local test tooling. |
| **Application / deploy root** — `WINON CAR/` | What Cloudflare Pages actually builds and serves. `wrangler.toml` here sets `pages_build_output_dir = "."`. |

Only files **inside `WINON CAR/`** are deployed to the live site.

---

## 2. Application structure (`WINON CAR/`)

```text
WINON CAR/
├── index.html                 # Public landing page (/)
├── admin/
│   └── index.html             # Admin dashboard (/admin)
│
├── assets/                    # Static front-end assets
│   ├── translations.js        # i18n dictionary (FR / EN / AR)
│   ├── analytics.js           # Privacy-preserving visit beacon
│   └── cars/                  # Vehicle photos (*.jpg)
│
├── functions/                 # Cloudflare Pages Functions (serverless API)
│   └── api/
│       ├── vehicles.js        # GET /api/vehicles     (public catalogue)
│       ├── reservations.js    #     /api/reservations (public: create reservation)
│       │
│       ├── analytics/
│       │   └── visit.js       #     /api/analytics/visit
│       │
│       ├── auth/              # Authentication
│       │   ├── login.js       #     /api/auth/login
│       │   ├── logout.js      #     /api/auth/logout
│       │   ├── me.js          #     /api/auth/me
│       │   └── _crypto.js     #     (shared password/crypto helper — not a route)
│       │
│       └── admin/             # Admin-only API (protected)
│           ├── _middleware.js #     Auth guard for everything under /api/admin/*
│           ├── analytics.js   #     /api/admin/analytics
│           ├── audit-logs.js  #     /api/admin/audit-logs
│           ├── change-password.js # /api/admin/change-password
│           ├── reservations.js    # /api/admin/reservations
│           ├── users.js       #     /api/admin/users
│           ├── vehicles.js    #     /api/admin/vehicles
│           └── vehicles/
│               ├── add.js     #     /api/admin/vehicles/add
│               ├── update.js  #     /api/admin/vehicles/update
│               └── delete.js  #     /api/admin/vehicles/delete
│
├── migrations/                # D1 database migrations (source of truth)
│   ├── 0001_initial_reservations.sql
│   ├── 0002_auth_and_management.sql
│   ├── 0003_locations_and_delivery.sql
│   ├── 0004_client_documents.sql
│   └── 0005_visitor_analytics.sql
├── migrations_archive/        # Old rollback SQL for 0003–0005 (historical)
├── rollback/                  # Rollback SQL for 0002 (historical)
├── schema.sql                 # Convenience snapshot of the schema
│
├── scripts/
│   └── seed_admin.mjs         # Seed the initial admin user
│
├── wrangler.toml              # Cloudflare config + D1 binding (DB = winon-car-db)
├── _headers                   # Cloudflare Pages caching & security headers
└── winon-logo.jpeg            # Logo / favicon
```

---

## 3. Pages

| URL | File | Audience | Purpose |
|-----|------|----------|---------|
| `/` | `index.html` | Public | Landing page: hero, multilingual UI, vehicle catalogue (loaded live from `/api/vehicles`), reservation flow via WhatsApp. |
| `/admin` | `admin/index.html` | Staff | Dashboard to manage vehicles, reservations, users, passwords, and view analytics/audit logs. Talks to the `/api/admin/*` and `/api/auth/*` routes. |

### How the landing page is built
- **Styling:** Tailwind CSS via CDN + a small inline `<style>` block (there is no
  separate `.css` file to maintain).
- **Scripts:** `assets/translations.js` (languages) and `assets/analytics.js`
  (visit beacon), both loaded from `assets/`.
- **Data:** vehicle cards are fetched at runtime from `GET /api/vehicles`
  (Cloudflare D1), not hard-coded.
- **Reservations:** submitted through `/api/reservations` and/or WhatsApp.

---

## 4. API routes (Cloudflare Pages Functions)

Routing is **file-based**: a file at `functions/api/foo/bar.js` serves the URL
`/api/foo/bar`. Files beginning with `_` (e.g. `_crypto.js`, `_middleware.js`)
are **not** routes — they are shared helpers / middleware.

- **Public:** `/api/vehicles`, `/api/reservations`, `/api/analytics/visit`
- **Auth:** `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- **Admin (protected by `functions/api/admin/_middleware.js`):**
  `/api/admin/analytics`, `/api/admin/audit-logs`, `/api/admin/change-password`,
  `/api/admin/reservations`, `/api/admin/users`, `/api/admin/vehicles`,
  `/api/admin/vehicles/add|update|delete`

---

## 5. Database (Cloudflare D1)

- Binding name: **`DB`** → database **`winon-car-db`** (see `wrangler.toml`).
- Schema evolves through the numbered files in **`migrations/`** — this is the
  source of truth. `schema.sql` is only a convenience snapshot.
- `migrations_archive/` and `rollback/` contain older rollback SQL kept for
  history.

Apply migrations:

```bash
cd "WINON CAR"
npx wrangler d1 migrations apply winon-car-db --local    # local
npx wrangler d1 migrations apply winon-car-db --remote   # production
```

---

## 6. Historical / local-only material (not deployed, left in place)

Everything below lives at the **repository root**, outside `WINON CAR/`, and is
**not** part of the deployed site. It was deliberately **not** moved, renamed, or
deleted, to avoid breaking backup/recovery procedures or test scripts that depend
on their current relative paths.

| Item | Purpose | Why left untouched |
|------|---------|--------------------|
| `backups/` | Zip + full pre-phase-3 snapshot of the app | A relocation could invalidate a documented restore step. |
| `backup_winon_car_production_2026-10-17.zip` | Dated production backup | Same — treat as an archive. |
| `sandbox_restore_test/` | Local `.sqlite` DBs + restore-verification scripts | Scripts reference sibling files by relative path; moving them could break the test. |
| `sandbox_stage2/` | `.mjs` scripts testing migrations/APIs locally | Same relative-path risk. |
| `winon-logo.jpeg`, `winon-logo.jpeg.jpeg` (repo root) | Stray logo copies | They appear to duplicate `WINON CAR/winon-logo.jpeg` and are not needed for deployment, but were kept under a strict "do not delete" policy. Remove manually only after confirming they are unused. |

**Recommendation (optional, not done here):** if you later confirm these are safe
to archive, you can move the four historical folders/zip into a single
`archive/` folder at the repo root and delete the duplicate root logos. This was
intentionally left as a manual decision because it can affect recovery.

---

## 7. Why the structure was left mostly as-is

The application already follows the structure Cloudflare Pages expects:

- `index.html` at the deploy root,
- `functions/api/...` for file-based API routing,
- `_headers`, `wrangler.toml`, and `migrations/` in their required locations.

Reorganizing those (e.g. inventing `css/` or `js/` folders, or renaming the
`WINON CAR` deploy folder) would risk breaking routing and the Cloudflare
**root-directory** setting for **no functional gain**. The cleanup therefore
focused on **documentation and clarity**, leaving all production paths and the
landing page behavior exactly as they were.
