# What You Must Put on Other Platforms

Everything below is the only place you need to type or paste. Use the values exactly as written.

---

## 1. RAILWAY (Backend / Login)

**Where:** https://railway.app → Your project → Click your **zeweco_Terminal** service → **Variables** tab.

**What to put:** Add these variables (Name = left, Value = right). Click Add variable for each.

| Name | Value |
|------|--------|
| DATABASE_URL | file:/data/dev.db |
| CORS_ORIGIN | https://terminal.zeweco.com |
| SMTP_HOST | smtp.gmail.com |
| SMTP_PORT | 587 |
| SMTP_USER | akshaya@zeweco.com |
| SMTP_PASS | sscrmxzdyfnjijjn |
| EMAIL_FROM | Zeweco Terminal <akshaya@zeweco.com> |

**Also on Railway:**  
- **Settings** → **Networking** → **Generate Domain** (port 8080). Copy the URL you get (e.g. https://zewecoterminal-production.up.railway.app).  
- **New** → **Volume** → Name: **data**, Mount path: **/data** (attach to your service).

---

## 2. CLOUDFLARE PAGES (Website)

**Where:** https://dash.cloudflare.com → **Workers & Pages** → Your **zeweco-terminal** project → **Settings** → **Builds & deployments** (or **Build configuration**).

**What to put:**

| Field | Value |
|-------|--------|
| Build command | npm run build |
| Build output directory | dist |
| Deploy command | npx wrangler pages deploy dist --project-name=zeweco-terminal |

**Where:** Same project → **Environment variables** or **Variables** (for build).

| Variable name | Value |
|---------------|--------|
| VITE_API_BASE | https://zewecoterminal-production.up.railway.app |
| CLOUDFLARE_API_TOKEN | (paste the token you created at dash.cloudflare.com/profile/api-tokens – Cloudflare Pages: Edit permission) |

**Where:** Same project → **Custom domains**.

| What to type |
|--------------|
| terminal.zeweco.com |

Then click Continue and do what Cloudflare says (add CNAME in STEP 3).

---

## 3. DNS (Where zeweco.com Is Managed)

**Where:** The website where you manage zeweco.com (GoDaddy, Namecheap, Cloudflare DNS, or your host) → **DNS** or **Manage DNS** for zeweco.com.

**What to put:** Add one record.

| Field | Value |
|-------|--------|
| Type | CNAME |
| Name (or Host) | terminal |
| Target (or Value / Points to) | (Copy from Cloudflare “Custom domains” step – e.g. zeweco-terminal.pages.dev) |

Save. Wait 10–30 minutes.

---

## 4. Summary – Only 3 Places

| Platform | Where | What |
|----------|--------|------|
| **Railway** | Project → Service → Variables | DATABASE_URL, CORS_ORIGIN, SMTP_* (table above). Plus Volume “data” and Generate Domain. |
| **Cloudflare Pages** | Project → Build config + Variables | Build command, output dir, Deploy command; VITE_API_BASE and CLOUDFLARE_API_TOKEN (table above). Custom domain: terminal.zeweco.com |
| **DNS** | Your domain host for zeweco.com | One CNAME: name **terminal**, target = what Cloudflare gave you. |

After all three are done, open **https://terminal.zeweco.com** and log in.
