# IBM Carbon 全站视觉审计（阶段性基线）

- 日期：2026-11-06
- 仓库：`JackyCheungCode/Kosmoevretis`
- 目标分支：`3c-platform`
- 设计基准：IBM Carbon Design System v11；页面业务结构保持 Kosmoevretis 自身信息架构
- 状态：P0 路由盘点完成；全站样式治理与视觉验收仍在进行

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
- 路由级插画由 `GlobalPageIllustration` 提供，颜色使用 Carbon 语义令牌。

## 3. 已修复的审计与样式问题

- 修复设计规范检查中字体令牌正则的空白回溯误报。
- 修复审计脚本递归目录时未保留子目录路径的问题。
- 修复 Facebook 发现页、AppShell 插画区、共享 PageHeader、登录页中发现的无效 spacing 表达式。
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
- 设计系统构建检查新增全局规则：禁止页面 CSS 继续引用旧版 spacing alias，并检查损坏的 spacing 表达式。
- 完整覆盖结果以最新 Cloudflare Build 中的设计系统检查为准；当前尚未完成浏览器逐页截图验收。

## 6. 后续执行顺序

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

## 6. 验收边界

Carbon 规范与 IBM.com 营销网站并非同一套页面模板。没有指定的 IBM 参考 URL、页面截图和视口规格，不能诚实宣称达到 IBM 官网每个像素 100% 复刻。当前阶段也尚未完成线上浏览器逐页截图验收；构建或部署成功不能替代视觉验收。
