const { sendJson } = require('./_utils');

function text(value) {
  return String(value || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function fallbackItems(type, symbol, name) {
  if (type === 'report') {
    return [
      { title: '研报接口待配置', summary: '建议本地后端接 AKShare 的东方财富研报接口，下载 PDF 后交给 AI 摘要核心观点、盈利预测变化和目标价。' },
      { title: `${name || symbol} 研报摘要结构`, summary: '展示行业景气度、公司催化、估值位置、机构分歧四项即可，不要把整篇研报塞进页面。' }
    ];
  }
  if (type === 'rating') {
    return [
      { title: '机构评级接口待配置', summary: '可接东方财富/同花顺一致预期或 Tushare Pro。展示买入、增持、中性比例，以及目标价变动。' },
      { title: `${name || symbol} 评级占位`, summary: '当前本地页先用 PE、PB、换手率和技术热度辅助判断。' }
    ];
  }
  return [
    { title: '新闻接口待配置', summary: '可先接东方财富个股新闻，之后加财联社分钟级快讯。新闻摘要可作为会员 AI 功能。' },
    { title: `${name || symbol} 新闻观察`, summary: '重点看新闻是否改变行业景气度、订单预期、政策环境或风险偏好，而不只是标题刺激。' }
  ];
}

async function fetchEastmoneySearch(keyword) {
  const url = new URL('https://search-api-web.eastmoney.com/search/jsonp');
  url.searchParams.set('cb', 'jQuery112400000000000000000_0');
  url.searchParams.set('param', JSON.stringify({
    uid: '',
    keyword,
    type: ['cmsArticleWebOld'],
    client: 'web',
    clientType: 'web',
    param: { cmsArticleWebOld: { searchScope: 'default', sort: 'default', pageIndex: 1, pageSize: 4 } }
  }));
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  const raw = await res.text();
  const jsonText = raw.replace(/^[^(]*\(/, '').replace(/\);?$/, '');
  const data = JSON.parse(jsonText);
  const list = data?.result?.cmsArticleWebOld || data?.result?.cmsArticleWebOld?.data || [];
  return Array.isArray(list) ? list : [];
}

module.exports = async function handler(req, res) {
  const type = String(req.query?.type || 'news');
  const symbol = String(req.query?.symbol || '').trim();
  const name = String(req.query?.name || '').trim();
  try {
    if (type === 'news') {
      const rows = await fetchEastmoneySearch(name || symbol);
      const items = rows.slice(0, 4).map(item => ({
        title: text(item.title || item.Title || item.name),
        summary: text(item.content || item.summary || item.showTime || item.source || '东方财富搜索结果'),
        source: '东方财富'
      })).filter(x => x.title);
      if (items.length) return sendJson(res, 200, { source: 'Eastmoney Search', items });
    }
    return sendJson(res, 200, { source: 'fallback', items: fallbackItems(type, symbol, name) });
  } catch {
    return sendJson(res, 200, { source: 'fallback', items: fallbackItems(type, symbol, name) });
  }
};
