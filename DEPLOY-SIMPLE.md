# Get Your App Live at terminal.zeweco.com

**In simple words:** You will put your app on the internet. When someone types **terminal.zeweco.com** in the browser, they will see your Zeweco Terminal and can log in. You will use two free websites (Railway and Cloudflare) to do this. No coding. Just follow the steps.

**Do one step. Then the next. You can stop anytime and continue later.**

---

## What You Need Before Starting

- Your **GitHub** login (you already have the project there).
- Where you manage **zeweco.com** (the place where you can add or change “DNS” or “records” for zeweco.com).
- The **Gmail app password** you used earlier for “Forgot password” emails.
- About **30 minutes**.

---

# PART 1 – Make the “Login System” Work on the Internet (Railway)

Right now the login works only on your computer. Railway will run that same login system on the internet so anyone can use it.

---

### Step 1 – Open Railway and sign in with GitHub

1. Open your browser.
2. Go to: **railway.app**
3. Click **Login** (top right).
4. Click **Login with GitHub**.
5. Allow Railway to use your GitHub when it asks.  
   Done. You are now in Railway.

---

### Step 2 – Tell Railway to use your GitHub project

1. Click **New Project**.
2. Click **Deploy from GitHub repo**.
3. If it says “Configure GitHub App”, click it.
4. Choose your GitHub account (or the one that has zeweco_Terminal).
5. Find the repo **zeweco_Terminal** and allow Railway to use it.
6. Come back to Railway. Click **Deploy** (or **Add repository**).
7. Wait until it says something like “Deploying” or “Building”. Wait 1–2 minutes.

---

### Step 3 – Tell Railway to use only the “server” folder

1. You will see a box (a “service”) for your app. Click that box.
2. Click **Settings** (or the gear icon).
3. Find **Root Directory** (or **Source**).
4. In the box, type: **server**
5. Save. Wait again for Railway to rebuild (about 1 minute).

---

### Step 4 – Add a place to store data (Volume)

1. On the same project page, click **New** (or the **+** button).
2. Click **Volume** (or **Empty volume**).
3. Name it: **data**
4. If it asks for “Mount path”, type: **/data**
5. Save.  
   This “volume” is like a small disk where the app will keep users and passwords.

---

### Step 5 – Add your settings (Variables)

1. Click again on your **server** box (the main service).
2. Click **Variables** (or **Env** or **Environment**).
3. You will add these **one by one**. Click “Add variable” or “New” for each.

**Add these (copy the Name exactly; change the Value only where it says “your”):**

- Name: **DATABASE_URL**  
  Value: **file:/data/dev.db**

- Name: **CORS_ORIGIN**  
  Value: **https://terminal.zeweco.com**

- Name: **SMTP_HOST**  
  Value: **smtp.gmail.com**

- Name: **SMTP_PORT**  
  Value: **587**

- Name: **SMTP_USER**  
  Value: **akshaya@zeweco.com** (or the email you use for sending the reset code)

- Name: **SMTP_PASS**  
  Value: **your 16-letter app password** (the one from Google, no spaces)

- Name: **EMAIL_FROM**  
  Value: `Zeweco Terminal <akshaya@zeweco.com>`  
  (replace akshaya@zeweco.com with your email; keep the &lt; and &gt; brackets)

4. Save. Railway will restart your app. Wait 1 minute.

---

### Step 6 – Get a public link for your login system

1. Stay on your **server** service. Click **Settings**.
2. Find **Networking** or **Generate Domain**.
3. Click **Generate Domain**. Railway will give you a long link like:  
   **https://something.up.railway.app**
4. **Copy this full link** and paste it into a Notepad or somewhere safe.  
   You will need it in Part 2.

---

# PART 2 – Make the Website Show at terminal.zeweco.com (Cloudflare)

Now you will put the “page” people see (the Zeweco Terminal screen) on the internet and connect it to the link you just copied.

---

### Step 7 – Open Cloudflare and sign in

1. Open a new browser tab.
2. Go to: **dash.cloudflare.com**
3. Sign up or log in (free plan is enough).

---

### Step 8 – Create a “Pages” project from GitHub

1. On the left, click **Workers & Pages**.
2. Click **Create**.
3. Click **Pages**.
4. Click **Connect to Git**.
5. Click **Connect GitHub**. Allow Cloudflare to see your repos.
6. Click the repo **zeweco_Terminal**.
7. Click **Begin setup**.

---

### Step 9 – Fill in the build form

1. **Project name:** type **zeweco-terminal** (or any name you like).
2. **Production branch:** leave **main**.
3. **Build command:** type **npm run build**
4. **Build output directory:** type **dist**

---

### Step 10 – Add the link to your login system (important)

1. Before clicking Save, find **Environment variables** or **Advanced**.
2. Click **Add variable** or **Edit variables**.
3. **Variable name:** type **VITE_API_BASE**
4. **Value:** paste the long link you saved from Railway (Step 6).  
   Example: **https://something.up.railway.app**  
   Do **not** add a slash at the end.
5. Save.

---

### Step 11 – Save and deploy

1. Click **Save and Deploy**.
2. Wait a few minutes. When it says “Success” or “Deployed”, Part 2 is done.

---

### Step 12 – Add your domain (terminal.zeweco.com)

1. In the same Cloudflare project, click **Custom domains**.
2. Click **Set up a custom domain**.
3. Type: **terminal.zeweco.com**
4. Click **Continue**. Cloudflare will show you what to do next.

---

### Step 13 – Point zeweco.com to Cloudflare (DNS)

1. Log in to the place where you manage **zeweco.com** (e.g. GoDaddy, Namecheap, or whoever hosts your domain).
2. Open **DNS** or **Manage DNS** or **DNS settings** for zeweco.com.
3. Click **Add record** (or Add).
4. Choose **CNAME** (or “CNAME record”).
5. **Name:** type **terminal** (some places ask for “terminal” only, some for “terminal.zeweco.com”—use what they ask).
6. **Target** or **Value:** copy exactly what Cloudflare showed you (e.g. **zeweco-terminal.pages.dev**).
7. Save.
8. Wait 10–30 minutes (sometimes up to 1 hour). The internet needs time to update.

---

### Step 14 – Check that it works

1. Open a new tab. Go to: **https://terminal.zeweco.com**
2. You should see the Zeweco Terminal login page.
3. Try logging in with your email and password.
4. If it works, you are live.

---

# If Something Goes Wrong

**I see “Cannot reach server” or login does nothing**  
- Check that in Railway your app is “Running” (green).  
- Check that in Cloudflare you added **VITE_API_BASE** with the **exact** Railway link (no slash at the end).  
- Try redeploying the Cloudflare project (click “Retry deployment” or “Redeploy”).

**I never get the “Forgot password” email**  
- In Railway, open **Variables**. Check that **SMTP_USER** and **SMTP_PASS** are exactly the same as in your working .env (the Gmail app password, no spaces).

**terminal.zeweco.com does not open**  
- Wait a bit longer (DNS can take up to 1 hour).  
- Check that you added the CNAME record exactly as Cloudflare said (Name = terminal, Target = the address they gave you).

---

**If you get stuck, tell me the step number and what you see on the screen (or send a screenshot), and I’ll tell you the next click or what to type.**
