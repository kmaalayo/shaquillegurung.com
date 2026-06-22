# shaquillegurung.com

Personal hub & portfolio for **Shaquille Gurung** — the home for my projects.

Built as a small, real full-stack app: a Node + Express backend serving a fast,
dependency-light static front end. No bundler, no framework — easy to own and extend.

## Stack

- **Backend:** Node 20+ / Express 4
- **Frontend:** vanilla HTML / CSS / JS (system fonts, no build step)
- **Hosting:** Railway (custom domain `shaquillegurung.com`)

## Run it locally

```bash
cd C:\Dev\shaquillegurung.com
npm install
npm start
```

Then open **http://localhost:5050**

For auto-reload while editing:

```bash
cd C:\Dev\shaquillegurung.com
npm run dev
```

## Project structure

```
shaquillegurung.com/
  server.js          Express: serves /public + a small JSON API (/api/health, /api/contact)
  package.json
  .env.example       Copy to .env for local config
  public/
    index.html       The landing page
    style.css        Styling
    app.js           Footer year + live "backend online" check
    favicon.svg
```

## Deploy (Railway)

1. Push to GitHub (done).
2. In Railway: **New Project → Deploy from GitHub repo →** `kmaalayo/shaquillegurung.com`.
3. Railway auto-detects Node, runs `npm install`, then `npm start`. No config needed.
4. **Settings → Networking → Custom Domain →** add `shaquillegurung.com` and `www.shaquillegurung.com`.
5. Add the DNS records Railway gives you at the registrar (B2Guj panel).

## Roadmap

- [ ] Wire the contact form to real email (Resend) and switch the front end from `mailto:` to `/api/contact`.
- [ ] Add an Open Graph image (`/public/og.png`, 1200×630) for nice link previews.
- [ ] Bring projects onto subdomains (e.g. `claimsarathi.shaquillegurung.com`).
- [ ] Per-project detail pages.
