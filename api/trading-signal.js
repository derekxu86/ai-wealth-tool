const { callOpenAIJson, readJson, sendJson } = require('./_utils');

function fallbackSignal(body) {
  const change = Number(body.changePercent || 0);
  const analystBuyPercent = Number(body.analystBuyPercent || 0);
  const conviction = Number(body.aiConviction || 0);
  const score = Math.max(10, Math.min(95, 50 + change * 4 + (analystBuyPercent - 50) * 0.35 + (conviction - 50) * 0.25));
  const signal = score >= 62 ? 'Buy' : score <= 42 ? 'Sell' : 'Hold';
  return {
    signal,
    confidence: Math.round(score),
    reason: signal === 'Buy'
      ? 'Positive momentum and supporting market indicators point to a constructive setup, but position size should still reflect risk.'
      : signal === 'Sell'
        ? 'Weak price action and softer supporting indicators suggest reducing exposure or waiting for a cleaner setup.'
        : 'Signals are mixed, so waiting for stronger confirmation is more reasonable than forcing a trade.'
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });
  const body = await readJson(req);
  try {
    const payload = await callOpenAIJson({
      name: 'trading_signal',
      system: 'You are an AI trading signal analyst. Return JSON only. This is educational market analysis, not financial advice. Use Buy, Hold, or Sell only.',
      user: `Analyze this ticker and produce one actionable signal. Data: ${JSON.stringify(body)}. Write the reason in the same language as lang when possible. Make it a useful short paragraph: include 3-4 concrete drivers, explain why the signal is Buy/Hold/Sell, mention one key risk or confirmation point, and avoid generic disclaimers. Target 70-100 English words or 90-130 Chinese characters.`,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          signal: { type: 'string', enum: ['Buy', 'Hold', 'Sell'] },
          confidence: { type: 'integer', minimum: 0, maximum: 100 },
          reason: { type: 'string' }
        },
        required: ['signal', 'confidence', 'reason']
      }
    });
    return sendJson(res, 200, payload);
  } catch {
    return sendJson(res, 200, fallbackSignal(body));
  }
};
