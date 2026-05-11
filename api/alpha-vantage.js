const { fetchAlphaVantage, sendJson } = require('./_utils');

module.exports = async function handler(req, res) {
  const type = String(req.query?.type || 'top').toLowerCase();
  try {
    if (type === 'top') {
      const data = await fetchAlphaVantage({ function: 'TOP_GAINERS_LOSERS' });
      return sendJson(res, 200, data || {});
    }
    if (type === 'news') {
      const tickers = String(req.query?.tickers || '');
      const data = await fetchAlphaVantage({
        function: 'NEWS_SENTIMENT',
        tickers,
        sort: 'LATEST',
        limit: 20
      });
      return sendJson(res, 200, data || {});
    }
    return sendJson(res, 400, { error: 'Unsupported Alpha Vantage type.' });
  } catch {
    return sendJson(res, 200, {});
  }
};
