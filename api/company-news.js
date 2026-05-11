const { fetchAlphaNewsSentiment, fetchFinnhub, getSymbol, sendJson } = require('./_utils');

function isoDate(daysAgo) {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return d.toISOString().slice(0, 10);
}

module.exports = async function handler(req, res) {
  const symbol = getSymbol(req);
  if (!symbol) return sendJson(res, 200, []);
  try {
    const data = await fetchFinnhub('company-news', {
      symbol,
      from: isoDate(21),
      to: isoDate(0)
    });
    const rows = Array.isArray(data) ? data : [];
    if (rows.length) return sendJson(res, 200, rows.slice(0, 8));
    const alpha = await fetchAlphaNewsSentiment(symbol).catch(() => []);
    const mapped = alpha.map(item => ({
      headline: item.title,
      summary: item.summary,
      source: item.source,
      url: item.url,
      datetime: item.time_published ? Date.parse(item.time_published.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/, '$1-$2-$3T$4:$5:$6Z')) / 1000 : undefined
    })).filter(item => item.headline);
    return sendJson(res, 200, mapped.slice(0, 8));
  } catch {
    return sendJson(res, 200, []);
  }
};
