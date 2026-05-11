const { badRequest, fetchFinnhubQuote, fetchTwelveQuote, fetchYahooQuote, getSymbol, sendJson } = require('./_utils');

module.exports = async function handler(req, res) {
  const symbol = getSymbol(req);
  if (!symbol) return badRequest(res, 'Missing symbol.');
  try {
    const quote = await fetchTwelveQuote(symbol) || await fetchFinnhubQuote(symbol) || await fetchYahooQuote(symbol);
    if (!quote) return sendJson(res, 502, { error: 'Quote unavailable.' });
    return sendJson(res, 200, quote);
  } catch {
    return sendJson(res, 502, { error: 'Quote request failed.' });
  }
};
