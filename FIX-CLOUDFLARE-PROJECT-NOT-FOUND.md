# Fix: "Project not found" on Cloudflare Deploy

The build works. The deploy fails because Cloudflare is looking for a project named **zeweco-terminal** but your project has a **different name**. Fix it by using the **exact name** Cloudflare shows.

---

## STEP 1 – Find the exact project name (do this on Cloudflare)

**Where:** Cloudflare (in your browser).

1. Open your browser.
2. In the address bar type: **dash.cloudflare.com**
3. Press Enter.
4. Log in if it asks.
5. On the **left side** of the page, click **Workers & Pages**.
6. You will see a list of projects. Look for the one that is for your Zeweco Terminal (it might be the only one, or one of a few).
7. **Click on that project** (click the project name or the row).
8. Look at the **top of the page** or the **browser address bar**:
   - The **project name** might be shown in the page title (e.g. "zeweco_Terminal" or "zeweco-terminal" or "Zeweco Terminal").
   - Or look at the **URL** in the address bar. It might look like:  
     `dash.cloudflare.com/.../pages/view/zeweco_Terminal`  
     or  
     `.../zeweco-terminal`  
     The part after **view/** or the last part of the path is often the **project name**.
9. **Write down the exact name** you see (including capital letters, small letters, hyphen `-` or underscore `_`). For example:
   - If you see **zeweco_Terminal** → exact name is `zeweco_Terminal`
   - If you see **zeweco-terminal** → exact name is `zeweco-terminal`
   - Copy it exactly; do not change any letter.

---

## STEP 2 – Update the deploy command (do this on Cloudflare)

**Where:** Cloudflare (same site, same project).

1. Stay on Cloudflare. You should still be inside your **Workers & Pages** project (the one you opened in Step 1).
2. Click **Settings** (or the **gear icon** or **Project settings**). It is usually in the left menu of the project or at the top.
3. Scroll down until you see **Build configurations** or **Build** or **Deploy command**.
4. Find the box that says **Deploy command** (or "Custom deploy command").
5. Click inside that box. Select all the text and delete it.
6. Type this **exactly**, but replace **YOUR_EXACT_PROJECT_NAME** with the name you wrote down in Step 1 (no spaces, same spelling and punctuation):

   **npx wrangler pages deploy dist --project-name=YOUR_EXACT_PROJECT_NAME**

   **Examples:**
   - If the exact name was **zeweco_Terminal**, type:  
     `npx wrangler pages deploy dist --project-name=zeweco_Terminal`
   - If the exact name was **zeweco-terminal**, type:  
     `npx wrangler pages deploy dist --project-name=zeweco-terminal`
   - If the exact name was **Zeweco-Terminal**, type:  
     `npx wrangler pages deploy dist --project-name=Zeweco-Terminal`
7. Click **Save** (or **Save and Deploy** if that is the only button).

---

## STEP 3 – Run the deploy again (do this on Cloudflare)

**Where:** Cloudflare.

1. Stay in the same project on Cloudflare.
2. Go to the **Deployments** tab (top of the page).
3. Click **Create deployment** or **Retry** or **Redeploy** (whatever button starts a new deploy).
4. Wait 2–5 minutes. The deploy should succeed this time.

---

## If you still see "Project not found"

Then the project might be a **Worker** project, not a **Pages** project. The deploy command we use only works for **Pages**.

**Check this on Cloudflare:**

1. Go to **Workers & Pages** (left side).
2. Look at your project. Under or next to the name, it might say **Pages** or **Worker**.
3. If it says **Worker** (not Pages):
   - You need a **Pages** project. Click **Create** → **Pages** → **Connect to Git**.
   - Connect the **zeweco_Terminal** repo again.
   - When it asks for **Project name**, type exactly: **zeweco-terminal** (all small letters, hyphen in the middle).
   - Set **Build command**: `npm run build`
   - Set **Build output directory**: `dist`
   - Set **Deploy command**: `npx wrangler pages deploy dist --project-name=zeweco-terminal`
   - Add variable **VITE_API_BASE** = `https://zewecoterminal-production.up.railway.app`
   - Add variable **CLOUDFLARE_API_TOKEN** = your token.
   - Then click **Save and Deploy**.

---

**Summary:** The bug is the project name in the deploy command. Find the **exact project name** in Cloudflare (Step 1), put it in the deploy command (Step 2), save, then deploy again (Step 3). If your project is a Worker, create a new **Pages** project with name **zeweco-terminal** and use the deploy command above.
