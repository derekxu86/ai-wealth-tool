# AI投资策略师

一个面向全球市场的 AI 投资策略 dashboard。项目包含市场脉冲、股票搜索、AI allocation、新闻分析、AI 买卖信号和投资组合板块拆解。

> 本项目仅用于产品原型和教育演示，不构成投资建议。

## 功能

- AI Allocation：根据用户输入生成投资组合配置
- 股票搜索：搜索股票代码并打开资产分析卡片
- AI 推荐近期热股 / 热门资产：会员解锁市场热度筛选，并可结合 Alpha Vantage / Finnhub 新闻源
- AI News Analysis：用 OpenAI 分析新闻对行业和相关股票的影响
- AI Trading Signal：用 OpenAI 生成 Buy / Hold / Sell 信号和分析理由
- 策略板块拆解：点击饼图或板块查看推荐标的

## 文件结构

```text
.
├── ai-portfolio-terminal-v2.html
├── api/
│   ├── quote.js
│   ├── stock-data.js
│   ├── search.js
│   ├── news.js
│   ├── market-scan.js
│   ├── portfolio-allocation.js
│   ├── news-analysis.js
│   ├── trading-signal.js
│   └── _utils.js
├── .env.example
├── .gitignore
└── vercel.json
```

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

`vercel.json` 已经配置好根路径 `/` 自动打开：

```text
/ai-portfolio-terminal-v2.html
```

## 安全说明

前端页面不会直接调用 OpenAI、Finnhub 或 Twelve Data。所有第三方 API 请求都通过 `/api/...` serverless functions 代理，因此 API key 只保存在 Vercel 后端环境变量里。

如果 API key 曾经出现在公开页面、聊天记录或 GitHub 历史中，建议立即在对应平台重新生成 key。

## 本地预览

如果只预览静态页面，可以直接打开：

```text
ai-portfolio-terminal-v2.html
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

## 数据源

- OpenAI：AI allocation、新闻分析、买卖信号
- Finnhub：股票搜索、新闻、部分股票行情和分析师评级
- Twelve Data：全球股票和部分市场数据

## 免责声明

本项目生成的所有内容仅用于信息展示和产品演示，不应被视为财务、投资、税务或法律建议。任何投资决策都应结合个人风险承受能力并咨询专业人士。
