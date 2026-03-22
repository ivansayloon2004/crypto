# Crypto Activity Calendar

A deployable public dashboard for tracking crypto activity on a calendar, with user-provided MEXC sync.

## What you get

- Monthly calendar with per-day trade previews
- Activity detail panel for selected dates
- Manual entry form for trades, deposits, withdrawals, and transfers
- JSON import for bulk activity
- Local browser storage so entries persist on your machine
- Public-friendly Node server that serves the site and proxies MEXC requests
- Google sign-in gate for the site itself
- Per-user MEXC connection flow using keys entered in the browser
- API key and API secret fields are masked with show/hide toggles
- MEXC keys default to session-only storage unless the user explicitly chooses to remember them
- Trade-only sync can use an optional symbol list and date range
- AI chart screenshot review section for educational analysis
- Server-side saved profile data for signed-in users

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
4. Sign in with Google
5. Enter your MEXC read-only API key and secret in the app
6. Optionally enter symbols like `BTCUSDT,ETHUSDT` and a sync date range
7. Press **Sync MEXC**

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

- Users must sign in with Google before the app will sync MEXC
- Each visitor enters their own MEXC API key and secret
- The browser sends those credentials to your backend only when syncing
- The backend uses the keys for that request and does not store them in files or memory after the request ends
- The frontend keeps keys only for the current browser session by default unless the user checks `Remember keys on this device for later`
- Users should create read-only API keys

## Server-side saved profile

- Signed-in users now get a lightweight saved profile on the server
- Notes, alerts, favorites, journal entries, and synced trades can follow the same Google account across devices
- Profile files are stored in `.data/users/`
- Add `.data/` to `.gitignore` so private user data does not get committed
- This is a simple file-backed persistence layer and is a good bridge before moving to a full database

## Important safety note

Because this is your server, users are trusting your site during sync. If you want production-grade security for many users, the next upgrade would be encrypted credential handling, accounts, and a database-backed auth flow.

## Google sign-in setup

1. Create a Google Cloud project
2. Create an OAuth 2.0 Web Client
3. Add your Render URL as an authorized JavaScript origin
4. Set `GOOGLE_CLIENT_ID` on your server

Example Render environment variable:

```text
GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

## AI chart review setup

Add these Render environment variables:

```text
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1
```

The chart review feature uses the OpenAI Responses API with image input. It is designed for educational chart interpretation and scenario analysis, not direct financial advice.

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
- The backend pulls only recent spot trade history using MEXC V3 `GET /api/v3/myTrades`.
- MEXC's trade-history endpoint requires a `symbol` and only returns up to roughly the past 1 month, so this app now lets users specify symbols and a date window. If they leave symbols blank, the app infers likely symbols from non-zero balances and supported exchange pairs. That means it may still miss older trades or trades in assets no longer held.
- Use read-only API keys whenever possible.
