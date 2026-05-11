const { callOpenAIJson, readJson, sendJson } = require('./_utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });
  try {
    const body = await readJson(req);
    const lang = body.lang === 'zh' ? 'Chinese' : 'English';
    const payload = await callOpenAIJson({
      name: 'investment_committee',
      system: [
        'You are an institutional equity investment committee.',
        'Return JSON only.',
        'Do not repeat news headlines.',
        'Write concise but specific research notes.',
        'Use a committee structure: technical analyst, news analyst, fundamental analyst, risk officer, bull case, bear case, final chair decision.',
        'Never present as financial advice; use research language.'
      ].join(' '),
      user: `Language: ${lang}.
Ticker: ${body.symbol || ''}
Company: ${body.name || ''}
Market: ${body.market || ''}
Industry/context: ${body.industry || ''}
Price/change: ${body.price || ''} / ${body.changePercent || ''}
Public metrics: ${JSON.stringify(body.fundamentals || {})}
News: ${(body.news || []).map(n => n.title || n.headline || '').filter(Boolean).join(' | ')}
Reports: ${(body.reports || []).map(r => [r.org, r.rating, r.title].filter(Boolean).join(' ')).filter(Boolean).join(' | ')}
Produce a compact committee report with concrete catalysts, risks, valuation/earnings implications, and validation checkpoints.`,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          technical: { type: 'string' },
          news: { type: 'string' },
          fundamental: { type: 'string' },
          risk: { type: 'string' },
          bull: { type: 'string' },
          bear: { type: 'string' },
          rating: { type: 'string' },
          score: { type: 'number' },
          conclusion: { type: 'string' },
          checkpoints: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 4 }
        },
        required: ['technical', 'news', 'fundamental', 'risk', 'bull', 'bear', 'rating', 'score', 'conclusion', 'checkpoints']
      }
    });
    return sendJson(res, 200, payload);
  } catch {
    return sendJson(res, 502, { error: 'Investment committee request failed.' });
  }
};
