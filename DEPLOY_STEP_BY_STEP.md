# Kijani personal demo on Vercel Hobby — every step

**This is a private technical test, not a commercial or real-customer launch.** Do not share the URL or owner access phrases with businesses, publish QR codes, or enter genuine customer details. Vercel's Hobby plan is limited to personal, non-commercial use; this guide deliberately keeps **all deployments behind your own Vercel login**. [1](https://vercel.com/docs/plans/hobby) [2](https://vercel.com/docs/deployment-protection)

## What you have, and what you do not have yet

Prepared here: the **new** `Kijani_Vercel_Private_Demo_GitHub_Source.zip` with a Vercel Node Function, 468-business/20-category catalogue, individual owner pages, social-to-PDF customer journey, tests, both films, private-Blob record code, and authenticated film streaming (not public static MP4s). Your separate `Kijani_Vercel_Demo_Secrets_PRIVATE.env` holds the **matching** existing owner-demo master key and a new operator demo PIN. Your earlier `Kijani_ViewOnly_Individual_Phrases_PRIVATE.csv` contains the 468 matching business sign-in phrases. Neither private file is in the source ZIP.

**Not done here:** logging into GitHub/Vercel, creating a Vercel project or Blob store, uploading the code, deploying, turning on Vercel Authentication, testing a public URL, changing DNS, inviting an owner, or issuing a QR. Do not delete your older Python prototype, PDFs, or view-only ZIP. This Node version reproduces the core **demo** journey and private demo records; it is **not** a feature-for-feature port of the Python/SQLite editor and production CRM.

### Why this implementation differs from the old ZIPs

Vercel Functions do not run a permanently listening `ThreadingHTTPServer`, and their filesystem is not a durable shared SQLite database. This ZIP uses `api/index.mjs` as a Vercel Node Function, keeps the reviewed/draft six-question blueprints in JSON, builds PDFs in the Function, and writes **dummy-only JSON records to a private Vercel Blob store**. The former Node view-only ZIP had no interactive customer path and must not be substituted here. [3](https://vercel.com/docs/functions/runtimes/node-js) [4](https://vercel.com/docs/functions/runtimes) [5](https://vercel.com/docs/vercel-blob/server-upload)

## 1. Keep the three files straight

| File you download from this workspace | What you do with it |
| --- | --- |
| `Kijani_Vercel_Private_Demo_GitHub_Source.zip` | **Extract it.** Upload its *contents* to your **private personal GitHub repository**. It has no secrets. |
| `Kijani_Vercel_Demo_Secrets_PRIVATE.env` | Keep **outside** GitHub. Open locally and copy only its two values into **Vercel server-side Environment Variables**. Do not send it to anyone. |
| `Kijani_ViewOnly_Individual_Phrases_PRIVATE.csv` | Keep **outside** GitHub. It matches the master key above. For now use a matching phrase **yourself** to test one owner sign-in. Do not put it in Canva/QRs. |

The source ZIP already contains `package-lock.json` and all image/video assets. You do **not** need to upload `node_modules` or the original Python project. If either private file is missing, **stop**; do not guess or regenerate only one half of a matching master-key/phrase pair. `npm run issue-access` in the source is an *optional*, one-time generator of a **new pair plus new PIN** on a computer with Node 22, not a routine deployment step.

## 2. Unzip and check the source on your computer

1. Download the **source ZIP**, right-click **Extract All** (Windows) or double-click/extract (Mac). Open the extracted folder.
2. You must see these **at the same top level**: `api/`, `lib/`, `data/`, `public/`, `scripts/`, `tests/`, `package.json`, `package-lock.json`, `vercel.json`, `.gitignore`, `dev-server.mjs`, `README.md`, `DEPLOY_STEP_BY_STEP.md`.
3. In `api/` check `index.mjs`. In `data/` check `businesses.json`, `blueprints.json` and `private_media/` with **both** `kijani-shared-introduction.mp4` and `kijani-beauty-social.mp4`. In `public/assets/` check their two posters, category images and `journey.js`. The MP4s are intentionally **not** public static assets.
4. Do **not** mix this source folder with `Kijani_GitHub_Upload.zip`, `Kijani_AI_Studio_View_Only_GitHub.zip`, a PDF ZIP or your old GitHub root. This is a distinct Vercel project. Check that there is **no** `.env`, phrase CSV, `engine.db`, `Prospect_Contact_List.csv`, prior QR file or `node_modules/` in the folder you intend to upload.

GitHub's browser upload limit is **25 MiB per file**; each bundled video is below it. [6](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)

## 3. Create a new **private personal** GitHub repository

1. Sign in to GitHub as the **same personal GitHub account** linked to your Vercel Hobby account. In GitHub, select **+ → New repository**.
2. Under **Owner**, select your **personal user** (for example, `bizwizdigitals-tech` if that is the user account you control), **not** a GitHub organization. Suggested repository name: `kijani-vercel-personal-demo`. Choose **Private**. Create the repository.
3. In the empty repository select **Add file → Upload files** (or the initial **uploading an existing file** link). Drag the **contents of the extracted source folder**—not the ZIP itself and not an extra enclosing folder—into GitHub. GitHub accepts a dragged folder if your browser supports it. If it does not, upload the top-level files and each subfolder separately, preserving their paths. **Do not upload private files.**
4. Before clicking **Commit changes**, verify GitHub lists `api/index.mjs`, every file in `lib/` and `data/`, and the two MP4s in `data/private_media/`. Commit with a message such as `Add private dummy-data Vercel demo`.
5. On the repo's main page, check that `package.json` and `vercel.json` are at the **repository root**, `api/index.mjs` exists, and both films are real files under `data/private_media/` (not text links or Git LFS pointers). The source is private, but still has **no server secrets**.

Vercel Hobby cannot deploy a **private GitHub organization** repository into a Hobby team; the commit author must match the Hobby team owner. Using a private repository owned by your own personal GitHub user is the safe route. If the Vercel import blocks it, stop rather than making it public. [7](https://vercel.com/docs/git)

## 4. Import on Vercel **without enabling the demo yet**

1. Sign into <https://vercel.com/dashboard> using the Vercel account linked to that personal GitHub user. Stay on **Hobby**; do not accept a Pro trial or checkout. If your **team settings** offer a default Deployment Protection policy for **new projects**, set **Vercel Authentication → All Deployments** *before importing*. The app's first deployment is disabled anyway; films are additionally protected inside the app. Generic posters/artwork may otherwise be briefly static until Step 5. [2](https://vercel.com/docs/deployment-protection)
2. Click **Add New → Project**, select **Import Git Repository**, authorize your personal GitHub account if prompted, and select the **new private demo repository**. Do not select the old incomplete outreach repository.
3. In the import settings, set **Framework Preset: Other**; **Root Directory: `./`** (the repository root); **Output Directory: `public`** (the included `vercel.json` also specifies this); leave **Build Command blank**. Node.js **22.x** is pinned by `package.json` for Vercel. The `api/index.mjs` Function is detected automatically. [8](https://vercel.com/docs/builds/configure-a-build) [9](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
4. If the wizard offers **Environment Variables**, add these two values from your **private** `.env` file, one variable per row:
   - Key `OWNER_DEMO_MASTER_KEY` → paste just the characters **after** `OWNER_DEMO_MASTER_KEY=`.
   - Key `DEMO_ADMIN_PIN` → paste just the characters **after** `DEMO_ADMIN_PIN=`.
   Choose **Production** and **Preview** environments. No quotes or leading/trailing spaces. **Do not add `DEMO_ENABLE` yet.** If the wizard does not offer the variables, add them later at **Project → Settings → Environment Variables**, then redeploy.
5. Click **Deploy**. Save the actual HTTPS project URL shown by **your** Vercel dashboard. The first deployment intentionally displays **“Not ready for testing”** or `/health` with `"ready":false`. This is correct: no storage/protection/enable flag has been set yet. Never use a guessed URL or your official `www.kijani.solutions/business` page for this test.

**Never** paste secrets in `package.json`, `vercel.json`, GitHub, Build Command, JavaScript delivered to browsers, or an AI prompt. If a screen requires a paid plan, checkout, or billing that you did not choose, stop and ask for help.

## 5. Protect **every** Vercel URL, including production

1. In your new **Vercel project**, open **Settings → Deployment Protection**.
2. Enable **Vercel Authentication** and choose **All Deployments**, then **Save**. Do **not** choose Standard Protection alone: that can leave a production domain accessible. All Deployments is available on Hobby; Vercel's project **Password Protection** feature is not. [2](https://vercel.com/docs/deployment-protection) [10](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)
3. Test the project URL in a private/incognito browser **without being signed in to Vercel**. You should be stopped by Vercel's authentication screen or denied—not shown a shop page. Then reopen it in your own signed-in browser. Do **not** create a shareable protection-bypass link.
4. If All Deployments is not available or you cannot confirm that incognito is blocked, **do not move on to `DEMO_ENABLE=1`**. The app will continue to fail closed.

This outer restriction is for *your* personal test. The app's separate operator PIN and per-business phrases add a second boundary, but are **not** a substitute for Vercel Authentication or verified business-owner identity.

## 6. Create and connect **private** durable storage

1. In the Vercel project open **Storage → Create Storage → Blob**. Choose a name such as `kijani-dummy-records`, and select **Private** access, **not Public**. Connect it to this project in **Production** and **Preview**. Vercel creates the store credentials/OIDC environment variables automatically. Do not paste a Blob token into GitHub or browser code. [5](https://vercel.com/docs/vercel-blob/server-upload)
2. Go to **Deployments**, use **Redeploy** for the latest deployment so the newly connected storage variables are present. If a Hobby-free storage option is not offered to you or a payment screen appears, stop rather than upgrading without deciding.
3. To confirm the connection, visit `/health` at your **actual** Vercel URL while signed into Vercel. It will still say `"ready":false` because the enable switch remains off; that is intentional. Do not enter details yet.

**Why private Blob?** Node Functions have no durable shared SQLite filesystem; the demo records must survive deployments. In this project, customer PDFs are generated when downloaded and are never given a public Blob URL. Blob is an object store, **not** the earlier relational CRM; there is no real-user retention or production identity system here. [4](https://vercel.com/docs/functions/runtimes) [11](https://vercel.com/docs/storage)

## 7. Enable the private **dummy-only** demo

1. After **both** All Deployments protection and Private Blob are confirmed, go to **Settings → Environment Variables**. Add `DEMO_ENABLE` with value `1` for **Production** and **Preview**. Check again that `OWNER_DEMO_MASTER_KEY` and `DEMO_ADMIN_PIN` are present in the **server-side** project settings. Do not put any private value in variables prefixed `NEXT_PUBLIC_` or `VITE_`.
2. Go to **Deployments → Redeploy** the latest commit. Environment-variable changes affect **new deployments**, not past deployments.
3. In a browser already signed into **your** Vercel account, open `https://YOUR-ACTUAL-VERCEL-URL/health`. The expected response is JSON including `"ready":true`, `"businesses":468`, `"categories":20`, and `"mode":"personal-dummy-staging"`. Replace `YOUR-ACTUAL-VERCEL-URL` with the literal project URL displayed in your dashboard. **It is only a placeholder here; it has not been issued by me.**
4. If it stays `ready:false`, recheck: secret keys/pin spelling, `DEMO_ENABLE=1`, Blob connected to **Production**, and redeploy. If a build failed, check Vercel **Deployments → failed deployment → Build Logs**; if a request failed, open **Runtime Logs**. Share only a redacted screenshot; never send the secret values, raw access phrases or real customer details.

## 8. End-to-end acceptance test — only fake details

1. Open `https://YOUR-ACTUAL-VERCEL-URL/studio`. Enter the `DEMO_ADMIN_PIN` from your **private** `.env` file. Confirm you see the operator catalogue with 468 businesses and filters covering all 20 categories and all three malls. It contains **no real business-contact fields**; those remain offline in the older reference.
2. Filter **Ameerah** and open the Ameerah owner preview. Confirm the correct shop/mall and category-specific pitch appear, followed immediately by the **16:9 owner film**. In the phone below, the **different social film** should play and the four approved GLOW paragraphs/bold spans should be visible.
3. Click **Try their journey**. It must start at the mobile social mockup, then a clearly simulated DM, then require **name, email and phone before** any of the six questions. Enter exactly: `Demo Guest`, `demo@example.invalid`, and `0000000000`. Tick the **dummy-data storage acknowledgement**. Leave optional marketing opt-in unticked.
4. Complete the six questions. You should see a result that quotes your choices, a free independent step and an optional question for a person. Click **Download my personalised PDF**; verify it is a real PDF showing that business, your dummy name and **your selected six answers**. Re-run with different answers and check the PDF/result changes. There must be **no price, invented business metrics, diagnosis, live AI answer or confirmed booking**.
5. Click **Log an appointment enquiry (unconfirmed)**. The screen must explicitly say no external message or booking occurred. Open **this shop's demo record** and confirm your dummy entry and `simulated_only` action appear. Delete the record, confirm it disappears, and confirm the old PDF route no longer opens.
6. Test a **different category**, e.g. `360 Degrees Pizza`, from Studio. Its questions and owner text must be about food/dining, not spa care. The pizza owner record must **not** show Ameerah's entry. To test phrase isolation, sign out of Studio, visit two `/preview/<business-slug>` pages while signed into Vercel, use Ameerah's phrase from the matching **private phrase CSV** on Ameerah and verify it does **not** sign in to pizza. A business's signed-in cookie must not unlock the other business's journey, record or PDF.
7. In a private/incognito browser not signed into Vercel, verify `/studio`, `/preview/...`, `/journey/...` and `/media/kijani-shared-introduction.mp4` are **blocked by Vercel Authentication**. The films also require the app’s signed-in owner/operator session, independent of the outer restriction. If any opens publicly, stop and set `DEMO_ENABLE=0`, redeploy, and fix protection before testing further.

There are **no real customer submissions, invitations or QR codes** in this checklist. A Vercel build success is not proof the Blob connection and access controls work: verify the report/record round trip on the actual deployed URL.

## Troubleshooting without sharing passwords

- **“Not ready for testing” or `ready:false`:** missing/invalid private master, PIN shorter than 24 characters, private Blob not connected, `DEMO_ENABLE` not exactly `1`, or no redeploy after changes. Confirm all steps in order.
- **GitHub ZIP appears as one file:** GitHub does **not** unzip uploaded archives. Extract on your computer, then upload the extracted files/folders. Root must contain `api/index.mjs`, `data/`, `lib/`, `public/` and `vercel.json`.
- **Build says module not found / missing video:** verify `package-lock.json`, `lib/`, `data/blueprints.json`, and both `data/private_media/*.mp4` exist in GitHub. Source MP4s are real files under 25 MiB each; the Function includes `data/**/*`. Check Framework = Other, Root = `./`, Output = `public`.
- **Studio says invalid PIN / owner says invalid phrase:** Studio needs the *new separate* `DEMO_ADMIN_PIN`. Owner sign-in needs the phrase from the old **matching** private CSV; the private `.env` file supplied here deliberately reuses that matching master. Do not generate a different master without generating/distributing new phrases to match it.
- **Customer form refuses a phone/email:** that is intentional: `0000000000` and `demo@example.invalid` are deliberately fake. No real phone/email may be entered.
- **PDF works but record is absent/503:** check the **Private** Blob store connection, Production environment and Runtime Logs. Do not switch to a Public Blob store or try to use local SQLite.
- **A film is missing:** inspect GitHub `data/private_media/` for the two real MP4s; they are served only on `/media/...` **after** app sign-in. Check Function build/runtime logs, and test video range playback. This package embeds the films in the Function bundle, so Drive's separate social-film permissions are not the delivery mechanism in this test.
- **Owner sees a Vercel login:** expected while All Deployments protection is on; only *you* test the site. This is not ready for owner invitations on Hobby.
- **To pause instantly:** set `DEMO_ENABLE=0` in Vercel Production and Preview, redeploy, and keep All Deployments protection enabled. To remove the test completely, use Vercel project/storage controls only after downloading anything you need to keep.

## Important future work — not in this personal staging release

A genuine owner-facing/customer launch needs a suitable commercial hosting arrangement, reviewed business-specific copy and category questions, verified owner identity and roles, production-grade rate limits, real-customer consent/privacy/retention/deletion handling, backup and monitoring, appropriate storage, and independent end-to-end review. The proposed AI front desk, after-hours service, full remote CRM and verified multi-branch consolidation remain future work; this demo does not make external bookings, posts, messages, payments or follow-ups. The official marketing site and existing Drive PDF fallback are unchanged.
