# AI投资策略师

一个面向普通投资者的 AI 投资组合研究 dashboard，帮助用户根据风险偏好理解市场、构建资产配置、查看相关标的与新闻影响。

> 本项目仅用于产品原型和教育演示，不构成投资建议。投资有风险，入市需谨慎。

## 功能

- AI Allocation：根据用户输入、风险偏好和市场模式生成资产配置。
- AI Adjust：会员可让 AI 重新调整当前饼图配置，保守、稳健、激进会分别生成不同策略。
- 股票搜索：搜索全球股票、ETF、A股，并打开资产分析卡片。
- AI 股票池：点击后才调用 AI，根据基本面、技术面和风险筛选候选标的。
- 相关新闻：普通用户可查看基础新闻标题和摘要。
- AI 投研：会员点击后生成技术面、新闻面、基本面、风险和多空观点。
- AI 交易分析：会员点击查看买卖判断和信心指数。
- 热门资产：展示近期热股、热门资产和中文模式下的 A股热门题材。

## 文件结构

```text
.
├── index.html
├── api/
│   ├── quote.js
│   ├── ashare-quote.js
│   ├── stock-data.js
│   ├── search.js
│   ├── news.js
│   ├── company-news.js
│   ├── market-scan.js
│   ├── portfolio-allocation.js
│   ├── news-analysis.js
│   ├── investment-committee.js
│   ├── trading-signal.js
│   └── _utils.js
├── .env.example
├── .gitignore
├── README.md
└── vercel.json
```

`index.html` 是唯一主入口。`ai-portfolio-terminal-v2.html` 只保留为旧链接跳转页，避免以后同时维护两个主页面。

## Tech Stack

- HTML + Tailwind CSS
- Chart.js
- Vercel Serverless Functions
- OpenAI API
- Finnhub
- Twelve Data
- Alpha Vantage
- Yahoo Finance fallback
- 新浪财经用于 A股实时行情
- 东方财富公开数据源作为 A股备用行情、K线、题材热度和部分新闻/研报补充

## 环境变量

不要把真实 API key 写进 HTML 或提交到 GitHub。部署时在 Vercel 的 Environment Variables 里设置：

```text
OPENAI_API_KEY=your_openai_key_here
FINNHUB_API_KEY=your_finnhub_key_here
TWELVE_DATA_API_KEY=your_twelve_data_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
OPENAI_MODEL=gpt-4.1-mini
```

本地开发可以复制 `.env.example` 为 `.env.local`，再填入自己的 key。

## Vercel 部署

1. 把项目上传到 GitHub。
2. 在 Vercel 里选择这个 GitHub 仓库。
3. Framework Preset 选择 `Other`。
4. 添加上面的 Environment Variables。
5. 点击 Deploy。

项目根目录已经有 `index.html`，所以 `vercel.json` 保持极简即可，不需要 rewrite。

## 数据状态

页面右上角的数据状态会根据最近一次行情请求变化：

- 绿色：真实行情 API 返回成功。
- 黄色：使用备用数据源或部分数据。
- 红色：数据请求失败。
- 灰色：尚未请求数据。

股票详情页也会显示行情来源，例如 Twelve Data、Finnhub Quote、Yahoo Finance、新浪财经、东方财富等。

## 安全说明

前端页面不会直接调用 OpenAI、Finnhub、Twelve Data 或 Alpha Vantage。所有第三方 API 请求都通过 `/api/...` serverless functions 代理，因此 API key 只保存在 Vercel 后端环境变量里。

如果 API key 曾经出现在公开页面、聊天记录或 GitHub 历史中，建议立即在对应平台重新生成 key。

## Known Limitations

- 免费 API 有调用频率限制。
- 数据可能延迟或不完整。
- A股、澳股、港股 symbol 覆盖可能不完整。
- AI 输出仅用于研究和教育展示，不构成投资建议。
- 会员系统和支付仍是原型状态，正式上线前需要接 Supabase/Firebase Auth + Stripe。

## Roadmap

- 拆分 HTML、CSS、JS，降低维护难度。
- 接入真实登录系统。
- 接入 Stripe 月付 / 年付会员。
- 保存用户 watchlist 和 portfolio。
- 加入组合回测。
- 加入更完整的移动端布局测试。
- 增加 API rate limit 和更严格的服务端保护。

## 本地预览

如果只预览静态页面，可以直接打开：

```text
index.html
```

如果要测试 `/api/...` 后端接口，建议使用 Vercel CLI：

```bash
npm i -g vercel
vercel dev
```

然后访问：

```text
http://localhost:3000
```
