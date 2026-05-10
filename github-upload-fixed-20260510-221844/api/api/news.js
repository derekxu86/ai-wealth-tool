const { fetchFinnhub, sendJson } = require('./_utils');

module.exports = async function handler(req, res) {
  try {
    const data = await fetchFinnhub('news', { category: 'general' });
    return sendJson(res, 200, Array.isArray(data) ? data : []);
  } catch {
    return sendJson(res, 200, []);
  }
};
