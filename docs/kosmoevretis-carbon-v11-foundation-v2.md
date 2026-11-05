# Kosmoevretis Carbon v11 Foundation v2

更新时间：2026-11-05

## 目标
以 IBM Carbon Design System v11 作为 Kosmoevretis 全站唯一基础设计标准，停止以旧页面结构为中心的补丁式 CSS 修复，改为基础层、共享组件、业务页面的分阶段重构。

## 规范关系
1. IBM Carbon Design System v11：规范权威，决定组件、主题、Grid、Typography、Spacing、Layer、交互和无障碍。
2. Carbon Builder Skill / MCP：官方规范的查询、实现和验证辅助。MCP 只有在当前 Agent 运行时真实连接后才能调用。
3. Kosmoevretis Governance：业务架构和集成适配层，定义业务、数据、路由、权限、中文内容和当前主题选型，不得覆盖 Carbon 基础规则。

## 当前主题
- 应用主画布：Carbon Gray 10（`Theme theme="g10"`）。
- Header：可使用 Carbon inverse Header 层级（`Theme theme="g100"`），遵循 UI Shell 官方主题组合。
- Header inverse 层不等于全站 Gray 100。

## Tokens
- `src/design-tokens.scss` 的颜色和间距只映射 Carbon 主题变量与官方 Sass spacing tokens。
- Carbon spacing scale：2 / 4 / 8 / 12 / 16 / 24 / 32 / 40 / 48 / 64 / 80 / 96px。
- `--kosmo-spacing-01..12` 由 `@carbon/react/scss/spacing` 官方 Sass tokens 编译输出，避免假设 Carbon spacing tokens 存在运行时 CSS 自定义属性。
- `--kosmo-space-1..11` 仅保留为旧代码兼容别名，新代码不得继续扩展旧命名。
- 业务尺寸可保留为 Kosmoevretis 专属 tokens，但不得复制 Carbon 颜色、字号、行高、阴影和交互 token。

## Grid
- Carbon 2x Grid 断点：320 / 672 / 1056 / 1312 / 1584px。
- 页面级布局优先使用 Carbon Grid；组件内部可使用语义清晰且符合断点的 CSS Grid/Flex。
- 不为嵌套内容机械增加 Grid wrapper。

## AppShell
- 使用 Carbon v11 UI Shell 官方组件和交互。
- 现有 JSX/CSS 可重构；保留认证、路由、权限和导航能力，不保留不符合 Carbon 的旧样式。
- Header、SideNav、Content 的尺寸、层级、偏移和响应式必须统一维护。
- 不在业务页面重复创建 Shell 或覆盖 Carbon 内部类。

## 阶段路线
1. Foundation：主题、Tokens、字体、Grid、AppShell。
2. Shared components：标题、表单、卡片、Tabs、DataTable、状态、空/加载/错误。
3. Business pages：按产品中心、全球情报中心、贸易准入、社媒、电商、SEO、采集和设置逐页重构。
4. Verification：TypeScript、生产构建、设计门禁、桌面/手机真实截图、业务回归。

## 验收原则
- 1440px 桌面、390px 手机作为常规视觉检查尺寸，并覆盖 Carbon 断点。
- 禁止 decorative box-shadow、重复页面标题、无意义 eyebrow、原生 select、业务页覆盖 Carbon 内部类。
- 必须保留已有业务数据、API、Supabase、Actor、权限和工作流。
- 未取得真实浏览器截图时，不得宣称视觉验收通过。
