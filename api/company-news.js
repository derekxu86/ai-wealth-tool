const { fetchFinnhub, getSymbol, sendJson } = require('./_utils');

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
    return sendJson(res, 200, rows.slice(0, 8));
  } catch {
    return sendJson(res, 200, []);
  }
};
