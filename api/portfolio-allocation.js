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
      conservative: `Conservative profile:
Use current market conditions to build a lower-volatility portfolio.
Do not assume bonds, cash, gold, or defensive stocks are always optimal.
Select assets dynamically based on live market trend, valuation pressure, volatility, macro risk, liquidity, and news sentiment.
Prioritize capital preservation, lower drawdown, diversification, and liquidity.
Avoid crowded high-beta themes unless current market data strongly supports a small allocation.
Keep single-theme concentration low and explain why the defensive choices fit today's market.`,
      moderate: `Moderate profile:
Use current market conditions to balance growth and downside protection.
Do not use a fixed sector template.
Select sectors and assets dynamically based on live momentum, macro trend, valuation risk, earnings/news catalysts, and sentiment.
Allow growth and thematic exposure only when supported by current market signals.
Maintain diversification and avoid excessive concentration in one theme.`,
      aggressive: `Aggressive profile:
Use current market conditions to seek higher upside opportunities.
Do not automatically allocate to AI, technology, crypto, or any fixed theme.
Select high-conviction sectors dynamically based on live momentum, earnings catalysts, news sentiment, positioning, and risk/reward.
Higher volatility and concentration are allowed, but the portfolio must still include risk controls and a liquidity buffer.
Prefer individual companies when the opportunity is stock-specific; use ETFs only when broad exposure is more appropriate.`
    }[currentRisk] || `Moderate profile:
Use current market conditions to balance growth and downside protection.`;

    const marketInstruction = marketMode === 'ashare'
      ? 'Market mode is China A-shares. Every investable ticker must be an A-share or China onshore ETF ending in .SS or .SZ. Do not return US, HK, ASX, crypto, or global ETF tickers in allocations. Do not make every holding an ETF; each growth or thematic sleeve should include individual A-share companies when appropriate.'
      : 'Market mode is global. You may use global ETFs and listed equities, but do not force Australia/ASX exposure unless the user explicitly asks for it. Do not make every holding an ETF; each growth or thematic sleeve should include individual companies when appropriate.';

    const payload = await callOpenAIJson({
      name: 'portfolio_allocation',
      system: 'You are an AI wealth strategist and portfolio investment committee. Return concise portfolio allocation JSON only. This is educational research, not financial advice. Be specific, structured, dynamic, and avoid generic filler. Always obey the selected risk profile and selected market mode.',
      user: `Language: ${lang}. Capital: ${amount}. Current risk profile: ${currentRisk}. ${riskInstruction} ${marketInstruction} User request: ${prompt}. Return JSON with {summary, trend, committee, allocations}. summary is one short investment suggestion sentence. trend is one short current market trend sentence. committee contains {macro, opportunity, risk, bull, bear, final}. allocations must contain exactly 3 items: {label, weight, note, holdings}. holdings should contain 2-3 investable tickers as {symbol, name}. Weights should be integers and sum to around 100. The allocation must visibly match the selected risk profile and selected market mode. Do not repeat the same holdings across allocation sleeves unless there is a strong reason. Treat this as a global-user product: do not recommend Australian equities just because capital currency is AUD or because the user wants diversification away from US stocks. Only include Australia/ASX exposure when the user explicitly asks for Australian stocks, ASX, Australia equities, 澳股, 澳洲股票, or 澳大利亚股票.`,
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
