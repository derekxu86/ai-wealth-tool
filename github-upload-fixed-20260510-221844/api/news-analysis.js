const { callOpenAIJson, readJson, sendJson } = require('./_utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });
  try {
    const body = await readJson(req);
    const lang = body.lang === 'zh' ? 'Chinese' : 'English';
    const payload = await callOpenAIJson({
      name: 'news_analysis',
      system: 'You are a market news analyst. Return JSON only. Identify affected industries and relevant public tickers.',
      user: `Language: ${lang}. Headline: ${body.headline || ''}. Summary: ${body.summary || ''}. Source: ${body.source || ''}. Provide a practical market impact analysis, not generic text.`,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          analysis: { type: 'string' },
          industries: { type: 'array', items: { type: 'string' } },
          tickers: { type: 'array', items: { type: 'string' } },
          action: { type: 'string' }
        },
        required: ['analysis', 'industries', 'tickers', 'action']
      }
    });
    return sendJson(res, 200, payload);
  } catch {
    return sendJson(res, 502, { error: 'News analysis request failed.' });
  }
};
