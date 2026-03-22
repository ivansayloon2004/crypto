# Crypto Activity Calendar

A deployable public dashboard for tracking crypto activity on a calendar, with user-provided MEXC sync.

## What you get

- Monthly calendar with per-day event previews
- Activity detail panel for selected dates
- Manual entry form for trades, deposits, withdrawals, and transfers
- JSON import for bulk activity
- Local browser storage so entries persist on your machine
- Public-friendly Node server that serves the site and proxies MEXC requests
- Per-user MEXC connection flow using keys entered in the browser

## Files

- `index.html` - the app shell
- `styles.css` - the visual design
- `app.js` - calendar logic, storage, import, and sync trigger
- `server.js` - public web server and MEXC proxy endpoint
- `package.json` - deploy/start configuration
- `render.yaml` - one-click Render deployment config

## Local run

1. Install Node 18+
2. In this folder, run:

```powershell
node .\server.js
```

3. Open [http://localhost:3000](http://localhost:3000)
4. Enter your MEXC read-only API key and secret in the app
5. Press **Sync MEXC**

## Deploy publicly

### Option 1: Render

1. Create a GitHub repository
2. Push this folder to GitHub
3. Create a new Render Web Service from the repo
4. Render will detect [render.yaml](./render.yaml)
5. Deploy and open your Render URL

### Option 2: Railway or any Node host

1. Push this folder to GitHub
2. Create a Node web service
3. Set the start command to `node server.js`
4. Deploy

## How public MEXC sync works

- Each visitor enters their own MEXC API key and secret
- The browser sends those credentials to your backend only when syncing
- The backend uses the keys for that request and does not store them in files or memory after the request ends
- Users should create read-only API keys

## Important safety note

Because this is your server, users are trusting your site during sync. If you want production-grade security for many users, the next upgrade would be encrypted credential handling, accounts, and a database-backed auth flow.

## GitHub push commands

Run these in this folder after you create an empty repo on GitHub:

```powershell
git init
git add .
git commit -m "Initial crypto calendar site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

## MEXC notes

- The backend currently pulls deposit history, withdrawal history, and a current balance snapshot.
- The backend now also makes a best-effort pull of recent spot trade history using MEXC V3 `GET /api/v3/myTrades`.
- MEXC's trade-history endpoint requires a `symbol` and only returns up to roughly the past 1 month, so this app infers likely symbols from your non-zero balances and supported exchange pairs. That means it may miss older trades or trades in assets you no longer hold.
- Use read-only API keys whenever possible.
