const { callOpenAIJson, readJson, sendJson } = require('./_utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });
  try {
    const body = await readJson(req);
    const lang = body.lang === 'zh' ? 'Chinese' : 'English';
    const payload = await callOpenAIJson({
      name: 'news_analysis',
      system: 'You are an equity research analyst. Return JSON only. Write like a concise institutional research note. Do not repeat headlines. Focus on business impact, valuation or earnings implications, sector read-through, likely market reaction, and key risks. Identify affected industries and relevant public tickers.',
      user: `Language: ${lang}. Company/Ticker: ${body.symbol || ''} ${body.name || ''}. Headline set: ${body.headline || ''}. Summary/context: ${body.summary || ''}. Source: ${body.source || ''}. Provide a specific market impact analysis. Avoid generic phrases and avoid saying there is not enough data unless absolutely necessary.`,
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
