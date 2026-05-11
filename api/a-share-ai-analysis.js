const { callOpenAIJson, readJson, sendJson } = require('./_utils');

function fallback(body) {
  const change = Number(body.changePercent || 0);
  const turnover = Number(body.turnover || 0);
  const rsi = Number(body.rsi || 50);
  const action = change > 2 && rsi < 75 ? '偏强观察' : change < -2 ? '谨慎观望' : '区间跟踪';
  return {
    action,
    score: Math.max(35, Math.min(88, Math.round(58 + change * 4 + turnover * 1.5 - Math.max(0, rsi - 72)))),
    thesis: `该股当前涨跌幅为 ${change.toFixed(2)}%，换手率约 ${turnover.toFixed(2)}%，RSI 估算为 ${rsi.toFixed(0)}。短线更适合结合板块热度和量能延续性观察，若放量上行且不快速跌回均线，可继续跟踪；若高开低走或换手过热，应降低追高冲动。`,
    technicals: ['观察5日/20日均线方向', '关注量能是否持续放大', 'RSI过热时避免盲目追涨'],
    risks: ['题材退潮', '短线获利盘回吐', '市场整体风险偏好下降']
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });
  let body = {};
  try {
    body = await readJson(req);
    const payload = await callOpenAIJson({
      name: 'a_share_analysis',
      system: '你是面向中国A股散户的股票分析助手。只返回JSON。不要承诺收益，不要给绝对买卖指令，要用短句、务实、可执行的表达。',
      user: `请基于这些A股数据做简洁分析：${JSON.stringify(body)}。输出包含：action=偏强观察/区间跟踪/谨慎观望之一，score=0-100整数，thesis=120-180字中文短评，technicals=3条技术观察，risks=3条风险。`,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          action: { type: 'string' },
          score: { type: 'integer', minimum: 0, maximum: 100 },
          thesis: { type: 'string' },
          technicals: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
          risks: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } }
        },
        required: ['action', 'score', 'thesis', 'technicals', 'risks']
      }
    });
    return sendJson(res, 200, payload);
  } catch {
    return sendJson(res, 200, { ...fallback(body), fallback: true });
  }
};
