# Kosmoevretis 全站 IBM Carbon 视觉审计与重构执行记录

- 审计基准分支：`3c-platform`
- 审计基准提交：`0816ce5554cea307d469789134f1d4fe521bb5f6`
- 审计日期：2026-11-06
- 目标：以 IBM 官方设计语言与 Carbon Design System v11 为准，对全站页面、组件、排版、网格、间距、颜色、层级、交互和响应式行为进行系统重构。
- 代码范围：前端呈现层；保留现有路由、认证、权限、数据结构、API 参数、Supabase / Workers / Actor 业务行为。未经明确授权不修改后端、数据库和密钥。

## 0. 视觉验收定义

“100% 像素级”必须有确定的参考页面、视口、设备像素比、字体加载状态、内容数据和交互状态作为比较条件。不同 IBM 页面不是同一个模板，因此不能把 IBM 官网首页、Carbon 文档站和 Carbon 产品 UI 混为一套页面。

本轮采用以下基准：
1. **产品 UI 基准**：IBM Carbon Design System v11 官方产品设计规范；默认 Gray 10 主题。
2. **字体**：IBM Plex Sans；代码/数字场景按 Carbon 字体规则使用 Plex Mono。
3. **排版**：Carbon productive type set 用于工作台和数据密集型产品界面；expressive type set 仅用于确有编辑性展示需要的场景。
4. **布局**：Carbon 2x Grid 与 320 / 672 / 1056 / 1312 / 1584px 断点。
5. **颜色与层级**：Carbon v11 CSS custom properties / semantic tokens / layer model；禁止在页面 CSS 中自建颜色体系。
6. **间距**：Carbon spacing / layout spacing tokens；禁止散布任意 px 间距。
7. **组件与交互**：优先使用 Carbon React v11 官方组件和可访问交互模式。

如果后续要求逐像素复制某个 IBM.com 页面，必须把该页面 URL、目标视口与状态纳入单独的视觉基准；本产品工作台不应机械套用营销首页的信息架构。

## P0 — 全站现状盘点（已完成代码静态盘点）

### 仓库规模
基于 Git tree 递归结果：
- 仓库文件：133
- `src/` 文件：60
- TypeScript / TSX：37
- CSS / SCSS：23
- 主要业务页面组件：13
- 路由白名单：50 条有效路径，覆盖情报、贸易、社媒、线索、电商、产品、SEO、设置和邮件；路由子路径需逐一回归，不能只按组件数量验收。

### 页面与工作区清单
- 全局框架 / 登录：AppShell、认证、登录
- 全球情报中心：GlobalIntelligence、IntelligenceExperience
- 产品中心：ProductCenter
- 贸易与市场准入：TradeAccessPage、TradeAccessAnalysis
- 社媒发现：Facebook、Instagram、LinkedIn、Google Maps，以及 X / Reddit / Pinterest / TikTok / YouTube 数据采集工作区
- 电商发现：Amazon、Walmart、eBay、AliExpress、Temu、Etsy、Shopify、Mercado Libre、Rakuten
- 独立站 SEO 分析
- 邮件沟通与邮件设置
- 设置中心：服务商、Actor、渠道、运行记录、AI 服务商、模型、路由、提示词、组织、成员、地区语言、通知、治理、审计、设计系统、邮件等
- 设计系统预览与共享组件

### P0 已确认问题（按影响排序）

**P0-01 自动审计覆盖不完整**
- 当前 `scripts/check-design-system.mjs` 主要递归检查 `src/pages/`，并仅显式检查少数根目录文件。
- 多个核心业务 TSX 和大量根目录 CSS（例如 `intelligence.css`、`product-center.css`、`trade-access.css`、`facebook-discovery.css`、`google-maps-discovery.css`、`linkedin-discovery.css`、`mail-communication.css`、`social-platform-workspace.css`、`auth/auth.css`）未纳入同等强度的自动门禁。
- 结果：构建通过不等于全站遵守 Carbon 规范。

**P0-02 旧全局样式仍参与全站构建**
- `src/main.tsx` 仍导入 `src/styles.css`。
- 该文件含早期自定义 Shell、通用页面布局、组件样式与大量固定颜色/字号；即使部分选择器可能已不再对应当前 DOM，也会增加级联冲突和回归风险。
- 不能直接删除；必须先逐项确认选择器使用情况，再迁移/移除。

**P0-03 页面样式存在显著硬编码与重复体系**
- 静态扫描发现多份 CSS 存在硬编码 HEX / RGB、页面级 font-size、`!important` 和自定义布局尺寸。
- 已确认高密度文件包括：`styles.css`、`intelligence.css`、`product-center.css`、`auth/auth.css`、`trade-access.css`、`social-platform-workspace.css`。
- 初步计数是文本匹配数量，不等于最终可见违规数；必须逐个选择器判断是否仍被使用、是否覆盖 Carbon 组件、是否属于业务图表/品牌资产等合理例外。

**P0-04 AppShell 与历史需求有待统一验收**
- `App.tsx` 使用 Carbon Header / SideNav / Content / Grid / Column，但仍包含项目自定义断点与导航行为，需要按官方 UI Shell 交互逐项验证。
- 当前 Header 被包在 `Theme theme="g100"` 中；其视觉背景由 Carbon 主题 token 决定，需核对与“透明并融入页面背景”的既定要求是否一致。
- PagePrimitives 的共享 PageHeader 当前没有面包屑实现；之前误删了面包屑层级，而正确要求是保留层级、只隐藏工作区名称。需恢复并验证。
- 当前 AppShell 路由分支存在社媒/电商平台子路由共享工作区的情况，必须按每条有效路径验证导航当前态、页面标题、内容和返回行为。

**P0-05 页面模板不等于全站覆盖**
- 共享模板已存在：Intelligence、DataList、Configuration、Analysis。
- 仍有多个业务工作区使用独立 DOM / CSS；需按业务任务统一，而不是强行将所有页面套入同一个模板。

**P0-06 视觉验收基准缺失**
- 仓库没有形成覆盖所有路由、视口、关键状态的截图基线和像素差异报告。
- 没有截图对比前，不得宣称像素级验收完成。

## P1 — Foundation 与治理

1. 核对 Carbon v11 主题、IBM Plex 字体实际加载、字重、type tokens、spacing tokens、layer tokens。
2. 梳理并清理重复/失效 token；语义别名只映射 Carbon 官方 token，不另建平行体系。
3. 收敛全局 CSS 导入顺序与作用域；消除旧样式对 Carbon 组件和页面模板的意外覆盖。
4. 将自动检查扩展为全量 `src/` 覆盖，先输出分级报告，再逐步把已迁移范围纳入阻断式门禁；禁止通过关闭规则来“通过”。
5. 建立页面/路由清单、组件清单、字体与尺寸红线、例外登记和视觉回归基准。

## P2 — AppShell 与共享组件

1. Header、SideNav、Content、Grid、导航分组、移动抽屉和焦点行为按 Carbon 官方 UI Shell 校准。
2. 恢复面包屑；隐藏工作区名称但保留路径层级。
3. 统一页面标题、说明、页面操作、区块标题、Tabs、筛选器、表单字段、表格、状态、空/加载/错误状态。
4. 所有共享组件以 token 控制字体、尺寸、颜色、间距、层级与交互状态。
5. 不允许页面私有 CSS 重写 Carbon 内部组件结构。

## P3 — 业务页面逐页重构

按业务工作流分批：
1. 全球情报中心与情报结果工作区
2. 产品中心与贸易准入
3. 社媒发现全渠道
4. 电商发现全渠道
5. SEO 分析与邮件沟通
6. 设置中心全部分类
7. 登录、设计系统预览和其他辅助页面

每个页面都必须验收：默认态、加载态、空态、错误态、成功态、长文本/长表格、窄屏、交互焦点、键盘操作；保持原有业务行为不变。

## P4 — 视觉回归与部署验收

- 以统一视口和设备像素比捕获页面截图。
- 按页面结构、元素位置/尺寸、字体加载与字形、行高/字距、颜色、间距、边界、图标、插画、滚动和断点进行对比。
- 每个可见差异建立记录并修复；对动态数据、时间、随机图表和用户数据使用稳定测试数据或屏蔽动态区域。
- 逐路由验证桌面、平板、手机；回归导航、认证、表单、数据调用和主要业务流程。
- 最后执行 TypeScript、Carbon 审计、生产构建、Cloudflare Pages 部署与线上路由检查。
- 只有截图对比和交互回归均有证据，才可标记视觉验收通过；Build/Deploy 成功不能替代视觉验收。

## 变更边界与完成定义

- 仅提交到 `3c-platform`，禁止写入 `main`。
- 不改数据库 schema、Supabase 数据、后端函数、API 协议、密钥和 Actor 输入输出行为。
- 不删除既有业务功能或页面。
- 不以减少检查项、屏蔽 CSS 或关闭审计规则换取构建通过。
- 每批提交后检查构建与部署状态；全站完成以 P0–P4 所有验收项有证据为准。

## 官方参考
- Carbon Typography: https://www.carbondesignsystem.com/building-blocks/foundations/typography/overview
- Carbon Type sets: https://www.carbondesignsystem.com/building-blocks/foundations/typography/type-sets
- Carbon Color / Layering: https://www.carbondesignsystem.com/building-blocks/foundations/color/guidelines
- Carbon Spacing: https://www.carbondesignsystem.com/guidelines/spacing
- Carbon v11 overview: https://www.carbondesignsystem.com/getting-started/migrating/guide/overview


## 执行进度（2026-11-06）

### P0
- [x] 完成 Git tree 全量盘点与主要页面/样式清单。
- [x] 确认 50 条有效前端路由。
- [x] 确认自动设计系统门禁覆盖范围不足。
- [x] 建立本文件作为审计基线和 P0–P4 验收记录。

### P1（进行中）
- [x] 在 HTML 入口明确加载 IBM Plex Sans（300–700）和 IBM Plex Mono（400–600），并设置字体 CDN preconnect。
- [x] 将浏览器 theme-color 从旧深色 Header 色值调整为 Gray 10 画布色。
- [~] 已清理全局 styles.css 及首批 6 个业务样式文件的硬编码颜色；其余样式仍待处理。\n- [~] 首批 6 个业务样式文件的主要字号已改为 Carbon productive type tokens；间距仍待逐页校准。
- [~] 自动门禁新增 6 个业务 CSS 文件，并开始对全局 styles.css 执行 HEX/RGB 阻断检查；尚未覆盖全部 60 个 src 文件。

### P2（进行中）
- [x] AppShell Header 改为 Gray 10 主题、透明背景，不再使用独立深色背景层。
- [x] 恢复路由面包屑导航，隐藏产品/工作区品牌名，保留首页、业务分类和当前页面层级。
- [ ] 继续核对 Header / SideNav / Content / Grid 尺寸、平板与移动端导航行为。
- [ ] 共享页面标题、Tabs、表格、表单和反馈组件逐项统一。

### P3 / P4
- [~] 已启动首批页面样式重构：全球情报中心、产品中心、贸易准入、Facebook、LinkedIn、Google Maps；尚未完成组件布局和截图像素差异验收。
- [ ] 尚未完成桌面 / 平板 / 手机全路由视觉回归。
- [ ] 尚未完成线上浏览器交互验收。

### 本轮代码提交
- `0855d2f` — P0 全站审计记录。
- `20bfa46` — 加载 IBM Plex 字体与 Gray 10 浏览器主题色。
- `567694e` / `cffba4e` / `91b1c22` — Header 透明化与 Gray 10 主题校准（最终样式提交为 `91b1c22`）。
- `e2889a9` / `6f26262` / `db2a1fd` — 恢复路由面包屑与层级标签（最终路由组件提交为 `db2a1fd`）。

- [ ] 继续迁移其余社媒、电商、SEO、邮件与设置页面。

### P3 首批样式整改
- [x] `src/intelligence.css`：清理硬编码颜色，使用 Carbon semantic / palette tokens；主要字号改为 Carbon productive type tokens。
- [x] `src/GlobalIntelligence.tsx`：全球市场地图颜色改为 Carbon 交互与边框 tokens。
- [x] `src/IntelligenceExperience.tsx`：Google Trends 地图色阶及图例改为 Carbon blue palette tokens。
- [x] `src/product-center.css`：颜色和主要字号映射到 Carbon tokens。
- [x] `src/trade-access.css`：错误态和交互色改为 Carbon tokens，主要字号改为 Carbon tokens。
- [x] `src/facebook-discovery.css`、`src/linkedin-discovery.css`：状态色和主要字号映射到 Carbon tokens。
- [x] `src/google-maps-discovery.css`：颜色、主要字号和地图图例边界改为 Carbon tokens；移除该图例投影。
- [x] `src/styles.css`：旧全局样式中的 HEX / RGB 颜色替换为 Carbon tokens / color-mix。
- [x] `scripts/check-design-system.mjs`：把上述 6 个业务样式文件纳入 HEX/RGB 与全局选择器检查，并对 `src/styles.css` 增加 HEX/RGB 阻断检查。

### 视觉基准补充
- IBM Design Language 官方入口：https://www.ibm.com/design/language/
- IBM Digital Design / ibm.com 与 Carbon 的关系：IBM 官方说明 ibm.com 的 Digital Design 以 IBM Design Language 为基础，并以 Carbon 作为核心设计系统。


## 桌面端布局基础修复（2026-11-07）

- [x] 修复 `src/app-shell.css` 中字面量 `\\n@media`，恢复平板导航媒体查询的正常 CSS 解析。
- [x] 在 `src/responsive-audit.css` 统一桌面端主内容区宽度：左侧 16rem 导航、最大内容宽度 1584px，宽屏居中。
- [x] 为 Carbon Grid 列、页面直接子节点及社媒工作区补充 `min-width: 0` / `max-width: 100%`，减少桌面 Flex/Grid 子项撑破容器。
- [x] 为常见 Carbon 表格容器提供局部横向滚动，避免表格把整页撑宽。
- [ ] 尚未完成 50 条路由在 1440px / 1280px / 1024px / 768px / 390px 下的浏览器截图和交互验收。
- [ ] 尚未完成各业务页固定宽度、图表、地图、复杂表单和设置页的逐页修复。
- [ ] 本次基础 CSS 修复的构建结果和 Preview 部署结果待 CI / Cloudflare 确认；生产环境未变更。

> 本批次只建立全站布局约束，不代表全站电脑端适配已经验收完成。视觉验收仍需按 P4 的路由与视口矩阵执行。
