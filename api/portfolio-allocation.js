const { callOpenAIJson, readJson, sendJson } = require('./_utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });
  try {
    const body = await readJson(req);
    const prompt = String(body.prompt || '').slice(0, 1200);
    const amount = Number(body.amount || 0);
    const currentRisk = String(body.currentRisk || 'moderate');
    const payload = await callOpenAIJson({
      name: 'portfolio_allocation',
      system: 'You are an AI wealth strategist. Return concise portfolio allocation JSON only. This is educational, not financial advice.',
      user: `Capital: ${amount}. Current risk profile: ${currentRisk}. User request: ${prompt}. Return JSON with exactly 3 allocations: {label, weight, note, holdings}. holdings should contain 2-3 investable tickers as {symbol, name}. Weights should be integers and sum to around 100. Treat this as a global-user product: do not recommend Australian equities just because capital currency is AUD or because the user wants diversification away from US stocks. Only include Australia/ASX exposure when the user explicitly asks for Australian stocks, ASX, Australia equities, 澳股, 澳洲股票, or 澳大利亚股票.`,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
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
        required: ['allocations']
      }
    });
    return sendJson(res, 200, payload);
  } catch {
    return sendJson(res, 502, { error: 'Portfolio allocation request failed.' });
  }
};
