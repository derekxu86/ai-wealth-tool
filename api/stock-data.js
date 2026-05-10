const { badRequest, fetchFinnhub, fetchFinnhubQuote, fetchTwelveQuote, fetchYahooQuote, getSymbol, sendJson } = require('./_utils');

module.exports = async function handler(req, res) {
  const symbol = getSymbol(req);
  if (!symbol) return badRequest(res, 'Missing symbol.');
  try {
    const [twelveQuote, finnhubQuote, yahooQuote, recommendation, profile] = await Promise.all([
      fetchTwelveQuote(symbol).catch(() => null),
      fetchFinnhubQuote(symbol).catch(() => null),
      fetchYahooQuote(symbol).catch(() => null),
      fetchFinnhub('stock/recommendation', { symbol }).catch(() => null),
      fetchFinnhub('stock/profile2', { symbol }).catch(() => null)
    ]);
    let quote = twelveQuote || finnhubQuote || yahooQuote || { c: null, dp: null };
    const quoteAvailable = !(quote.c === null || quote.c === undefined || quote.c === 0);
    if (!quoteAvailable) quote = { c: null, dp: null };
    return sendJson(res, 200, {
      quote,
      sentiment: Array.isArray(recommendation) ? recommendation[0] || null : null,
      profile: profile || {},
      quoteAvailable,
      quoteSource: quote.source || (quoteAvailable ? 'Market Quote' : 'No Live Quote')
    });
  } catch {
    return sendJson(res, 502, { error: 'Stock data request failed.' });
  }
};
