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
      ? '价格动量、分析师倾向和AI conviction 同时偏正面，说明资金情绪和基本面预期有一定共振。若宏观流动性维持宽松、所属行业景气继续改善，股价仍有上行动力；主要风险是短线涨幅过快后回撤。'
      : signal === 'Sell'
        ? '短线价格表现和综合指标偏弱，说明市场对盈利弹性或行业景气的确认不足。若宏观风险偏好下降或板块资金继续流出，股价可能承压；需要等待成交量和趋势重新转强。'
        : '股价短线有表现，但宏观、行业和个股信号并未形成足够一致的方向。当前更适合观察盈利预期、行业景气和资金流是否继续改善，若后续能放量突破关键价位，信号才会更偏积极。'
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });
  const body = await readJson(req);
  try {
    const payload = await callOpenAIJson({
      name: 'trading_signal',
      system: 'You are an AI trading signal analyst for a global equity dashboard. Return JSON only. Use Buy, Hold, or Sell only. Do not say the industry is unclear or that you cannot investigate; infer a plausible sector and market context from the ticker, company name, exchange suffix, market, and available fields.',
      user: `Analyze this ticker and produce one actionable signal. Data: ${JSON.stringify(body)}. Write the reason in the same language as lang when possible. Make it a useful short paragraph that covers macro backdrop, industry/sector read-through, company-specific momentum, valuation or risk sentiment when inferable, and one key confirmation/risk point. Avoid generic disclaimers and avoid phrases like "industry unclear", "cannot determine", "分类不清晰", or "无法判断". Target 95-140 English words or 160-230 Chinese characters.`,
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
