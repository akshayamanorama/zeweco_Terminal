# Cloudflare Pages – Step-by-Step (No Tech Jargon)

Do the steps in order. One step = one action. If a step doesn’t match your screen, tell me what you see.

---

## STEP 1 – Open Cloudflare

1. Open your browser (Chrome, Safari, etc.).
2. Click the address bar at the top.
3. Type: **dash.cloudflare.com**
4. Press Enter.
5. Log in with your email and password if it asks.
6. You should see the Cloudflare dashboard (list of sites or a menu on the left).

---

## STEP 2 – Go to Workers and Pages

1. Look at the **left side** of the screen.
2. Click **Workers & Pages**.
3. You will see a list of your projects (or an empty list).

---

## STEP 3 – Create a New “Pages” Project (Not Worker)

1. Click the **Create** button (usually top right).
2. You will see two options: **Worker** and **Pages**.
3. Click **Pages** (do not click Worker).
4. Next you will see: **Create a Worker** or **Connect to Git**.
5. Click **Connect to Git**.

---

## STEP 4 – Connect Your GitHub

1. Click **Connect GitHub**.
2. A new page will open (GitHub). If it asks “Allow Cloudflare to use your repos?”, click **Authorize** or **Accept**.
3. You will see a list of your GitHub projects.
4. Find **zeweco_Terminal** (or **akshayamanorama/zeweco_Terminal**).
5. Click **Begin setup** next to it.

---

## STEP 5 – Fill the Build Form

You will see a form with several boxes.

**Box 1 – Project name**  
- Type exactly: **zeweco-terminal**  
- (This is the name Cloudflare will use. Use only small letters and one hyphen.)

**Box 2 – Production branch**  
- Leave as: **main**  
- (Do not change this.)

**Box 3 – Build command**  
- Click in the box and type exactly: **npm run build**  
- (This tells Cloudflare how to build your site.)

**Box 4 – Build output directory**  
- Click in the box and type exactly: **dist**  
- (This tells Cloudflare where the built files are.)

Do not click Save yet. Go to STEP 6.

---

## STEP 6 – Add the Variable (So Your Site Can Talk to Railway)

1. Scroll down on the same page.
2. Find **Environment variables** or **Variables** or **Add variable**.
3. Click **Add variable** or **Edit variables**.
4. You will see two small boxes: one for name, one for value.

**First box – Variable name**  
- Type exactly: **VITE_API_BASE**

**Second box – Value**  
- Type exactly: **https://zewecoterminal-production.up.railway.app**  
- No space before or after. No slash at the end.

5. If it asks “Which environment?”, choose **Production**.
6. Click **Save** or **Add** to save this variable.

---

## STEP 7 – Set the Deploy Command

1. Still on the same page, find **Deploy command** (often under “Build” or “Build configuration”).
2. Click in the **Deploy command** box.
3. Delete anything that is there.
4. Type exactly: **npx wrangler pages deploy dist --project-name=zeweco-terminal**
5. Check: no space at the start or end. One hyphen in zeweco-terminal.

---

## STEP 8 – Save and Deploy

1. Click the **Save and Deploy** button (or **Save** then **Deploy**).
2. Wait. The build can take 2–5 minutes.
3. You will see logs (lines of text). Wait until you see **Success** or **Deployed**.
4. If you see **Failed**, copy the last few lines of the log and send them to me.

---

## STEP 9 – Add Your Website Address (terminal.zeweco.com)

1. After the deploy succeeds, you will be on your project page.
2. Click the **Custom domains** tab (or **Domains** in the left menu).
3. Click **Set up a custom domain** (or **Add custom domain**).
4. In the box, type: **terminal.zeweco.com**
5. Click **Continue**.
6. Cloudflare will show you what to do next (usually “Add a CNAME record”). Keep that page open for STEP 10.

---

## STEP 10 – Point Your Domain (DNS)

1. Open a **new browser tab**.
2. Log in to the place where you manage **zeweco.com** (e.g. GoDaddy, Namecheap, or whoever you bought the domain from).
3. Find **DNS** or **Manage DNS** or **DNS settings** for zeweco.com.
4. Click **Add record** (or **Add**).
5. Choose **CNAME** (from a dropdown or list).
6. **Name** (or Host): type **terminal**  
   (Some places want only “terminal”, some want “terminal.zeweco.com”. Use what they ask for.)
7. **Target** (or Value or Points to): go back to the Cloudflare tab from STEP 9 and **copy the address** Cloudflare gave you (e.g. something like **zeweco-terminal.pages.dev**). Paste it here.
8. Click **Save**.
9. Wait 10–30 minutes (sometimes up to 1 hour) for the internet to update.

---

## STEP 11 – Open Your Site

1. Open a new browser tab.
2. In the address bar type: **https://terminal.zeweco.com**
3. Press Enter.
4. You should see the Zeweco Terminal login page.
5. Try logging in with your email and password.

---

## If Something Fails

- **Build failed:** Send me the last 10–15 lines of the build log.
- **Deploy failed / “Project not found”:** Make sure you created a **Pages** project (STEP 3), not a Worker, and that the deploy command is exactly: **npx wrangler pages deploy dist --project-name=zeweco-terminal**
- **Site doesn’t open / “Can’t reach server”:** Wait longer for DNS (STEP 10). Check that the CNAME **Name** is **terminal** and **Target** is what Cloudflare showed you.
- **Login doesn’t work:** Check that the variable **VITE_API_BASE** is exactly **https://zewecoterminal-production.up.railway.app** (no slash at end) and that you redeployed after adding it.

Start at STEP 1 and go in order. If any step doesn’t match your screen, tell me the step number and what you see.
