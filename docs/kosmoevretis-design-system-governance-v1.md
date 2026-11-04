# Kosmoevretis Design System Governance v1.0

状态：新页面开发强制规则。基础体系：IBM Carbon Design System v11 / Gray 10。

## 1. 分层职责

1. **Foundation**：Carbon 主题与 design-tokens.css。颜色、字体、间距、焦点和 AppShell 尺寸只能由基础层维护。
2. **Shared components**：src/design-system/components。集中维护跨页面重复的页面标题、区块、空状态、加载、错误和状态标签等基础模式。
3. **Page patterns**：src/design-system/patterns。根据业务任务选择情报工作台、数据列表、配置管理和分析报告模板。
4. **Business pages**：业务页面只负责数据、业务交互和内容编排；不得重新定义全站视觉规则。

## 2. 使用约定

- 新页面优先从 src/design-system 导入公共组件和模板。
- 页面标题、区块标题、空状态、加载状态、错误状态和状态 Tag 优先使用共享实现。
- 情报工作台使用 IntelligencePageTemplate；列表使用 DataListPageTemplate；配置页使用 ConfigurationPageTemplate；研究报告使用 AnalysisPageTemplate。
- 页面模板的 slots 接收业务 React 内容，不规定业务数据结构，不替代业务逻辑。
- 表单、按钮、Tabs、表格和通知优先使用 Carbon v11；下拉框只允许 Carbon Dropdown、ComboBox 或项目 CarbonSelect。
- 页面专属 CSS 仅允许定义业务特有布局，不允许覆盖 html/body/:root、Carbon 内部类或另建颜色体系。
- 新增共享组件或修改 Tokens 必须单独提交，并同步更新设计系统预览和规范文档。

## 3. 例外流程

确有业务理由无法使用现有组件时：
1. 说明现有组件无法满足的具体场景。
2. 先判断能否通过公共组件新增受控 props 解决。
3. 需要新增组件时放入 design-system，并附可访问性、响应式和状态处理。
4. 需要页面私有样式时限制作用域，并说明保留原因。

不得以赶工为由复制公共组件或全局控件 CSS。

## 4. 自动检查

npm run design-system:check 扫描 src/pages：
- 每个新页面必须使用 IntelligencePageTemplate、DataListPageTemplate、ConfigurationPageTemplate 或 AnalysisPageTemplate 之一。
- 禁止浏览器原生 select。
- 禁止页面 CSS 硬编码 HEX/RGB 颜色。
- 禁止页面 CSS 覆盖全局元素和 Carbon 内部类。

检查由 GitHub Actions 在构建前执行。新业务页面统一放入 src/pages，以便自动门禁覆盖；尚未迁移的旧页面保持原路径，按页面逐一迁移。后续迁移现有页面时，按页面逐一纳入该目录与检查范围；在迁移完成前不对存量页面进行全仓库强制拦截。

## 5. 新页面交付门槛

新页面必须：
- 使用一个已批准页面模板或说明为何不适用。
- 复用共享组件与 Carbon 控件。
- 覆盖加载、空、错误、成功等适用状态。
- 通过 TypeScript、生产构建和设计系统检查。
- 完成桌面/移动端与既有页面回归。
- 在 3c-platform 分支提交并验证 Cloudflare Build / Deploy。
