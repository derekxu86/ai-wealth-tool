const { fetchFinnhub, sendJson } = require('./_utils');

module.exports = async function handler(req, res) {
  const q = String(req.query?.q || '').trim();
  if (!q) return sendJson(res, 200, { result: [] });
  try {
    const data = await fetchFinnhub('search', { q });
    return sendJson(res, 200, data || { result: [] });
  } catch {
    return sendJson(res, 200, { result: [] });
  }
};
