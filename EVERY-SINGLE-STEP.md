# Every Single Step – Layman Version

Do these steps in order. One number = one small action. Do not skip.

**Platforms you will use:**
- **Railway** (railway.app) – Part A
- **Cloudflare** (dash.cloudflare.com) – Part B  
- **Your domain host** (GoDaddy, Namecheap, or wherever you manage zeweco.com) – Part C
- **Browser** – Part D (just to open the site)

---

# PART A – Platform: RAILWAY (Makes login work on the internet)

**Step A1 (Railway).** Open your internet browser (Chrome, Safari, or any you use).

**Step A2 (Railway).** Click the white bar at the top where you type website addresses.

**Step A3 (Railway).** Type: railway.app

**Step A4 (Railway).** Press the Enter key on your keyboard.

**Step A5 (Railway).** Click the word **Login** (usually at the top right of the page).

**Step A6 (Railway).** Click **Login with GitHub**. If it asks to allow Railway, click **Authorize** or **Accept**.

**Step A7 (Railway).** Click **New Project**.

**Step A8 (Railway).** Click **Deploy from GitHub repo**.

**Step A9 (Railway).** If it says Configure GitHub App, click it. Then choose your GitHub and turn on access for **zeweco_Terminal**. Then come back to Railway.

**Step A10 (Railway).** Click your repo **zeweco_Terminal**. Then click **Deploy**. Wait 1–2 minutes.

**Step A11 (Railway).** You will see a box or card for your app. Click that box.

**Step A12 (Railway).** Click **Settings** (or the small gear icon).

**Step A13 (Railway).** Find the box that says **Root Directory** or **Source**. Click inside it and type: server  
Then save.

**Step A14 (Railway).** Go back to your project page. Click **New** (or the + button). Click **Volume**. Name it: data  
If it asks for Mount path, type: /data  
Save. Attach this volume to your app if it asks.

**Step A15 (Railway).** Click your app box again. Click the **Variables** tab (or **Env** or **Environment**).

**Step A16 (Railway).** Click **Add variable** or **New variable**.  
In the **first box** (name) type: DATABASE_URL  
In the **second box** (value) type: file:/data/dev.db  
Save or Add.

**Step A17 (Railway).** Click **Add variable** again.  
First box: CORS_ORIGIN  
Second box: https://terminal.zeweco.com  
Save.

**Step A18 (Railway).** Add variable. First box: SMTP_HOST   Second box: smtp.gmail.com   Save.

**Step A19 (Railway).** Add variable. First box: SMTP_PORT   Second box: 587   Save.

**Step A20 (Railway).** Add variable. First box: SMTP_USER   Second box: akshaya@zeweco.com   Save.

**Step A21 (Railway).** Add variable. First box: SMTP_PASS   Second box: sscrmxzdyfnjijjn   Save.

**Step A22 (Railway).** Add variable. First box: EMAIL_FROM   Second box: Zeweco Terminal <akshaya@zeweco.com>  
(Use the same email inside the angle brackets if you use a different one.) Save.

**Step A23 (Railway).** Click **Settings**. Find **Networking** or **Generate Domain**. Click **Generate Domain**. If it asks for port, type: 8080   Then click **Generate Domain** (the button).

**Step A24 (Railway).** Copy the long web address Railway shows (it will look like https://something.up.railway.app). Paste it into Notepad or Notes and keep it. You need it for Part B.

---

# PART B – Platform: CLOUDFLARE (Puts your website at terminal.zeweco.com)

**Step B1 (Cloudflare).** Open a new browser tab (or go to dash.cloudflare.com).

**Step B2 (Cloudflare).** Type in the address bar: dash.cloudflare.com  
Press Enter.

**Step B3 (Cloudflare).** Log in with your email and password if it asks.

**Step B4 (Cloudflare).** On the left side of the page, click **Workers & Pages**.

**Step B5 (Cloudflare).** Click the **Create** button (usually top right).

**Step B6 (Cloudflare).** Click **Pages** (do not click Worker).

**Step B7 (Cloudflare).** Click **Connect to Git**.

**Step B8 (Cloudflare).** Click **Connect GitHub**. Allow Cloudflare if it asks. Then you will see a list of your GitHub projects.

**Step B9 (Cloudflare).** Find **zeweco_Terminal** in the list. Click **Begin setup** next to it.

**Step B10 (Cloudflare).** You will see a form. In the box that says **Project name**, type: zeweco-terminal

**Step B11 (Cloudflare).** Leave **Production branch** as: main

**Step B12 (Cloudflare).** In the box **Build command**, type: npm run build

**Step B13 (Cloudflare).** In the box **Build output directory**, type: dist

**Step B14 (Cloudflare).** Scroll down. Find **Environment variables** or **Variables** or **Add variable**. Click it.

**Step B15 (Cloudflare).** Click **Add variable**.  
Variable name box type: VITE_API_BASE  
Value box type: https://zewecoterminal-production.up.railway.app  
(No space. No slash at the end.) Save or Add.

**Step B16 (Cloudflare).** Add another variable.  
Variable name: CLOUDFLARE_API_TOKEN  
Value: paste the token you created at dash.cloudflare.com → Profile → API Tokens (the one with Cloudflare Pages: Edit).  
Save.

**Step B17 (Cloudflare).** Find the box **Deploy command**. Click inside it. Delete whatever is there. Type exactly: npx wrangler pages deploy dist --project-name=zeweco-terminal  
Save.

**Step B18 (Cloudflare).** Click **Save and Deploy** (or Save then Deploy). Wait until the page says **Success** or **Deployed** (may take 2–5 minutes).

**Step B19 (Cloudflare).** Click the **Custom domains** tab (or Domains).

**Step B20 (Cloudflare).** Click **Set up a custom domain** or **Add custom domain**.

**Step B21 (Cloudflare).** In the box type: terminal.zeweco.com  
Click **Continue**.

**Step B22 (Cloudflare).** Cloudflare will show you an address (like zeweco-terminal.pages.dev). Copy that address. Keep this page open. You need it for Part C.

---

# PART C – Platform: YOUR DOMAIN HOST (GoDaddy / Namecheap / wherever you manage zeweco.com DNS)

**Step C1 (Your domain host).** Open a new tab. Go to the website where you manage your domain zeweco.com (GoDaddy, Namecheap, or wherever you bought zeweco.com).

**Step C2 (Your domain host).** Log in.

**Step C3 (Your domain host).** Find **DNS** or **Manage DNS** or **DNS settings** for zeweco.com. Click it.

**Step C4 (Your domain host).** Click **Add record** (or Add).

**Step C5 (Your domain host).** Where it says **Type**, choose **CNAME** from the list.

**Step C6 (Your domain host).** Where it says **Name** or **Host**, type: terminal

**Step C7 (Your domain host).** Where it says **Target** or **Value** or **Points to**, paste the address you copied in Step B22 (e.g. zeweco-terminal.pages.dev).

**Step C8 (Your domain host).** Click **Save**.

**Step C9 (Your domain host).** Wait 10–30 minutes (sometimes up to 1 hour).

---

# PART D – Platform: BROWSER (Just open your site)

**Step D1 (Browser).** Open a new browser tab.

**Step D2 (Browser).** In the address bar type: https://terminal.zeweco.com

**Step D3 (Browser).** Press Enter.

**Step D4 (Browser).** You should see the Zeweco Terminal login page.

**Step D5 (Browser).** Try logging in with your email and password.

---

If any step does not match what you see, tell me the step number (e.g. A15 or B21) and the **platform** (Railway, Cloudflare, or Your domain host), and I will tell you exactly what to click or type next.
