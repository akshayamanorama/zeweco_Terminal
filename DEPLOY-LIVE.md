# Go live at terminal.zeweco.com

**Not technical?** Use the guided version: **[DEPLOY-SIMPLE.md](./DEPLOY-SIMPLE.md)** — step-by-step, click-by-click, no jargon.

---

This file (DEPLOY-LIVE.md) is the technical reference. It explains how to put the app live and **who does what**: steps the repo/code can cover vs steps you need to do (hosting, DNS, env vars).

---

## Overview

- **Frontend**: React app (built to static files).
- **Backend**: Node + Express + Prisma (SQLite) + auth (bcrypt, email reset).
- **Live URL**: https://terminal.zeweco.com

You can either run **one server** that serves both API and frontend, or **split** frontend (e.g. Cloudflare Pages) and backend (e.g. Railway).

---

## What’s already done in the repo (no action from you)

- Production API base: frontend uses `VITE_API_BASE` at build time (default `/api` for same-origin).
- CORS: backend uses `CORS_ORIGIN` env (e.g. `https://terminal.zeweco.com`).
- Single-server mode: if `server/public` exists, the Node server serves the built frontend and SPA fallback.
- `.env.example` and docs for env vars.

---

## Option A – Single server (VPS, e.g. DigitalOcean / Linode)

One machine serves both the app and the API. Good if you’re okay with a small server (Ubuntu, etc.).

### You do

1. **Create a server**  
   - Sign up with a provider (e.g. DigitalOcean, Linode).  
   - Create a droplet/instance (e.g. Ubuntu 22.04, 1 GB RAM).  
   - Note the IP and use SSH to log in.

2. **Install software** (on the server)
   - Node.js 18+ (e.g. `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -` then `sudo apt install -y nodejs`).
   - (Optional) nginx and Certbot for SSL:  
     `sudo apt install -y nginx certbot python3-certbot-nginx`

3. **Clone the repo and build**
   ```bash
   cd /var/www   # or a folder you prefer
   sudo git clone https://github.com/akshayamanorama/zeweco_Terminal.git
   cd zeweco_Terminal
   ```
   ```bash
   npm install
   npm run build
   cp -r dist server/public
   cd server
   cp .env.example .env
   npm install
   npx prisma migrate deploy
   ```
   Edit `server/.env`: set `DATABASE_URL`, `PORT`, `CORS_ORIGIN=https://terminal.zeweco.com`, and SMTP vars (see `server/SMTP-SETUP.txt`).

4. **Run the app** (and keep it running)
   - Using PM2 (recommended):
     ```bash
     sudo npm install -g pm2
     cd /var/www/zeweco_Terminal/server
     NODE_ENV=production pm2 start dist/src/index.js --name zeweco-terminal
     pm2 save && pm2 startup
     ```
   - Or a systemd service (we can add a unit file to the repo if you want).

5. **Point domain and SSL**
   - At your DNS provider (where zeweco.com is managed), add:
     - **A record** `terminal` → your server’s **IP**,  
     or  
     - **CNAME** `terminal` → your server hostname if the provider gives you one.
   - If using nginx:
     - Configure a server block for `terminal.zeweco.com` that proxies to your Node app (e.g. port 3004).
     - Run `sudo certbot --nginx -d terminal.zeweco.com` to get HTTPS.

6. **Open in browser**  
   https://terminal.zeweco.com

**Optional nginx config** (if you use nginx in front of Node):

```nginx
server {
    server_name terminal.zeweco.com;
    location / {
        proxy_pass http://127.0.0.1:3004;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then run `sudo certbot --nginx -d terminal.zeweco.com`. If you don’t use nginx and Node listens on 80/443, you’d use a reverse proxy or Node on 80 with root.

## Option B – Frontend on Cloudflare Pages + Backend elsewhere (e.g. Railway)

Frontend is built and hosted on Cloudflare; backend runs on Railway (or Render / Fly.io). No VPS to maintain.

### You do

1. **Deploy the backend** (e.g. Railway)
   - Sign up at [railway.app](https://railway.app).
   - New project → “Deploy from GitHub repo” → choose `akshayamanorama/zeweco_Terminal`.
   - Set **Root directory** to `server` (so only the server folder is built/run).
   - In **Variables**, set at least:
     - `DATABASE_URL` – Railway can add a PostgreSQL DB; if you keep SQLite you’ll need a volume and a file path.
     - `PORT` – Railway sets this automatically; keep it.
     - `CORS_ORIGIN` = `https://terminal.zeweco.com`
     - SMTP vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
   - Run migrations: in Railway’s shell or via a one-off command: `npx prisma migrate deploy`
   - Note the public URL, e.g. `https://zeweco-terminal-production.up.railway.app`

2. **Deploy the frontend** (Cloudflare Pages)
   - [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → Connect to Git.
   - Repo: `akshayamanorama/zeweco_Terminal`.
   - Build settings:
     - Build command: `npm run build`
     - Build output directory: `dist`
   - **Environment variables** (for the build):
     - `VITE_API_BASE` = your backend URL, e.g. `https://zeweco-terminal-production.up.railway.app`
   - Save and deploy.

3. **Custom domain**
   - In the Cloudflare Pages project: Custom domains → Add `terminal.zeweco.com`.
   - At your DNS provider, add the CNAME (or whatever Cloudflare tells you) so `terminal.zeweco.com` points to the Pages project.

4. **Open**  
   https://terminal.zeweco.com (frontend will call the Railway backend using `VITE_API_BASE`).

---

## Summary: who does what

| Step | Done by repo / automation | Done by you |
|------|----------------------------|------------|
| Code: API base URL, CORS, single-server static | ✅ In repo | — |
| Env template and docs | ✅ `.env.example`, AUTH.md, SMTP-SETUP.txt | — |
| Choose hosting (VPS vs Railway + Cloudflare) | — | ✅ You |
| Create account, server or project | — | ✅ You |
| Clone repo, install deps, build frontend | — | ✅ You (or CI) |
| Set env vars (DB, SMTP, CORS, etc.) | — | ✅ You |
| Run migrations | — | ✅ You (one-time) |
| Point terminal.zeweco.com (DNS) | — | ✅ You |
| SSL (Certbot or platform) | — | ✅ You (or platform) |

---

## Checklist before going live

- [ ] `server/.env` (or platform env vars) has real `DATABASE_URL`, `CORS_ORIGIN`, and SMTP settings.
- [ ] Migrations run: `npx prisma migrate deploy` in `server/`.
- [ ] For single-server: frontend built and copied to `server/public`.
- [ ] DNS: `terminal.zeweco.com` → your frontend or reverse proxy.
- [ ] HTTPS enabled (Certbot or Cloudflare/host).

If you tell me which option you prefer (A = single VPS, B = Cloudflare + Railway), I can add exact commands or config snippets (e.g. nginx, systemd, or Railway config) into the repo next.
