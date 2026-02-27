# Create a Cloudflare PAGES Project (Not Worker) – Step by Step

You currently have a **Worker** project. The deploy command needs a **Pages** project. Follow these steps to create a **new Pages** project and connect your repo. Do everything on **Cloudflare** in your browser.

---

## STEP 1 – Go to Workers & Pages (Cloudflare)

1. Open your browser.
2. In the address bar type: **dash.cloudflare.com**
3. Press Enter. Log in if it asks.
4. On the **left side**, click **Workers & Pages**.

---

## STEP 1b – If you don’t see a “Create” or “Create application” button

Try these in order (all in the browser on Cloudflare):

**Option A – Direct link to Pages**  
In the address bar, type this **exactly** (it goes straight to Pages for your account):

**https://dash.cloudflare.com/b55eb7777c1d943d74b7d9543fbd580e/pages**

Press Enter. You should see a **Pages** page. Look for a button that says **Create project** or **Connect to Git** or **Create application**, and click it.

**Option B – Tabs on the Workers & Pages page**  
After clicking **Workers & Pages** (left menu), look at the **top of the main area** (under “Workers & Pages”). You may see tabs or links such as **Overview**, **Workers**, **Pages**. Click **Pages**. Then look for **Create project** or **Connect to Git** on that page.

**Option C – Different button words**  
On the Workers & Pages page, look for any of these (they might not be blue):  
- **Create application**  
- **Create project**  
- **Connect to Git**  
- **Add project**  
Click whichever you see. On the next screen, if it asks you to choose **Worker** or **Pages**, choose **Pages**.

**Option D – Search**  
Click the **search bar** at the top of Cloudflare (magnifying glass or “Search”). Type **Pages**. Click the result that says something like “Pages” or “Workers & Pages” and then look for **Create project** or **Connect to Git** on the page that opens.

1. Click the **Create** button (usually top right, blue button).
2. You will see two options: **Worker** and **Pages**.
3. Click **Pages** (do **not** click Worker).
4. Click **Connect to Git**.

---

## STEP 3 – Connect your GitHub repo (Cloudflare)

1. Click **Connect GitHub**. Allow Cloudflare if the browser asks.
2. You will see a list of your GitHub repositories.
3. Find **zeweco_Terminal** (or **akshayamanorama/zeweco_Terminal**).
4. Click **Begin setup** next to it.

---

## STEP 4 – Fill in the project details (Cloudflare)

1. **Project name** – In the box type exactly: **zeweco-terminal**  
   (all small letters, hyphen in the middle.)

2. **Production branch** – Leave as: **main**

3. **Build command** – In the box type: **npm run build**

4. **Build output directory** – In the box type: **dist**

5. **Root directory** – Leave as **/** or leave blank.

6. Scroll down. Find **Environment variables** or **Variables**. Click **Add variable** or **Add**.

   - **First variable:**  
     Name: **VITE_API_BASE**  
     Value: **https://zewecoterminal-production.up.railway.app**  
     (No space, no slash at the end.) Click Add or Save.

   - **Second variable:**  
     Name: **CLOUDFLARE_API_TOKEN**  
     Value: paste the same API token you used before (the one that starts with zDNa2WutSHuAvTVs... or whatever you have). Click Add or Save.

7. Find the **Deploy command** box. Click inside it. Type exactly:  
   **npx wrangler pages deploy dist --project-name=zeweco-terminal**  
   (Same as before; now it will work because this is a **Pages** project named zeweco-terminal.)

8. Click **Save and Deploy** (or **Save** then **Deploy**).

---

## STEP 5 – Wait for the build (Cloudflare)

1. Stay on the page. Wait 2–5 minutes.
2. When it says **Success** or **Deployed**, the deploy worked.
3. Click the **Custom domains** tab. Click **Set up a custom domain** or **Add custom domain**.
4. Type: **terminal.zeweco.com**
5. Click **Continue**. Copy the address Cloudflare shows (e.g. zeweco-terminal.pages.dev). You need it for DNS (at GoDaddy/Namecheap or wherever you manage zeweco.com).

---

## STEP 6 – (Optional) Turn off or delete the old Worker

You can leave the old **Worker** project as is, or turn off its builds so it does not run by mistake.

- Go to **Workers & Pages** (left menu).
- You will see both **zeweco-terminal** (Worker) and **zeweco-terminal** (Pages). The one that says **Pages** is the new one; the one that says **Worker** is the old one.
- Click the **Worker** one → **Settings** → you can disconnect the Git repo or leave it. You do not need to delete it unless you want to.

---

**Summary:** The problem was that you had a **Worker** project. The command `wrangler pages deploy` only works with a **Pages** project. You created a **Pages** project with the same name **zeweco-terminal**, same build command, same deploy command, and same variables. Now the deploy will find the project and succeed.
