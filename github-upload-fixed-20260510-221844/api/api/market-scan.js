const { fetchTwelveQuote, sendJson } = require('./_utils');

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
  { name: 'VanEck Semiconductor ETF', symbol: 'SMH', groups: ['quality'] }
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
        const quote = await fetchTwelveQuote(item.symbol);
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
    return sendJson(res, 200, { updatedAt: new Date().toISOString(), source: 'Twelve Data quote screen', groups });
  } catch {
    return sendJson(res, 502, { error: 'Market scan failed.' });
  }
};
