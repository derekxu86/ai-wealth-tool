function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'private, max-age=30');
  res.end(JSON.stringify(payload));
}

function badRequest(res, message) {
  sendJson(res, 400, { error: message });
}

function getSymbol(req) {
  return String(req.query?.symbol || '').trim().toUpperCase();
}

function twelveDataParams(symbol) {
  if (symbol.endsWith('.AX')) return { symbol: symbol.replace('.AX', ''), exchange: 'ASX' };
  if (symbol.endsWith('.HK')) return { symbol: symbol.replace('.HK', ''), exchange: 'HKEX' };
  if (symbol.endsWith('.TO')) return { symbol: symbol.replace('.TO', ''), exchange: 'TSX' };
  if (symbol.endsWith('.L')) return { symbol: symbol.replace('.L', ''), exchange: 'LSE' };
  return { symbol };
}

async function fetchTwelveQuote(rawSymbol) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey || !rawSymbol) return null;
  const params = twelveDataParams(rawSymbol);
  const url = new URL('https://api.twelvedata.com/quote');
  url.searchParams.set('symbol', params.symbol);
  if (params.exchange) url.searchParams.set('exchange', params.exchange);
  url.searchParams.set('apikey', apiKey);
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.status === 'error' || data.code || !data.close) return null;
  return {
    c: Number(data.close),
    dp: Number.isFinite(Number(data.percent_change)) ? Number(data.percent_change) : 0,
    volume: Number.isFinite(Number(data.volume)) ? Number(data.volume) : null,
    source: 'Twelve Data',
    symbol: rawSymbol,
    exchange: data.exchange || params.exchange || null
  };
}

async function fetchFinnhub(path, params = {}) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  const url = new URL(`https://finnhub.io/api/v1/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  }
  url.searchParams.set('token', apiKey);
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json();
}

async function fetchFinnhubQuote(symbol) {
  const data = await fetchFinnhub('quote', { symbol });
  const price = Number(data?.c);
  if (!Number.isFinite(price) || price <= 0) return null;
  const dp = data.dp !== undefined ? Number(data.dp) : 0;
  return { c: price, dp: Number.isFinite(dp) ? dp : 0, source: 'Finnhub Quote', symbol };
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

async function callOpenAIJson({ system, user, schema, name }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key is not configured.');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      text: {
        format: {
          type: 'json_schema',
          name,
          schema,
          strict: true
        }
      }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'OpenAI request failed');
  const text = data.output_text || data.output?.flatMap(item => item.content || []).find(c => c.type === 'output_text')?.text;
  return JSON.parse(text);
}

module.exports = {
  badRequest,
  callOpenAIJson,
  fetchFinnhub,
  fetchFinnhubQuote,
  fetchTwelveQuote,
  getSymbol,
  readJson,
  sendJson
};
