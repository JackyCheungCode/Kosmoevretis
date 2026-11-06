# IBM Carbon 全站视觉审计（阶段性基线）

- 日期：2026-11-06
- 仓库：`JackyCheungCode/Kosmoevretis`
- 目标分支：`3c-platform`
- 设计基准：IBM Carbon Design System v11；页面业务结构保持 Kosmoevretis 自身信息架构
- 状态：P0 路由盘点完成；P2 AppShell 静态结构核对完成；P1 源码首轮令牌扫描完成、残余尺寸债务继续治理；P3 共享组件整改进行中；全站视觉验收仍未完成

## 1. 页面与导航范围

当前 `src/App.tsx` 的有效路径集合共 **50 条**，分为：

| 页面族 | 路径数 | 说明 |
|---|---:|---|
| 核心工作区 | 5 | 全球情报、贸易、产品、SEO、邮件 |
| 社媒与客户发现 | 19 | 社媒平台、客户发现、平台数据采集 |
| 电商发现 | 10 | 电商总入口及 9 个平台 |
| 系统设置 | 16 | 服务商、Actor、渠道、模型、组织、权限、审计等 |
| **合计** | **50** | |

侧边栏目前为 6 组：企业数据、全球情报中心、平台数据采集、独立站运维、沟通与跟进、系统设置。

## 2. 当前基础架构

- 已使用 Carbon v11 的 `Header`、`SideNav`、`Content`、`Grid`、`Column` 作为应用外壳基础。
- `Content > fullWidth Grid > responsive Column` 已形成统一页面入口。
- 全站通过 `@carbon/styles` 加载 Carbon 样式；主题使用 Gray 10。
- `src/design-tokens.scss` 已将 Carbon Sass spacing 映射为 `--kosmo-spacing-*`，并定义页面标题、描述、页面间距和 Shell 几何令牌。
- `src/design-system/components/PagePrimitives.tsx` 已提供共享 PageHeader、PageSection、EmptyState 等原语。
- 路由级插画由 `GlobalPageIllustration` 提供，当前插画 SVG 使用 Carbon 语义令牌。
- AppShell 静态核对确认：Header 透明、无工作区标题文本；面包屑组件仍在主内容区并保留页面层级；桌面/平板/手机均有独立布局规则。
- `src/design-system/design-system.css` 已移除共享 PageHeader 顶部额外 padding，避免插画与页面标题之间叠加留白。
- AppShell 的社媒/电商平台导航已从手工 `role=tab` 按钮改为 Carbon `Tabs` / `TabList` / `Tab` 组件。
- 路由面包屑已迁移为 Carbon `Breadcrumb` / `BreadcrumbItem`，继续保留首页、页面分组和当前页的中文层级，以及 React Router 站内导航；分隔符交由 Carbon 组件提供，不再用 CSS 伪元素模拟。
- 共享 `PageHeader` 已恢复渲染已声明的 `eyebrow` 属性，避免模板传入的页面标识被静默丢弃；设置页 eyebrow 中的工作区名称已移除。
- 全球情报中心与 `IntelligenceExperience` 的主要操作按钮已统一使用 Carbon `Button`；数据渠道筛选使用 Carbon `ContentSwitcher`，国家/地区多选使用 Carbon `Button`，两处核心组件已无原生 `<button>`。
- 产品中心的返回导航和属性值删除操作已改用 Carbon `Button`；产品目录整行选择控件，以及电商发现、平台数据采集的历史任务整行选择控件，现均迁移为 Carbon `ClickableTile`，并加入设计规范防回归检查。

## 3. 已修复的审计与样式问题

- 修复设计规范检查中字体令牌正则的空白回溯误报。
- 修复审计脚本递归目录时未保留子目录路径的问题。
- 修复 Facebook 发现页、AppShell 插画区、共享 PageHeader、登录页中发现的无效 spacing 表达式。
- 扩展 `scripts/check-design-system.mjs`：将 TSX/TS 中 SVG `fill`、`stroke`、`stopColor`、内联颜色、内联布局间距、内联字体样式、手工 tab 语义，以及路由页面共享 PageHeader/模板使用纳入审计。
- 移除 `public/_redirects` 中会被 Cloudflare 判定为无限循环并忽略的 `/* /index.html 200`。项目没有顶层 `404.html`，由 Cloudflare Pages 默认 SPA 路由接管。
- 对 `src/` 下 60 个 TSX/TS/CSS/SCSS 文件完成首轮静态扫描：未发现旧 spacing alias、损坏 spacing 表达式、CSS HEX/RGB 颜色、原生 `<select>` 或 SVG HEX 颜色；发现的 `BrandLogo.tsx` 内联尺寸已迁移到共享组件令牌和 CSS。此轮扫描不等于浏览器视觉验收，也不代表所有非标准 CSS 尺寸都已迁移。另一次对 23 个 CSS/SCSS 文件的间距声明扫描，仍发现约 **386 条** margin / padding / gap 声明含 px/rem 字面量；其中包含特殊微间距、组件尺寸与布局计算，需按页面逐项判断，不能机械替换。
- 上述修复仅写入 `3c-platform`，没有写入 `main`，没有修改数据库或后端业务逻辑。

## 4. 样式债务抽样结果

对 16 个核心 CSS 文件进行静态抽样，检测到约 **653 处** margin / padding / gap 声明仍含 px/rem 字面量；另有约 **146 处**旧版 `--kosmo-space-*` 兼容令牌引用。

较集中的文件：

| 文件 | px/rem 间距声明 | 旧版 spacing 引用 |
|---|---:|---:|
| `src/styles.css` | 264 | 0 |
| `src/intelligence.css` | 163 | 0 |
| `src/trade-access.css` | 72 | 0 |
| `src/product-center.css` | 26 | 64 |
| `src/linkedin-discovery.css` | 36 | 2 |
| `src/google-maps-discovery.css` | 35 | 2 |
| `src/facebook-discovery.css` | 34 | 1 |
| `src/settings-center.css` | 4 | 46 |
| `src/mail-communication.css` | 3 | 30 |

说明：这些计数包含部分组件尺寸、断点和特殊布局值，并不代表每一处都应机械替换。后续必须按组件语义逐项迁移，保留确有必要的尺寸值，避免自动替换造成版式漂移。

在已抽样的核心 CSS 文件中，修复后未再检测到硬编码 HEX/RGB 颜色、非 Carbon 字体尺寸声明或损坏的 spacing 表达式。此结论不覆盖 TSX 内联样式、第三方品牌标识色及尚未抽样的所有文件。

## 5. P1 令牌迁移进展（后续修复）

- 已将 **229 处**旧版 `--kosmo-space-*` 引用迁移为规范的 `--kosmo-spacing-*` Carbon 令牌，覆盖核心页面和嵌套页面 CSS。
- 已将至少 **199 处**可精确映射的 rem 间距值迁移为 Carbon spacing token 或等值 token 组合；这些替换保持原像素值，不对非标准微间距、边框和组件尺寸做机械替换。
- 本轮追加在 `src/auth/auth.css`、`src/design-system-preview.css`、`src/pages/ecommerce-discovery.css` 中完成 **5 处**精确等值迁移：仅把与 Carbon spacing 规格完全相同的 rem 值改为 `--kosmo-spacing-*`，不改变计算尺寸。非标准微间距、响应式宽度和组件尺寸保留待语义审查。
- 设计系统构建检查新增全局规则：禁止页面 CSS 继续引用旧版 spacing alias，并检查损坏的 spacing 表达式。
- 完整覆盖结果以最新 Cloudflare Build 中的设计系统检查为准；当前尚未完成浏览器逐页截图验收。

## 6. 当前阶段提交与部署记录

- `58fc45f`：收紧共享 PageHeader 顶部间距。
- `a83062a`：修正 TSX/SVG 内联颜色审计表达式。
- `61d0b40`、`c7e7cea`、`c3c4b0f`：将 BrandLogo 尺寸迁移至共享令牌与样式。
- `41e1468`：扩展 inline layout/typography 检查；Cloudflare Build 和 Deploy 已成功。
- `0b5f02a`、`7d420a0`：平台导航改用 Carbon Tabs。
- `dd2c872`：恢复共享 PageHeader eyebrow 渲染。
- `0f7afed`：增加手工 tab 语义防回归检查。
- `069e53e`：增加路由页面共享 PageHeader/模板检查。
- `aefbc69`：PageHeader 字体统一使用 Carbon font-family token。
- `8dc160e`：清理共享 PageHeader 重复 CSS 规则。
- `97854c9`：删除 Cloudflare Pages 冗余 SPA 重写规则。
- `7006d3c`：移除设置页 eyebrow 中的工作区名称；该版本 Cloudflare Build 与 Deploy 均成功，且部署日志不再出现 `_redirects` 无限循环警告。
- `e9ccf82`、`ac80088`：全球情报中心数据渠道筛选改为 Carbon ContentSwitcher。
- `267fa63`、`bf972b6`、`d1181cb`：全球情报中心主要操作与市场选择改为 Carbon Button。
- `936c880`、`6cbe236`：为全球情报中心 Carbon Button 增加防回归检查。
- `8bc4623`：修正 ContentSwitcher 的 Switch 子项和回调 API。
- `4981c73`、`5f131d4`：修正展开按钮指示符的样式作用范围。
- `27da24f`：补齐 ContentSwitcher 必需的 size 并处理可选 index；Cloudflare Build 与 Deploy 成功，设计系统 guard 通过。
- `b906ced`：产品中心返回导航和属性值删除操作改用 Carbon Button；Build 与 Deploy 成功。
- `72cc23d`、`be63595`、`63f46d2`：精确 Carbon 间距等值迁移，合计 5 处。
- `8a88b44`：产品目录整行选择控件迁移至 Carbon `ClickableTile`。
- `25fbce2`：增加产品目录 `ClickableTile` 防回归检查。
- `a161655`、`798fda3`：电商发现与平台数据采集历史任务行迁移为 Carbon `ClickableTile`。
- `4e63513`：增加两个发现页面的 `ClickableTile` 防回归检查。
- `17b720e`、`cfb34cd`：AppShell 面包屑迁移至 Carbon Breadcrumb，移除自定义分隔符。
- `dc6d0ca`：关闭 Carbon Breadcrumb 的尾部分隔符，保持路径显示简洁。
- `5c98bee`：移除面包屑列表自定义 gap，让 Carbon 自己控制分隔符两侧间距。
- `3996c26`：增加 AppShell Carbon Breadcrumb 防回归检查。
- 生产部署最近一次已成功：Deployment ID `d90ce35e-814c-4281-8b30-8b650bcee1ad`，commit `81eee9745565b5a55689cf043b86f9d1fc50a82b`，URL `https://d90ce35e.kosmoevretis-platform.pages.dev`。此部署早于本轮 spacing 与 `ClickableTile` 变更；本轮提交 `b2bcbeceb31456ca3c1390911732513cfeb1a95b` 已于 2026-11-06 完成生产部署：Deployment ID `35fd72e1-f517-4a51-a104-2b6dd3f12133`，URL `https://35fd72e1.kosmoevretis-platform.pages.dev`；Build、Carbon design-system guard、Worker 编译与 Deploy 均成功。该部署包含 Carbon Breadcrumb、ClickableTile 历史列表与精确间距令牌迁移。
- 所有上述 GitHub 写操作仅针对 `3c-platform`。`41e1468`、`dd2c872`、`aefbc69`、`97854c9`、`7006d3c`、`27da24f` 的部署均已成功。最新部署 `b906ced`：`https://2b845189.kosmoevretis-platform.pages.dev`，Deployment ID `2b845189-e532-48e6-8516-709b3547e33d`。中间提交 `8bc4623`、`5f131d4` 因 ContentSwitcher 的必需属性和可选索引类型检查失败；已在 `27da24f` 修正并通过构建。

## 7. 后续执行顺序

### P1 — Design Tokens
- 逐项统一字体、字重、行高、间距、颜色、边框、层级和断点。
- 将旧版 spacing alias 迁移到规范令牌。
- 扩展审计覆盖 JSX 内联样式、SVG、组件状态与可访问性。

### P2 — AppShell
- 对 Header、侧边栏、面包屑、主内容容器、页面最大宽度和响应式断点逐项校准。
- 保留现有导航信息架构和交互行为。
- 桌面、平板、手机分别验收。

### P3 — 页面与组件
- 按页面族逐页重构：全球情报、产品、贸易、社媒、电商、SEO、邮件、设置。
- 优先收敛共享表单、筛选器、结果区、表格、Tabs/导航和空状态。
- 不改变业务逻辑，不以统一 CSS 覆盖取代真实组件审查。

### P4 — 视觉验收
- 固定参考页面、浏览器、视口尺寸、缩放比例和字体加载状态。
- 对每个路由进行实际截图对照，检查元素坐标、尺寸、间距、字形、换行、颜色和响应式状态。
- 逐页记录差异并复验部署版本。

## 8. 验收边界

Carbon 规范与 IBM.com 营销网站并非同一套页面模板。没有指定的 IBM 参考 URL、页面截图和视口规格，不能诚实宣称达到 IBM 官网每个像素 100% 复刻。当前阶段也尚未完成线上浏览器逐页截图验收；构建或部署成功不能替代视觉验收。
