# Kijani · Vercel Hobby private dummy-data staging

**Read `DEPLOY_STEP_BY_STEP.md` before uploading anything.** This is a new Vercel-compatible **Node.js demonstration**, not an unchanged deployment of the earlier Python/SQLite server or the old view-only Node server. It is intended for your **personal non-commercial technical test only** on Vercel Hobby. Do not send links/QRs to business owners or collect real customer information from this staging project.

## What works in this source

- Vercel Node Function (`api/index.mjs`), public category artwork/posters under `public/`, and **owner-authenticated byte-range streaming of both films** from `data/private_media/` in the Function bundle. No MP4 is publicly served as a static asset.
- Three-mall, **468-business / 20-category** public-safe catalogue; business types and subthemes; no real business contact list in this upload. The approved manual owner copy, owner film, and separately supplied salon/spa social film/caption are retained.
- Individual business sign-in via the **matching existing private master-key / 468-phrase pair**, plus a separate operator PIN. Owner sessions see only their business; the operator Studio sees the catalogue. All actual Vercel deployments must also have **Vercel Authentication → All Deployments** enabled before use.
- Interactive simulated social → simulated DM → **dummy name + email + all-zero phone before questions** → six category-aligned prompts → server-evaluated answer-derived **free downloadable PDF** → optional unsent/unconfirmed action → private business-only demo record. Separate marketing checkbox. No external message, appointment confirmation, payment, live AI response or fabricated performance result. A separate three-question Nina FAQ gives scripted answers only from the listed mall and generated report; it never invents prices or availability.
- Dummy records saved in a **private Vercel Blob store**. No local SQLite or `/tmp` database on Vercel. No server-generated PDF is saved as a public static file; it is generated for a signed-in owner/operator from the private record.

## Key boundaries

This is **not feature-for-feature migration of the Python engine**. The 20 category question sets were exported from the local prototype into `data/blueprints.json`, and a small Vercel-native rule-based report/record layer was implemented in `lib/`. Production marketing integrations, the original Python Studio editor, real business contacts, AI replies, real CRM, verified appointment availability, consent/retention operations for real people, and owner-identity verification are **not** deployed. The Python prototype and previous downloads should be kept. Draft-category questions are labelled draft and must be reviewed for public use. Reports are exploratory, not diagnoses or suitability tests.

The business catalogue contains real *business names* but no real *customer details*. The UI and server require reserved example emails, a `Demo` name and an all-zero phone; the storage/retention design is only appropriate for an isolated personal test. Do not turn off Vercel Authentication for owner outreach on Hobby. The owner phrase is a demo access phrase, not proof of legal ownership. The films are kept out of the static output and require an authenticated owner or operator session; the outer Vercel All Deployments protection still restricts the entire site to you during this personal stage.

## Source-file checklist

- `vercel.json` – Other framework; only `public/` served statically; Node Function rewrites and headers.
- `api/index.mjs` – actual Vercel Function entrypoint; **not** `dev-server.mjs`.
- `lib/router.mjs`, `access.mjs`, `owner_access.mjs`, `store.mjs`, `report.mjs`, `pdf.mjs`, `media.mjs`, `views.mjs` – server logic and page rendering.
- `data/businesses.json`, `data/blueprints.json` – presentation catalogue and question sets; no contacts, customers, keys or passwords.
- `data/private_media/` – both supplied MP4s; included in the Function bundle and served via signed-in `/media/...` routes only. They are NOT in Vercel's public static directory.
- `public/assets/` – video posters, 20 category images and the customer-journey script; `public/robots.txt` discourages indexing.
- `package.json`, `package-lock.json` – exactly pinned dependencies; Vercel installs them automatically.
- `tests/demo.test.mjs` – Node integration tests. Run `npm install && npm test` if you have Node 22 locally (the version selected for Vercel). Vercel does **not** require you to install Node on your own computer.
- `dev-server.mjs` – strictly localhost-only, in-memory developer preview; not used by Vercel.
- `scripts/issue_access.mjs` – **optional** one-time local generator for new credentials if you do not use the existing private matching key/phrase pair. Never run it just to change a password after issuing an access phrase.

**Never upload:** `Kijani_Vercel_Demo_Secrets_PRIVATE.env`, `Kijani_ViewOnly_Individual_Phrases_PRIVATE.csv`, `prototype/data/engine.db`, `Prospect_Contact_List.csv`, previous owner QR/access CSVs, PDFs, or `node_modules/`.

No GitHub push, Vercel import, Blob store, deployment, DNS change, customer contact, or QR issuance has been performed on your accounts. Verify the deployed site yourself using the checklists in `DEPLOY_STEP_BY_STEP.md`. The official website at <https://www.kijani.solutions/business> is not modified.
