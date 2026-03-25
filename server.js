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
const DATA_DIR = path.join(__dirname, ".data");
const USER_DATA_DIR = path.join(DATA_DIR, "users");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
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

  if (req.method === "GET" && requestUrl.pathname === "/api/profile") {
    return withAuthenticatedUser(req, res, (user) => handleProfileGet(res, user));
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/profile") {
    return withAuthenticatedUser(req, res, (user) => handleProfileSave(req, res, user));
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/mexc/activity") {
    return withAuthenticatedUser(req, res, () => handleMexcActivity(req, res));
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/mexc/klines") {
    return withAuthenticatedUser(req, res, () => handleMexcKlines(requestUrl, res));
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/mexc/markets") {
    return withAuthenticatedUser(req, res, () => handleMexcMarkets(res, requestUrl));
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/fx/usdt-php") {
    return withAuthenticatedUser(req, res, () => handleUsdtPhpRate(res));
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/ai/chart-analysis") {
    return withAuthenticatedUser(req, res, () => handleChartAnalysis(req, res));
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/ai/monthly-review") {
    return withAuthenticatedUser(req, res, () => handleMonthlyReview(req, res));
  }

  return serveStatic(requestUrl.pathname, res);
});

server.listen(PORT, () => {
  console.log(`Crypto calendar running at http://localhost:${PORT}`);
});

ensureDataDirectories();

async function handleMexcActivity(req, res) {
  const body = await readJsonBody(req);
  const apiKey = String(body.apiKey || "").trim();
  const apiSecret = String(body.apiSecret || "").trim();
  const apiBase = String(body.apiBase || "https://api.mexc.com").trim();
  const symbols = parseSymbols(body.symbols);
  const includeFutures = body.includeFutures !== false;
  const timeRange = normalizeTimeRange(body.startDate, body.endDate);

  if (!apiKey || !apiSecret) {
    return sendJson(res, 400, {
      error: "Missing apiKey or apiSecret",
    });
  }

  try {
    const meta = {
      spot: {
        usedSymbols: [],
        inferredSymbols: false,
        startDate: toDateKey(timeRange.startTime),
        endDate: toDateKey(timeRange.endTime),
      },
      futures: {
        enabled: includeFutures,
        startDate: toDateKey(timeRange.startTime),
        endDate: toDateKey(timeRange.endTime),
      },
    };
    const activities = [];
    const prices = {};
    const failures = [];

    try {
      const [account, exchangeInfo] = await Promise.all([
        signedGet({ endpoint: "/api/v3/account", params: {}, apiKey, apiSecret, apiBase }),
        publicGet({ endpoint: "/api/v3/exchangeInfo", apiBase }),
      ]);
      const spotTrades = await fetchTradeActivity({
        apiKey,
        apiSecret,
        apiBase,
        account,
        exchangeInfo,
        symbols,
        timeRange,
      });

      activities.push(...spotTrades.activities);
      Object.assign(prices, await fetchTickerPrices({
        apiBase,
        symbols: spotTrades.meta.usedSymbols,
      }));
      meta.spot = spotTrades.meta;
    } catch (error) {
      meta.spot.error = error.message;
      failures.push(`spot: ${error.message}`);
    }

    if (includeFutures) {
      try {
        const futuresTrades = await fetchFuturesTradeActivity({
          apiKey,
          apiSecret,
          timeRange,
        });
        activities.push(...futuresTrades.activities);
        meta.futures = futuresTrades.meta;
      } catch (error) {
        meta.futures.error = error.message;
        failures.push(`futures: ${error.message}`);
      }
    }

    if (activities.length === 0 && failures.length > 0) {
      return sendJson(res, 500, { error: failures.join(" | ") });
    }

    return sendJson(res, 200, { activities, prices, meta });
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

async function handleMonthlyReview(req, res) {
  if (!OPENAI_API_KEY) {
    return sendJson(res, 500, { error: "Missing OPENAI_API_KEY on server" });
  }

  const body = await readJsonBody(req);
  const month = String(body.month || "").trim();
  const stats = body.stats && typeof body.stats === "object" ? body.stats : {};

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
                  "You are a crypto trading journal coach. Summarize the user's month in short educational sections titled: Highlights, Risk Issues, Best Symbols, Mistakes To Watch, and Next Focus. Do not give personalized financial commands or guaranteed predictions.",
              },
              {
                type: "input_text",
                text: `Month: ${month || "Unknown"}\nStats: ${JSON.stringify(stats)}`,
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

    return sendJson(res, 200, { analysis: extractResponseText(payload) });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
}

function handleProfileGet(res, user) {
  try {
    const profile = readUserProfile(user);
    return sendJson(res, 200, { profile });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
}

async function handleProfileSave(req, res, user) {
  const body = await readJsonBody(req);
  const nextProfile = sanitizeProfilePayload(body);

  try {
    writeUserProfile(user, nextProfile);
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
}

async function handleMexcKlines(requestUrl, res) {
  const symbol = String(requestUrl.searchParams.get("symbol") || "BTCUSDT").trim().toUpperCase();
  const interval = String(requestUrl.searchParams.get("interval") || "4h").trim();
  const limit = Math.min(200, Math.max(20, Number(requestUrl.searchParams.get("limit") || 80)));
  const marketType = String(requestUrl.searchParams.get("type") || "spot").trim().toLowerCase();

  try {
    if (marketType === "futures") {
      const futuresSymbol = normalizeFuturesSymbol(symbol);
      const futuresInterval = mapFuturesInterval(interval);
      const payload = await publicGet({
        endpoint: `/api/v1/contract/kline/${encodeURIComponent(futuresSymbol)}?interval=${encodeURIComponent(futuresInterval)}`,
        apiBase: "https://contract.mexc.com",
      });
      return sendJson(res, 200, {
        symbol: futuresSymbol,
        interval,
        marketType,
        klines: mapFuturesKlines(payload?.data).slice(-limit),
      });
    }

    const payload = await publicGet({
      endpoint: `/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`,
      apiBase: "https://api.mexc.com",
    });
    return sendJson(res, 200, { symbol, interval, marketType, klines: payload });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
}

async function handleMexcMarkets(res, requestUrl) {
  const marketType = String(requestUrl?.searchParams?.get("type") || "spot").trim().toLowerCase();
  try {
    if (marketType === "futures") {
      const [detailsPayload, tickersPayload] = await Promise.all([
        publicGet({
          endpoint: "/api/v1/contract/detail",
          apiBase: "https://contract.mexc.com",
        }),
        publicGet({
          endpoint: "/api/v1/contract/ticker",
          apiBase: "https://contract.mexc.com",
        }),
      ]);

      const detailMap = new Map(
        (Array.isArray(detailsPayload?.data) ? detailsPayload.data : [])
          .filter((entry) => entry?.apiAllowed !== false)
          .map((entry) => [String(entry.symbol || "").toUpperCase(), entry])
      );

      const markets = (Array.isArray(tickersPayload?.data) ? tickersPayload.data : [])
        .map((entry) => {
          const symbol = String(entry.symbol || "").toUpperCase();
          const details = detailMap.get(symbol);
          if (!details) {
            return null;
          }

          return {
            symbol,
            marketType,
            baseAsset: String(details.baseCoin || ""),
            quoteAsset: String(details.quoteCoin || ""),
            lastPrice: Number(entry.lastPrice || 0),
            priceChangePercent: Number(entry.riseFallRate || 0) * 100,
            volume: Number(entry.volume24 || 0),
            quoteVolume: Number(entry.amount24 || 0),
          };
        })
        .filter(Boolean)
        .sort((left, right) => Number(right.quoteVolume || 0) - Number(left.quoteVolume || 0));

      return sendJson(res, 200, { marketType, markets });
    }

    const [exchangeInfo, tickers] = await Promise.all([
      publicGet({
        endpoint: "/api/v3/exchangeInfo",
        apiBase: "https://api.mexc.com",
      }),
      publicGet({
        endpoint: "/api/v3/ticker/24hr",
        apiBase: "https://api.mexc.com",
      }),
    ]);

    const activeSymbols = new Map(
      (Array.isArray(exchangeInfo?.symbols) ? exchangeInfo.symbols : [])
        .filter((entry) => entry?.status === "1" || entry?.status === 1 || entry?.status === "ENABLED")
        .map((entry) => [String(entry.symbol || "").toUpperCase(), entry])
    );

    const markets = (Array.isArray(tickers) ? tickers : [])
      .map((entry) => {
        const symbol = String(entry.symbol || "").toUpperCase();
        const details = activeSymbols.get(symbol);
        if (!details) {
          return null;
        }

        return {
          symbol,
          marketType,
          baseAsset: String(details.baseAsset || ""),
          quoteAsset: String(details.quoteAsset || ""),
          lastPrice: Number(entry.lastPrice || 0),
          priceChangePercent: Number(entry.priceChangePercent || 0) * 100,
          volume: Number(entry.volume || 0),
          quoteVolume: Number(entry.quoteVolume || 0),
        };
      })
      .filter(Boolean)
      .sort((left, right) => Number(right.quoteVolume || 0) - Number(left.quoteVolume || 0));

    return sendJson(res, 200, { marketType, markets });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
}

async function handleUsdtPhpRate(res) {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const payload = await response.json();
    const rate = Number(payload?.rates?.PHP || 0);
    if (!response.ok || !rate) {
      throw new Error(payload?.error || "Could not load PHP rate");
    }
    return sendJson(res, 200, {
      base: "USDT",
      quote: "PHP",
      rate,
      source: "open.er-api.com (USD proxy for USDT)",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
}

function normalizeFuturesSymbol(symbol) {
  const raw = String(symbol || "").trim().toUpperCase();
  if (raw.includes("_")) {
    return raw;
  }
  if (raw.endsWith("USDT")) {
    return `${raw.slice(0, -4)}_USDT`;
  }
  if (raw.endsWith("USD")) {
    return `${raw.slice(0, -3)}_USD`;
  }
  return raw;
}

function mapFuturesInterval(interval) {
  const map = {
    "1m": "Min1",
    "5m": "Min5",
    "15m": "Min15",
    "30m": "Min30",
    "60m": "Min60",
    "4h": "Hour4",
    "1d": "Day1",
    "1W": "Week1",
  };

  return map[String(interval || "").trim()] || "Hour4";
}

function mapFuturesKlines(data) {
  const source = data && Array.isArray(data.time) ? data.time : [];
  return source.map((time, index) => ([
    Number(time || 0) * 1000,
    Number(data.open?.[index] || 0),
    Number(data.high?.[index] || 0),
    Number(data.low?.[index] || 0),
    Number(data.close?.[index] || 0),
    Number(data.vol?.[index] || 0),
  ]));
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

async function futuresPrivateGet({ endpoint, params, apiKey, apiSecret, apiBase = "https://contract.mexc.com" }) {
  const requestTime = Date.now().toString();
  const requestParam = buildFuturesRequestParam(params);
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(`${apiKey}${requestTime}${requestParam}`)
    .digest("hex");
  const requestUrl = requestParam ? `${apiBase}${endpoint}?${requestParam}` : `${apiBase}${endpoint}`;

  const response = await fetch(requestUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ApiKey: apiKey,
      "Request-Time": requestTime,
      Signature: signature,
    },
  });

  const payload = await response.json();
  if (!response.ok || payload?.success === false || Number(payload?.code ?? 0) !== 0) {
    throw new Error(payload?.message || payload?.error || `MEXC futures request failed with ${response.status}`);
  }

  return payload.data;
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
  const meta = {
    inferredSymbols: symbols.length === 0,
    usedSymbols: candidateSymbols,
    startDate: new Date(timeRange.startTime).toISOString().slice(0, 10),
    endDate: new Date(timeRange.endTime).toISOString().slice(0, 10),
  };
  if (candidateSymbols.length === 0) {
    return { activities: [], meta };
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

  return {
    activities: tradeResponses.flatMap((payload, index) => mapTradeHistory(payload, candidateSymbols[index])),
    meta,
  };
}

async function fetchFuturesTradeActivity({ apiKey, apiSecret, timeRange }) {
  const pageSize = 100;
  const maxPages = 5;
  const rows = [];

  for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
    const payload = await futuresPrivateGet({
      endpoint: "/api/v1/private/order/list/history_orders",
      params: {
        states: "3",
        start_time: String(timeRange.startTime),
        end_time: String(timeRange.endTime),
        page_num: String(pageNum),
        page_size: String(pageSize),
      },
      apiKey,
      apiSecret,
    });

    const resultList = extractFuturesRows(payload);
    rows.push(...resultList);

    const totalPages = Number(payload?.totalPage || payload?.totalPages || 1);
    if (resultList.length < pageSize || pageNum >= totalPages) {
      break;
    }
  }

  const activities = rows
    .filter((entry) => Number(entry.dealVol || entry.vol || 0) > 0)
    .map(mapFuturesHistoryOrder);
  const usedSymbols = [...new Set(activities.map((entry) => String(entry.asset || "").trim().toUpperCase()).filter(Boolean))];

  return {
    activities,
    meta: {
      enabled: true,
      usedSymbols,
      tradeCount: activities.length,
      allContracts: true,
      startDate: toDateKey(timeRange.startTime),
      endDate: toDateKey(timeRange.endTime),
    },
  };
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

function extractFuturesRows(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.resultList)) {
    return payload.resultList;
  }

  if (Array.isArray(payload?.list)) {
    return payload.list;
  }

  return [];
}

function mapFuturesHistoryOrder(entry) {
  const sideCode = Number(entry?.side || 0);
  const quantity = Number(entry?.dealVol || entry?.vol || 0);
  const price = Number(entry?.dealAvgPrice || entry?.price || 0);
  const fee = Math.abs(Number(entry?.takerFee || 0)) + Math.abs(Number(entry?.makerFee || 0));
  const timestamp = Number(entry?.updateTime || entry?.createTime || Date.now());
  const isClosingTrade = sideCode === 2 || sideCode === 4;

  return {
    id: entry.orderId || `futures-${entry.symbol}-${timestamp}`,
    date: toDateKey(timestamp),
    type: "trade",
    asset: String(entry.symbol || "").toUpperCase(),
    amount: quantity,
    executedAt: new Date(timestamp).toISOString(),
    side: isClosingTrade ? "sell" : "buy",
    displaySide: describeFuturesSide(sideCode),
    marketType: "futures",
    isClosingTrade,
    price,
    quoteAmount: quantity * price,
    baseAsset: String(entry.symbol || "").toUpperCase(),
    fee,
    feeAsset: String(entry.feeCurrency || "USDT").toUpperCase(),
    isMaker: Number(entry.makerFee || 0) > 0 && Number(entry.takerFee || 0) === 0,
    realizedPnl: Number(entry.profit || 0),
    notes: `Futures ${describeFuturesSide(sideCode)} on ${String(entry.symbol || "").toUpperCase()}`,
  };
}

function describeFuturesSide(sideCode) {
  const labels = {
    1: "Open Long",
    2: "Close Short",
    3: "Open Short",
    4: "Close Long",
  };

  return labels[Number(sideCode || 0)] || "Futures Trade";
}

function buildFuturesRequestParam(params) {
  return Object.entries(params || {})
    .filter(([, value]) => value !== null && value !== undefined && String(value) !== "")
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value)).replace(/\+/g, "%20")}`)
    .join("&");
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

function ensureDataDirectories() {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

function readUserProfile(user) {
  const filePath = getUserProfilePath(user);
  if (!fs.existsSync(filePath)) {
    return getDefaultProfile();
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return {
    ...getDefaultProfile(),
    ...sanitizeProfilePayload(parsed),
  };
}

function writeUserProfile(user, profile) {
  const filePath = getUserProfilePath(user);
  const payload = {
    ...getDefaultProfile(),
    ...sanitizeProfilePayload(profile),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function getUserProfilePath(user) {
  const userId = String(user?.sub || user?.email || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(USER_DATA_DIR, `${userId}.json`);
}

function getDefaultProfile() {
  return {
    events: [],
    notesByDate: {},
    favorites: [],
    alerts: [],
    symbolJournal: {},
    watchlists: { Main: [] },
    goals: {},
    habitsByDate: {},
    preferences: {},
    updatedAt: null,
  };
}

function sanitizeProfilePayload(profile) {
  const source = profile && typeof profile === "object" ? profile : {};
  return {
    events: Array.isArray(source.events) ? source.events : [],
    notesByDate: source.notesByDate && typeof source.notesByDate === "object" ? source.notesByDate : {},
    favorites: Array.isArray(source.favorites) ? source.favorites : [],
    alerts: Array.isArray(source.alerts) ? source.alerts : [],
    symbolJournal: source.symbolJournal && typeof source.symbolJournal === "object" ? source.symbolJournal : {},
    watchlists: source.watchlists && typeof source.watchlists === "object" ? source.watchlists : { Main: [] },
    goals: source.goals && typeof source.goals === "object" ? source.goals : {},
    habitsByDate: source.habitsByDate && typeof source.habitsByDate === "object" ? source.habitsByDate : {},
    preferences: source.preferences && typeof source.preferences === "object" ? source.preferences : {},
  };
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
