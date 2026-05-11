const { callOpenAIJson, readJson, sendJson } = require('./_utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });
  try {
    const body = await readJson(req);
    const prompt = String(body.prompt || '').slice(0, 1200);
    const amount = Number(body.amount || 0);
    const currentRisk = String(body.currentRisk || 'moderate');
    const marketMode = String(body.marketMode || 'global');
    const lang = String(body.lang || '').toLowerCase().startsWith('zh') ? 'Chinese' : 'English';

    const riskInstruction = {
      conservative: 'Conservative: prioritize capital preservation, income, lower volatility, broad ETFs, defensive leaders, and a larger cash/bond buffer. Avoid high-beta concentration.',
      moderate: 'Moderate core: balance growth and defense, use diversified core holdings plus a limited satellite sleeve. Avoid excessive single-theme concentration.',
      aggressive: 'Aggressive: allow higher thematic concentration, growth stocks, small/mid-cap optionality, and higher drawdown risk, but keep a small liquidity/risk buffer.'
    }[currentRisk] || 'Moderate core: balance growth and defense.';

    const marketInstruction = marketMode === 'ashare'
      ? 'Market mode is China A-shares. Every investable ticker must be an A-share or China onshore ETF ending in .SS or .SZ. Do not return US, HK, ASX, crypto, or global ETF tickers in allocations. Do not make every holding an ETF; each growth or thematic sleeve should include individual A-share companies when appropriate.'
      : 'Market mode is global. You may use global ETFs and listed equities, but do not force Australia/ASX exposure unless the user explicitly asks for it. Do not make every holding an ETF; each growth or thematic sleeve should include individual companies when appropriate.';

    const payload = await callOpenAIJson({
      name: 'portfolio_allocation',
      system: 'You are an AI wealth strategist and portfolio investment committee. Return concise portfolio allocation JSON only. This is educational, not financial advice. Be specific, structured, and avoid generic filler. Always obey the selected risk profile and selected market mode.',
      user: `Language: ${lang}. Capital: ${amount}. Current risk profile: ${currentRisk}. ${riskInstruction} ${marketInstruction} User request: ${prompt}. Return JSON with {summary, trend, committee, allocations}. summary is one short investment suggestion sentence. trend is one short current market trend sentence. committee contains {macro, opportunity, risk, bull, bear, final}. allocations must contain exactly 3 items: {label, weight, note, holdings}. holdings should contain 2-3 investable tickers as {symbol, name}. Weights should be integers and sum to around 100. The allocation must visibly match the selected risk profile and selected market mode. Treat this as a global-user product: do not recommend Australian equities just because capital currency is AUD or because the user wants diversification away from US stocks. Only include Australia/ASX exposure when the user explicitly asks for Australian stocks, ASX, Australia equities, 澳股, 澳洲股票, or 澳大利亚股票.`,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          summary: { type: 'string' },
          trend: { type: 'string' },
          committee: {
            type: 'object',
            additionalProperties: false,
            properties: {
              macro: { type: 'string' },
              opportunity: { type: 'string' },
              risk: { type: 'string' },
              bull: { type: 'string' },
              bear: { type: 'string' },
              final: { type: 'string' }
            },
            required: ['macro', 'opportunity', 'risk', 'bull', 'bear', 'final']
          },
          allocations: {
            type: 'array',
            minItems: 3,
            maxItems: 3,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                label: { type: 'string' },
                weight: { type: 'integer' },
                note: { type: 'string' },
                holdings: {
                  type: 'array',
                  minItems: 2,
                  maxItems: 3,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      symbol: { type: 'string' },
                      name: { type: 'string' }
                    },
                    required: ['symbol', 'name']
                  }
                }
              },
              required: ['label', 'weight', 'note', 'holdings']
            }
          }
        },
        required: ['summary', 'trend', 'committee', 'allocations']
      }
    });
    return sendJson(res, 200, payload);
  } catch {
    return sendJson(res, 502, { error: 'Portfolio allocation request failed.' });
  }
};
