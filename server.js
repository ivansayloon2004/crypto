const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const GOOGLE_CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || "").trim();
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || "").trim();
const OPENAI_MODEL = String(process.env.OPENAI_MODEL || "gpt-4.1").trim();
const SESSION_COOKIE = "crypto_calendar_session";
const sessions = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://localhost:${PORT}`);
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, date: new Date().toISOString() });
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/auth/session") {
    return handleSession(req, res);
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/auth/google") {
    return handleGoogleAuth(req, res);
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/auth/logout") {
    return handleLogout(req, res);
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/mexc/activity") {
    return withAuthenticatedUser(req, res, () => handleMexcActivity(req, res));
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/ai/chart-analysis") {
    return withAuthenticatedUser(req, res, () => handleChartAnalysis(req, res));
  }

  return serveStatic(requestUrl.pathname, res);
});

server.listen(PORT, () => {
  console.log(`Crypto calendar running at http://localhost:${PORT}`);
});

async function handleMexcActivity(req, res) {
  const body = await readJsonBody(req);
  const apiKey = String(body.apiKey || "").trim();
  const apiSecret = String(body.apiSecret || "").trim();
  const apiBase = String(body.apiBase || "https://api.mexc.com").trim();
  const symbols = parseSymbols(body.symbols);
  const timeRange = normalizeTimeRange(body.startDate, body.endDate);

  if (!apiKey || !apiSecret) {
    return sendJson(res, 400, {
      error: "Missing apiKey or apiSecret",
    });
  }

  try {
    const [account, exchangeInfo] = await Promise.all([
      signedGet({ endpoint: "/api/v3/account", params: {}, apiKey, apiSecret, apiBase }),
      publicGet({ endpoint: "/api/v3/exchangeInfo", apiBase }),
    ]);
    const candidateSymbols = (symbols.length > 0 ? symbols : getCandidateTradeSymbols(account, exchangeInfo)).slice(0, 20);
    const tradeActivity = await fetchTradeActivity({
      apiKey,
      apiSecret,
      apiBase,
      account,
      exchangeInfo,
      symbols: candidateSymbols,
      timeRange,
    });
    const prices = await fetchTickerPrices({
      apiBase,
      symbols: candidateSymbols,
    });

    return sendJson(res, 200, { activities: tradeActivity, prices });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
}

async function handleGoogleAuth(req, res) {
  if (!GOOGLE_CLIENT_ID) {
    return sendJson(res, 500, { error: "Missing GOOGLE_CLIENT_ID on server" });
  }

  const body = await readJsonBody(req);
  const credential = String(body.credential || "").trim();
  if (!credential) {
    return sendJson(res, 400, { error: "Missing Google credential" });
  }

  try {
    const tokenInfo = await fetchGoogleTokenInfo(credential);
    if (!isValidGoogleTokenInfo(tokenInfo)) {
      return sendJson(res, 401, { error: "Invalid Google token" });
    }

    if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
      return sendJson(res, 401, { error: "Google client ID does not match this site" });
    }

    const sessionId = crypto.randomBytes(24).toString("hex");
    const user = {
      sub: tokenInfo.sub,
      email: tokenInfo.email,
      name: tokenInfo.name || tokenInfo.email,
      picture: tokenInfo.picture || "",
    };

    sessions.set(sessionId, {
      user,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    setSessionCookie(res, sessionId);
    return sendJson(res, 200, {
      authenticated: true,
      user,
    });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
}

async function handleChartAnalysis(req, res) {
  if (!OPENAI_API_KEY) {
    return sendJson(res, 500, { error: "Missing OPENAI_API_KEY on server" });
  }

  const body = await readJsonBody(req);
  const imageDataUrl = String(body.imageDataUrl || "").trim();
  const context = String(body.context || "").trim();

  if (!imageDataUrl.startsWith("data:image/")) {
    return sendJson(res, 400, { error: "Missing valid chart screenshot" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  "You are a crypto chart review assistant. Analyze the uploaded chart screenshot and provide educational market observations only. Do not give direct personalized financial advice or commands to buy or sell. Return short sections titled: Market Structure, Key Levels, Bullish Scenario, Bearish Scenario, Risk Notes, and What To Watch Next. If indicators or timeframe are unclear, say so.",
              },
              {
                type: "input_text",
                text: context ? `User context: ${context}` : "User context: none provided.",
              },
              {
                type: "input_image",
                image_url: imageDataUrl,
              },
            ],
          },
        ],
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error?.message || "OpenAI request failed");
    }

    const analysis = extractResponseText(payload);
    return sendJson(res, 200, { analysis });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
}

function handleSession(req, res) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return sendJson(res, 200, { authenticated: false });
  }

  return sendJson(res, 200, {
    authenticated: true,
    user: session.user,
  });
}

function handleLogout(req, res) {
  const cookies = parseCookies(req.headers.cookie || "");
  const sessionId = cookies[SESSION_COOKIE];
  if (sessionId) {
    sessions.delete(sessionId);
  }

  clearSessionCookie(res);
  return sendJson(res, 200, { ok: true });
}

function withAuthenticatedUser(req, res, callback) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return sendJson(res, 401, { error: "Sign in with Google first" });
  }

  return callback(session.user);
}

async function signedGet({ endpoint, params, apiKey, apiSecret, apiBase }) {
  const searchParams = new URLSearchParams({
    ...params,
    recvWindow: "5000",
    timestamp: Date.now().toString(),
  });
  const signature = crypto.createHmac("sha256", apiSecret).update(searchParams.toString()).digest("hex");
  searchParams.set("signature", signature);

  const response = await fetch(`${apiBase}${endpoint}?${searchParams.toString()}`, {
    method: "GET",
    headers: {
      "X-MEXC-APIKEY": apiKey,
      "Content-Type": "application/json",
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.msg || payload.message || `MEXC request failed with ${response.status}`);
  }

  return payload;
}

async function publicGet({ endpoint, apiBase }) {
  const response = await fetch(`${apiBase}${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.msg || payload.message || `MEXC request failed with ${response.status}`);
  }

  return payload;
}

async function fetchTradeActivity({ apiKey, apiSecret, apiBase, account, exchangeInfo, symbols, timeRange }) {
  const candidateSymbols = (symbols.length > 0 ? symbols : getCandidateTradeSymbols(account, exchangeInfo)).slice(0, 20);
  if (candidateSymbols.length === 0) {
    return [];
  }

  const tradeResponses = await Promise.all(
    candidateSymbols.map((symbol) =>
      signedGet({
        endpoint: "/api/v3/myTrades",
        params: {
          symbol,
          limit: "100",
          startTime: timeRange.startTime.toString(),
          endTime: timeRange.endTime.toString(),
        },
        apiKey,
        apiSecret,
        apiBase,
      }).catch(() => [])
    )
  );

  return tradeResponses.flatMap((payload, index) => mapTradeHistory(payload, candidateSymbols[index]));
}

async function fetchTickerPrices({ apiBase, symbols }) {
  const uniqueSymbols = [...new Set((symbols || []).filter(Boolean))];
  if (uniqueSymbols.length === 0) {
    return {};
  }

  const results = await Promise.all(
    uniqueSymbols.map((symbol) =>
      publicGet({ endpoint: `/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`, apiBase })
        .then((payload) => [symbol, Number(payload.price || 0)])
        .catch(() => [symbol, 0])
    )
  );

  return Object.fromEntries(results);
}

function getCandidateTradeSymbols(account, exchangeInfo) {
  const balances = Array.isArray(account?.balances) ? account.balances : [];
  const symbols = Array.isArray(exchangeInfo?.symbols) ? exchangeInfo.symbols : [];
  const availableSymbols = new Set(symbols.map((entry) => entry.symbol));
  const assetSet = new Set(
    balances
      .filter((entry) => Number(entry.free || 0) > 0 || Number(entry.locked || 0) > 0)
      .map((entry) => entry.asset)
  );
  const commonQuotes = ["USDT", "USDC", "BTC", "ETH", "MX"];
  const candidates = new Set();

  for (const asset of assetSet) {
    for (const quote of commonQuotes) {
      if (asset === quote) {
        continue;
      }

      const direct = `${asset}${quote}`;
      const inverse = `${quote}${asset}`;
      if (availableSymbols.has(direct)) {
        candidates.add(direct);
      }
      if (availableSymbols.has(inverse)) {
        candidates.add(inverse);
      }
    }
  }

  return [...candidates];
}

function mapTradeHistory(payload, symbol) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((entry) => ({
    id: entry.id || `trade-${symbol}-${entry.orderId}-${entry.time}`,
    date: toDateKey(entry.time),
    type: "trade",
    asset: symbol,
    amount: Number(entry.qty || 0),
    executedAt: new Date(entry.time).toISOString(),
    side: entry.isBuyer ? "buy" : "sell",
    price: Number(entry.price || 0),
    quoteAmount: Number(entry.quoteQty || 0),
    baseAsset: String(symbol || ""),
    fee: Number(entry.commission || 0),
    feeAsset: String(entry.commissionAsset || ""),
    isMaker: Boolean(entry.isMaker),
    notes: `${entry.isBuyer ? "Buy" : "Sell"} at ${entry.price} ${symbol} (${entry.isMaker ? "maker" : "taker"})`,
  }));
}

function parseSymbols(value) {
  if (typeof value !== "string") {
    return [];
  }

  return [...new Set(
    value
      .split(",")
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean)
  )];
}

function normalizeTimeRange(startDate, endDate) {
  const now = new Date();
  const defaultEnd = now.getTime();
  const defaultStart = defaultEnd - 30 * 24 * 60 * 60 * 1000;
  const parsedStart = parseDateOnly(startDate, "start");
  const parsedEnd = parseDateOnly(endDate, "end");
  let startTime = parsedStart ?? defaultStart;
  let endTime = parsedEnd ?? defaultEnd;

  if (endTime < startTime) {
    [startTime, endTime] = [endTime, startTime];
  }

  const maxWindow = 30 * 24 * 60 * 60 * 1000;
  if (endTime - startTime > maxWindow) {
    startTime = endTime - maxWindow;
  }

  return { startTime, endTime };
}

function parseDateOnly(value, mode) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const suffix = mode === "end" ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const parsed = new Date(`${value}${suffix}`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.getTime();
}

function serveStatic(requestPath, res) {
  const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.join(__dirname, normalizedPath);

  if (!filePath.startsWith(__dirname)) {
    return sendJson(res, 403, { error: "Forbidden" });
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": mimeTypes[extension] || "text/plain; charset=utf-8" });
    res.end(injectRuntimeConfig(filePath, content));
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function extractResponseText(payload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const outputs = Array.isArray(payload.output) ? payload.output : [];
  const parts = [];
  outputs.forEach((item) => {
    if (item.type !== "message" || !Array.isArray(item.content)) {
      return;
    }
    item.content.forEach((content) => {
      if (content.type === "output_text" && content.text) {
        parts.push(content.text);
      }
    });
  });

  return parts.join("\n\n").trim();
}

function toDateKey(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function fetchGoogleTokenInfo(credential) {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
    method: "GET",
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || "Google token verification failed");
  }

  return payload;
}

function isValidGoogleTokenInfo(tokenInfo) {
  const issuer = tokenInfo.iss;
  const expiresAt = Number(tokenInfo.exp || 0) * 1000;
  return (
    Boolean(tokenInfo.sub) &&
    Boolean(tokenInfo.email) &&
    (issuer === "accounts.google.com" || issuer === "https://accounts.google.com") &&
    expiresAt > Date.now()
  );
}

function parseCookies(cookieHeader) {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((all, part) => {
      const separator = part.indexOf("=");
      if (separator < 1) {
        return all;
      }

      const key = part.slice(0, separator);
      const value = part.slice(separator + 1);
      all[key] = decodeURIComponent(value);
      return all;
    }, {});
}

function getSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const sessionId = cookies[SESSION_COOKIE];
  if (!sessionId) {
    return null;
  }

  const session = sessions.get(sessionId);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

function setSessionCookie(res, sessionId) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${getSecureCookieSuffix()}`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${getSecureCookieSuffix()}`);
}

function injectRuntimeConfig(filePath, content) {
  if (path.basename(filePath) !== "index.html") {
    return content;
  }

  return Buffer.from(
    content.toString("utf8").replaceAll("%GOOGLE_CLIENT_ID%", GOOGLE_CLIENT_ID || "")
  );
}

function getSecureCookieSuffix() {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}
