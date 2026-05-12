const { badRequest, getSymbol, sendJson } = require('./_utils');

function ashareCode(symbol) {
  return String(symbol || '').toUpperCase().replace('.SS', '').replace('.SZ', '');
}

function ashareSymbolFromCode(code) {
  const clean = ashareCode(code);
  if (!/^\d{6}$/.test(clean)) return clean;
  return `${clean}${/^6|^9/.test(clean) ? '.SS' : '.SZ'}`;
}

function sinaCode(symbol) {
  const code = ashareCode(symbol);
  if (!/^\d{6}$/.test(code)) return '';
  return `${/^6|^9/.test(code) ? 'sh' : 'sz'}${code}`;
}

function eastmoneySecid(symbol) {
  const code = ashareCode(symbol);
  return `${/^6|^9/.test(code) ? '1' : '0'}.${code}`;
}

async function fetchSinaQuote(symbol) {
  const code = sinaCode(symbol);
  if (!code) return null;
  const response = await fetch(`https://hq.sinajs.cn/list=${code}`, {
    headers: {
      referer: 'https://finance.sina.com.cn/',
      'user-agent': 'Mozilla/5.0'
    }
  });
  if (!response.ok) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  const text = new TextDecoder('gb18030').decode(buffer);
  const match = text.match(/="([^"]*)"/);
  const raw = match?.[1] || '';
  if (!raw || !raw.includes(',')) return null;
  const parts = raw.split(',');
  const name = parts[0] || symbol;
  const open = Number(parts[1]);
  const prev = Number(parts[2]);
  const price = Number(parts[3]);
  const high = Number(parts[4]);
  const low = Number(parts[5]);
  const volume = Number(parts[8]);
  const amount = Number(parts[9]);
  if (!Number.isFinite(price) || price <= 0) return null;
  const dp = Number.isFinite(prev) && prev > 0 ? ((price - prev) / prev) * 100 : 0;
  return {
    symbol: ashareSymbolFromCode(symbol),
    name,
    quote: {
      c: price,
      pc: Number.isFinite(prev) ? prev : null,
      dp: Number.isFinite(dp) ? dp : 0,
      open: Number.isFinite(open) ? open : null,
      high: Number.isFinite(high) ? high : null,
      low: Number.isFinite(low) ? low : null,
      volume: Number.isFinite(volume) ? volume : null,
      amount: Number.isFinite(amount) ? amount : null,
      t: Date.now()
    },
    profile: { name, ticker: ashareSymbolFromCode(symbol), country: 'China' },
    fundamentals: {
      volume: Number.isFinite(volume) ? volume : null,
      amount: Number.isFinite(amount) ? amount : null
    },
    quoteSource: 'Sina Finance'
  };
}

async function fetchEastmoneyQuote(symbol) {
  const fields = 'f43,f57,f58,f60,f116,f162,f167,f168,f170,f173';
  const url = new URL('https://push2.eastmoney.com/api/qt/stock/get');
  url.searchParams.set('secid', eastmoneySecid(symbol));
  url.searchParams.set('ut', 'fa5fd1943c7b386f172d6893dbfba10b');
  url.searchParams.set('fields', fields);
  const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!response.ok) return null;
  const data = await response.json();
  const row = data?.data;
  if (!row || !row.f57) return null;
  const price = Number(row.f43);
  const prev = Number(row.f60);
  const pct = Number(row.f170);
  return {
    symbol: ashareSymbolFromCode(row.f57),
    name: row.f58 || symbol,
    quote: {
      c: Number.isFinite(price) ? price / 100 : null,
      pc: Number.isFinite(prev) ? prev / 100 : null,
      dp: Number.isFinite(pct) ? pct / 100 : 0,
      t: Date.now()
    },
    profile: { name: row.f58 || symbol, ticker: ashareSymbolFromCode(row.f57), country: 'China' },
    fundamentals: {
      marketCap: row.f116,
      pe: row.f162,
      pb: row.f167,
      turnover: row.f168,
      dividendYield: row.f173
    },
    quoteSource: 'Eastmoney'
  };
}

module.exports = async function handler(req, res) {
  const symbol = getSymbol(req);
  if (!symbol) return badRequest(res, 'Missing symbol.');
  try {
    const quote = await fetchSinaQuote(symbol) || await fetchEastmoneyQuote(symbol);
    if (!quote) return sendJson(res, 502, { error: 'A-share quote unavailable.' });
    return sendJson(res, 200, quote);
  } catch {
    return sendJson(res, 502, { error: 'A-share quote request failed.' });
  }
};
