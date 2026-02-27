# Fix: "Build output directory not found" on Cloudflare

Cloudflare ran the build but then could not find the folder where the built files are. Do these steps **on Cloudflare** in your browser.

---

## STEP 1 – Set the build output directory to **dist** (Cloudflare)

1. Open your browser. Go to **dash.cloudflare.com** and log in.
2. Click **Workers & Pages** on the left.
3. Click your **application** (the one you just created for zeweco_Terminal).
4. Click **Settings** (or **Build configuration** or the gear icon).
5. Find the box named **Build output directory** (or "Output directory" or "Publish directory").
6. Click inside that box. Delete whatever is there. Type exactly: **dist**
7. Make sure these are also set:
   - **Build command:** **npm run build**
   - **Root directory:** **/** or leave blank (do not put `server` here; the frontend is at the root of the repo).
8. Click **Save**.

---

## STEP 2 – Add the variable so the app knows your API address (Cloudflare)

1. Stay in the same project on Cloudflare. Find **Variables** or **Environment variables** (often under Settings or in the left menu).
2. Click **Add variable** or **Edit variables**.
3. Add one variable:
   - **Name:** **VITE_API_BASE**
   - **Value:** **https://zewecoterminal-production.up.railway.app**
   (No space, no slash at the end.)
4. Save.

---

## STEP 3 – Run the build again (Cloudflare)

1. Go to the **Deployments** tab (or **Builds**) for this application.
2. Click **Retry** or **Redeploy** or **Create deployment**.
3. Wait 2–5 minutes. Watch the build log.

---

## STEP 4 – If it still says "build output directory not found"

Then the **build itself** is failing (so the `dist` folder is never created). We need to see the real error.

1. On Cloudflare, open the same deployment that failed.
2. Click **Download log** (or **Copy log**). Open the downloaded file or paste the log somewhere you can read it.
3. Scroll to the section **after** "Cloning repository" and "Building application". Look for red text or lines that say **Error** or **npm ERR!** or **vite error**.
4. Copy those error lines and share them. Then we can fix the actual build error (for example a missing dependency or a wrong path).

---

**Summary:** First fix the **Build output directory** (set it to **dist**) and add **VITE_API_BASE**, then retry. If it still fails, the build is breaking before it creates `dist` — send the full build log so we can see the error.
