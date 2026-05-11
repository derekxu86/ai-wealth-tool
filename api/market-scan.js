const { callOpenAIJson, fetchTwelveQuote, fetchYahooQuote, sendJson } = require('./_utils');

const scanUniverse = [
  { name: 'NVIDIA Corp', symbol: 'NVDA', groups: ['aiHot', 'quality'] },
  { name: 'Astera Labs', symbol: 'ALAB', groups: ['aiHot', 'smallCapExplosive'] },
  { name: 'Vertiv Holdings', symbol: 'VRT', groups: ['aiHot', 'infrastructure'] },
  { name: 'Super Micro Computer', symbol: 'SMCI', groups: ['aiHot', 'smallCapExplosive'] },
  { name: 'Palantir Technologies', symbol: 'PLTR', groups: ['aiHot', 'smallCapExplosive'] },
  { name: 'Microsoft Corp', symbol: 'MSFT', groups: ['cloud', 'quality'] },
  { name: 'Cloudflare', symbol: 'NET', groups: ['cloud'] },
  { name: 'Datadog', symbol: 'DDOG', groups: ['cloud'] },
  { name: 'ServiceNow', symbol: 'NOW', groups: ['cloud', 'quality'] },
  { name: 'Rocket Lab USA', symbol: 'RKLB', groups: ['smallCapExplosive'] },
  { name: 'IonQ', symbol: 'IONQ', groups: ['smallCapExplosive'] },
  { name: 'SoundHound AI', symbol: 'SOUN', groups: ['smallCapExplosive'] },
  { name: 'Recursion Pharma', symbol: 'RXRX', groups: ['biotech', 'smallCapExplosive'] },
  { name: 'CRISPR Therapeutics', symbol: 'CRSP', groups: ['biotech'] },
  { name: 'Beam Therapeutics', symbol: 'BEAM', groups: ['biotech'] },
  { name: 'Cameco Corp', symbol: 'CCJ', groups: ['energyHot'] },
  { name: 'Uranium Energy', symbol: 'UEC', groups: ['energyHot', 'smallCapExplosive'] },
  { name: 'Global X Uranium ETF', symbol: 'URA', groups: ['energyHot'] },
  { name: 'First Solar', symbol: 'FSLR', groups: ['energyHot', 'infrastructure'] },
  { name: 'Global X Lithium & Battery Tech', symbol: 'LIT', groups: ['battery'] },
  { name: 'Albemarle Corp', symbol: 'ALB', groups: ['battery'] },
  { name: 'Sigma Lithium', symbol: 'SGML', groups: ['battery', 'smallCapExplosive'] },
  { name: 'QuantumScape', symbol: 'QS', groups: ['battery', 'smallCapExplosive'] },
  { name: 'Utilities Select Sector SPDR', symbol: 'XLU', groups: ['defensive', 'infrastructure', 'dividend'] },
  { name: 'NextEra Energy', symbol: 'NEE', groups: ['defensive', 'infrastructure'] },
  { name: 'SPDR Gold Shares', symbol: 'GLD', groups: ['defensive'] },
  { name: 'SPDR 1-3 Month T-Bill', symbol: 'BIL', groups: ['cash', 'defensive'] },
  { name: 'Vanguard Total Bond Market', symbol: 'BND', groups: ['cash'] },
  { name: 'iShares 1-3 Year Treasury Bond', symbol: 'SHY', groups: ['cash'] },
  { name: 'ProShares S&P 500 Dividend Aristocrats', symbol: 'NOBL', groups: ['dividend'] },
  { name: 'Schwab US Dividend Equity', symbol: 'SCHD', groups: ['dividend'] },
  { name: 'Global X US Infrastructure ETF', symbol: 'PAVE', groups: ['infrastructure'] },
  { name: 'First Trust Nasdaq Clean Edge Smart Grid', symbol: 'GRID', groups: ['infrastructure'] },
  { name: 'Taiwan Semi', symbol: 'TSM', groups: ['quality'] },
  { name: 'Broadcom', symbol: 'AVGO', groups: ['quality'] },
  { name: 'VanEck Semiconductor ETF', symbol: 'SMH', groups: ['quality'] },
  { name: 'Nasdaq 100 ETF', symbol: 'QQQ', groups: ['index', 'aiHot'] },
  { name: 'S&P 500 ETF', symbol: 'SPY', groups: ['index', 'quality'] },
  { name: 'Gold ETF', symbol: 'GLD', groups: ['commodity', 'defensive'] },
  { name: 'WTI Oil Fund', symbol: 'USO', groups: ['commodity', 'energyHot'] },
  { name: 'US Dollar Bull ETF', symbol: 'UUP', groups: ['commodity', 'defensive'] },
  { name: 'Bitcoin', symbol: 'BINANCE:BTCUSDT', groups: ['crypto', 'smallCapExplosive'] }
];

function scoreScanItem(item, quote) {
  const change = Number(quote?.dp) || 0;
  const volume = Number(quote?.volume) || 0;
  const highBeta = item.groups.some(group => ['smallCapExplosive', 'biotech', 'battery', 'energyHot'].includes(group));
  const defensive = item.groups.some(group => ['cash', 'defensive', 'dividend'].includes(group));
  const volumeBoost = volume > 10000000 ? 12 : volume > 3000000 ? 8 : volume > 500000 ? 4 : 0;
  const momentum = Math.max(-15, Math.min(35, change * (highBeta ? 2.2 : 1.6)));
  const stability = defensive ? Math.max(0, 8 - Math.abs(change)) : 0;
  return Math.round(50 + momentum + volumeBoost + stability);
}

function scanTag(item, quote, score) {
  const change = Number(quote?.dp) || 0;
  if (!quote) return 'Awaiting live quote';
  if (item.groups.includes('cash')) return 'Cash / duration buffer';
  if (change > 3) return 'Momentum breakout';
  if (change > 1) return 'Positive price action';
  if (change < -3 && item.groups.includes('quality')) return 'Quality pullback watch';
  if (item.groups.includes('dividend')) return 'Income / defensive quality';
  if (item.groups.includes('smallCapExplosive')) return score > 65 ? 'High-beta heat' : 'Speculative watchlist';
  return 'Live market screen';
}

module.exports = async function handler(req, res) {
  try {
    const items = await Promise.all(scanUniverse.map(async item => {
      try {
        const quote = await fetchTwelveQuote(item.symbol) || await fetchYahooQuote(item.symbol);
        const score = quote ? scoreScanItem(item, quote) : 0;
        return {
          ...item,
          quote,
          score,
          tag: scanTag(item, quote, score),
          reason: quote ? `${quote.dp >= 0 ? '+' : ''}${quote.dp.toFixed(2)}% latest move, ${score}/100 screen score` : 'No live quote returned by provider'
        };
      } catch {
        return { ...item, quote: null, score: 0, tag: 'Quote unavailable', reason: 'Provider request failed' };
      }
    }));
    const groups = {};
    for (const item of items) {
      for (const group of item.groups) {
        if (!groups[group]) groups[group] = [];
        groups[group].push(item);
      }
    }
    Object.keys(groups).forEach(group => groups[group].sort((a, b) => b.score - a.score));
    const wantsAiPicks = req.query?.ai === '1' || req.query?.ai === 'true';
    let aiPicks = [];
    let aiPicksError = null;
    try {
      if (!wantsAiPicks) throw new Error('AI picks not requested');
      const ranked = items
        .filter(item => item.quote && item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 18)
        .map(item => ({
          name: item.name,
          symbol: item.symbol,
          groups: item.groups,
          changePercent: item.quote?.dp,
          volume: item.quote?.volume,
          screenScore: item.score,
          screenTag: item.tag
        }));
      if (ranked.length) {
        const ai = await callOpenAIJson({
          name: 'ai_market_picks',
          system: [
            'You are an institutional stock-screening analyst.',
            'Return JSON only.',
            'Rank candidates by combining technical momentum, volume/liquidity, theme strength, business quality, catalyst durability, and downside risk.',
            'Do not simply echo percentage gainers. Pick a balanced watchlist with clear bull case and risk case.',
            'Use research language, not financial advice.'
          ].join(' '),
          user: `Candidate universe with live technical/market data: ${JSON.stringify(ranked)}.
Select exactly 6 AI picks. For every pick, explain fundamental reason, technical reason, main catalyst, main risk, expected risk level, and a 0-100 conviction score.`,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              picks: {
                type: 'array',
                minItems: 6,
                maxItems: 6,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    name: { type: 'string' },
                    symbol: { type: 'string' },
                    score: { type: 'number' },
                    risk: { type: 'string' },
                    catalyst: { type: 'string' },
                    fundamental: { type: 'string' },
                    technical: { type: 'string' },
                    riskNote: { type: 'string' }
                  },
                  required: ['name', 'symbol', 'score', 'risk', 'catalyst', 'fundamental', 'technical', 'riskNote']
                }
              }
            },
            required: ['picks']
          }
        });
        aiPicks = Array.isArray(ai?.picks) ? ai.picks : [];
      }
    } catch (error) {
      aiPicksError = error.message || 'AI picks unavailable';
    }
    return sendJson(res, 200, { updatedAt: new Date().toISOString(), source: 'Twelve Data quote screen + AI ranking', groups, aiPicks, aiPicksError });
  } catch {
    return sendJson(res, 502, { error: 'Market scan failed.' });
  }
};
