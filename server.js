const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);

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

  if (req.method === "POST" && requestUrl.pathname === "/api/mexc/activity") {
    return handleMexcActivity(req, res);
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

  if (!apiKey || !apiSecret) {
    return sendJson(res, 400, {
      error: "Missing apiKey or apiSecret",
    });
  }

  try {
    const [deposits, withdrawals, account, exchangeInfo] = await Promise.all([
      signedGet({ endpoint: "/api/v3/capital/deposit/hisrec", params: { limit: "50" }, apiKey, apiSecret, apiBase }),
      signedGet({ endpoint: "/api/v3/capital/withdraw/history", params: { limit: "50" }, apiKey, apiSecret, apiBase }),
      signedGet({ endpoint: "/api/v3/account", params: {}, apiKey, apiSecret, apiBase }),
      publicGet({ endpoint: "/api/v3/exchangeInfo", apiBase }),
    ]);
    const tradeActivity = await fetchTradeActivity({
      apiKey,
      apiSecret,
      apiBase,
      account,
      exchangeInfo,
    });

    const activities = [
      ...mapDepositHistory(deposits),
      ...mapWithdrawalHistory(withdrawals),
      ...mapBalances(account),
      ...tradeActivity,
    ];

    return sendJson(res, 200, { activities });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
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

function mapDepositHistory(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((entry) => ({
    id: entry.id || `deposit-${entry.txId || entry.insertTime}`,
    date: toDateKey(entry.insertTime),
    type: "deposit",
    asset: entry.coin,
    amount: Number(entry.amount || 0),
    notes: `Deposit on ${entry.network || "unknown network"}`,
  }));
}

function mapWithdrawalHistory(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((entry) => ({
    id: entry.id || `withdrawal-${entry.txId || entry.applyTime}`,
    date: toDateKey(entry.applyTime),
    type: "withdrawal",
    asset: entry.coin,
    amount: Number(entry.amount || 0),
    notes: `Withdrawal on ${entry.network || "unknown network"}`,
  }));
}

function mapBalances(payload) {
  if (!payload || !Array.isArray(payload.balances)) {
    return [];
  }

  return payload.balances
    .filter((entry) => Number(entry.free || 0) > 0 || Number(entry.locked || 0) > 0)
    .slice(0, 15)
    .map((entry) => ({
      id: `balance-${entry.asset}`,
      date: toDateKey(Date.now()),
      type: "transfer",
      asset: entry.asset,
      amount: Number(entry.free || 0) + Number(entry.locked || 0),
      notes: "Current balance snapshot from MEXC account",
    }));
}

async function fetchTradeActivity({ apiKey, apiSecret, apiBase, account, exchangeInfo }) {
  const candidateSymbols = getCandidateTradeSymbols(account, exchangeInfo).slice(0, 12);
  const tradeResponses = await Promise.all(
    candidateSymbols.map((symbol) =>
      signedGet({
        endpoint: "/api/v3/myTrades",
        params: {
          symbol,
          limit: "100",
          startTime: (Date.now() - 30 * 24 * 60 * 60 * 1000).toString(),
          endTime: Date.now().toString(),
        },
        apiKey,
        apiSecret,
        apiBase,
      }).catch(() => [])
    )
  );

  return tradeResponses.flatMap((payload, index) => mapTradeHistory(payload, candidateSymbols[index]));
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
    notes: `${entry.isBuyer ? "Buy" : "Sell"} at ${entry.price} ${symbol} (${entry.isMaker ? "maker" : "taker"})`,
  }));
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
    res.end(content);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
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
