# 独立站智能诊断中心：Context.dev + Google PageSpeed

## 目标
将原 SEO 分析从 DataForSEO OnPage 单一爬取模式升级为模块化诊断。Context.dev 负责 URL 发现与页面采集，Kosmoevretis 负责页面规则审计、结构化数据预检和证据归档，Google PageSpeed Insights 负责 Mobile/Desktop Lighthouse 检测。

## 数据流程
1. 用户提交公开网站首页 URL。
2. 服务端通过 Context.dev `web.mapUrls` 发现站点 URL，并限制为同一主机。
3. 按首页、产品页、分类页、服务/公司页、内容页等 URL 路径信号选择页面；最多采集 200 页（默认 80）。
4. 轮询任务每次采集最多 2 个页面，避免单次 Edge Function 请求执行过久。
5. 对采集结果提取 Title、Description、H1、Canonical、Robots、正文词数、图片 Alt、站内链接、标题结构、列表/表格与 JSON-LD/Microdata/RDFa。
6. 对 Schema.org 常见类型执行必填字段预检，记录缺失字段；此预检不等同 Google Rich Results Test 的最终资格结论。
7. 对最多 10 个代表性页面分别调用 PageSpeed Mobile/Desktop，每次轮询最多执行 2 个策略任务。
8. 汇总页面问题、AI 搜索可读性启发式分数、结构化数据、PageSpeed 与证据型修复建议，并写入既有 `market_trend_tasks`（`task_type=seo_audit`）历史任务。

## 凭证
- Context.dev：`platform_provider_connections.provider_key=context_dev`
- Google PageSpeed：`platform_provider_connections.provider_key=google_pagespeed`
- 复用 `settings-api` 的 AES-GCM 服务端加密存储。
- 浏览器只提交凭证到设置服务，不读取解密后的值。
- `seo-intelligence` Edge Function 通过服务端解密调用第三方 API。
- 设置中心的「测试 SEO 数据服务」会分别执行 Context.dev Map URLs 与 PageSpeed Insights 测试。

## 任务 API
Edge Function：`seo-intelligence`（JWT required）
- `test_connections`
- `start`
- `poll_task`
- `list_history`
- `get_history`

任务复用现有异步历史表，不新增任务类型或数据库表。

## 报告维度
- 技术 SEO：Title、Description、H1、Canonical、Robots 等。
- 内容质量：正文规模、标题结构、图片替代文本。
- 站内链接：内部链接发现信号。
- 结构化数据：JSON-LD 解析、Microdata/RDFa 发现、Schema 类型与常见必填字段预检。
- AI 搜索可读性：基于标题分节、问答式标题、列表、表格及实体结构化信号的启发式分数，不应被解释为第三方搜索排名分数。
- PageSpeed：Mobile/Desktop Performance、Accessibility、Best Practices、SEO、LCP、INP、CLS、FCP、TBT 与机会项。

## 重要边界
- Context.dev 的公开能力用于 Map URLs 与 Scrape；此版本不假设存在名为 `audit_page` 的公开 API，页面审计由本平台规则引擎执行。
- 结构化数据结果是自动化预检，不承诺 Google 一定展示富媒体结果。
- PageSpeed 只检测选中的代表性 URL，不代表全站所有页面。
- 本版本的 AI 搜索可读性为透明规则启发式；尚未调用组织配置的 LLM 生成式审计。
- 不执行任何付费第三方采集任务，除非用户主动在页面提交诊断。
- 目标 URL 仅允许公开 HTTP/HTTPS，拦截 localhost、私网和保留 IP。
