# Deploy ZEWECO Terminal (Cloudflare Pages)

The app is configured for **Cloudflare Pages**. Build output: `dist` (Vite default).

## Connect GitHub to Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select **GitHub** and authorize, then choose repo: `akshayamanorama/zeweco_Terminal`.
3. **Build settings:**
   - **Framework preset:** None (or Vite if listed)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** (leave empty)
4. Click **Save and Deploy**.

Cloudflare will build and deploy. Later pushes to `main` will auto-deploy.

## Custom domain (terminal.zeweco.com)

1. In the Pages project: **Custom domains** → **Set up a custom domain**.
2. Enter `terminal.zeweco.com` and follow the steps.
3. At your DNS provider (where zeweco.com is managed), add the record Cloudflare shows (usually **CNAME** `terminal` → `your-project.pages.dev` or the proxy target they give).

After DNS propagates, https://terminal.zeweco.com/ will serve the app.

## SPA routing

Cloudflare Pages treats the site as an SPA when there is no top-level `404.html`, so client-side routes work without extra config. This project does not include `404.html`, so it will work as an SPA.

## Deploy from CLI (optional)

```bash
npm install -g wrangler
wrangler login
npm run build
wrangler pages deploy dist --project-name=zeweco-terminal
```
