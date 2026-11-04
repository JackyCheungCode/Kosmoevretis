# Kosmoevretis Design System Governance v1.0

状态：新页面开发强制规则。基础体系：IBM Carbon Design System v11 / Gray 10。

## 1. 分层职责

1. **Foundation**：Carbon 主题与 design-tokens.css。颜色、字体、间距、焦点和 AppShell 尺寸只能由基础层维护。
2. **Shared components**：src/design-system/components。集中维护跨页面重复的页面标题、区块、空状态、加载、错误和状态标签等基础模式。
3. **Page patterns**：src/design-system/patterns。根据业务任务选择情报工作台、数据列表、配置管理和分析报告模板。
4. **Application Shell**：src/app-shell.css 与 App.tsx 统一管理顶部栏、侧边导航、导航状态和响应式行为；业务页面不得创建或覆盖全局 Shell。
5. **Business pages**：业务页面只负责数据、业务交互和内容编排；不得重新定义全站视觉规则。

## 2. AppShell 与导航规范

- 全站使用统一 IBM Carbon v11 UI Shell：Carbon Header、HeaderName、HeaderMenuButton、SideNav、SideNavItems、SideNavMenu、SideNavMenuItem / SideNavLink、SkipToContent。
- 顶部栏高度统一为 48px，使用 Carbon inverse header 层级；品牌、全局操作属于 Header，不在业务页面重复实现。
- 菜单配置集中维护；桌面、平板和手机共用同一导航信息与路由定义。
- 桌面端（宽度大于 1055px）：侧边栏默认完整展开，显示分组、图标和文字，宽度 256px。
- 平板端（672px–1055px）：侧边栏默认收起为 48px 图标栏；图标必须具备可访问名称和 Tooltip。用户可通过 Header 菜单按钮展开；展开时覆盖内容，不持续挤压主工作区。
- 手机端（宽度不超过 671px）：侧边栏默认隐藏；Header 显示菜单按钮；点击后以抽屉/覆盖方式展开完整导航，不占据主内容宽度。
- 移动端导航支持遮罩关闭、Escape 关闭、路由跳转后关闭，并将焦点移回菜单触发按钮；打开时焦点进入导航。
- 当前路由必须以 aria-current="page" 或等效 Carbon 当前页语义表达，不能只用颜色或 CSS class。
- 导航图标使用 @carbon/icons-react，不允许使用 Unicode 字符或 CSS 线条模拟功能图标。
- 导航焦点、Hover、Active、选中和展开状态使用 Carbon 组件行为与 Design Tokens。
- AppShell 尺寸只从 design-tokens.css 读取；禁止在 styles.css 或业务 CSS 中重复定义顶栏、侧栏宽度和断点。
- 以背景层级组织信息，以极少量边框辅助结构；禁止为每个菜单项添加独立边框。

## 3. 使用约定

- 新页面优先从 src/design-system 导入公共组件和模板。
- 页面标题、区块标题、空状态、加载状态、错误状态和状态 Tag 优先使用共享实现。
- 情报工作台使用 IntelligencePageTemplate；列表使用 DataListPageTemplate；配置页使用 ConfigurationPageTemplate；研究报告使用 AnalysisPageTemplate。
- 页面模板的 slots 接收业务 React 内容，不规定业务数据结构，不替代业务逻辑。
- 表单、按钮、Tabs、表格和通知优先使用 Carbon v11；下拉框只允许 Carbon Dropdown、ComboBox 或项目 CarbonSelect。
- 页面专属 CSS 仅允许定义业务特有布局，不允许覆盖 html/body/:root、Carbon 内部类或另建颜色体系。
- 新增共享组件或修改 Tokens 必须单独提交，并同步更新设计系统预览和规范文档。

### 3.1 采集工作台公共模式

- Instagram、X、Reddit、Pinterest、TikTok、YouTube 等采集工作台统一使用 `CollectionModeGrid`。
- 卡片尺寸、网格断点、文本截断、选中与焦点状态由公共组件和 `src/design-tokens.css` 语义令牌维护；业务页面不得自定义卡片宽高或复制卡片 CSS。
- 每个发现对象卡片必须展示与对象类型相匹配的 Carbon 图标；优先传入明确图标，未配置时由公共组件按对象类型映射，不得由业务页面另写图标卡片。
- 采集页面由业务模板负责唯一页面标题；AppShell 不得重复渲染页面标题、说明或 eyebrow。
- Actor、备用执行器、Run / Dataset 标识和调度实现属于服务端技术细节，不作为普通用户页面内容展示。原始数据查看与导出仍可保留。
- 公共采集组件必须在 `src/DesignSystemPreview.tsx` 中提供交互预览，并覆盖桌面、平板和移动端布局。

## 4. 例外流程

确有业务理由无法使用现有组件时：
1. 说明现有组件无法满足的具体场景。
2. 先判断能否通过公共组件新增受控 props 解决。
3. 需要新增组件时放入 design-system，并附可访问性、响应式和状态处理。
4. 需要页面私有样式时限制作用域，并说明保留原因。

不得以赶工为由复制公共组件或全局控件 CSS。

## 5. 自动检查

npm run design-system:check 扫描 src/pages，并显式纳入设置中心根目录页面与样式：
- 每个新页面必须使用 IntelligencePageTemplate、DataListPageTemplate、ConfigurationPageTemplate 或 AnalysisPageTemplate 之一。
- 禁止浏览器原生 select。
- 禁止页面 CSS 硬编码 HEX/RGB 颜色。
- 禁止页面 CSS 覆盖全局元素和 Carbon 内部类。

检查由 GitHub Actions 在构建前执行。新业务页面统一放入 src/pages，以便自动门禁覆盖；设置中心作为既有根目录页面，由脚本显式检查 src/Settings.tsx、src/SettingsBackend.tsx 和 src/settings-center.css。其他尚未迁移的旧页面保持原路径，按页面逐一迁移；在迁移完成前不对存量页面进行全仓库强制拦截。

## 6. 新页面交付门槛

新页面必须：
- 使用一个已批准页面模板或说明为何不适用。
- 复用共享组件与 Carbon 控件。
- 覆盖加载、空、错误、成功等适用状态。
- 通过 TypeScript、生产构建和设计系统检查。
- 完成桌面/移动端与既有页面回归。
- 在 3c-platform 分支提交并验证 Cloudflare Build / Deploy。


## 7. 设置中心专项约束

- 设置中心使用 `ConfigurationPageTemplate`，页面内容标题通过 `PageSection` 表达；不得再创建平行的页面框架或重复标题工具栏。
- 设置分类导航使用真实路由链接（React Router `NavLink`），当前项必须输出 `aria-current="page"`；不得使用按钮模拟页面导航。
- 桌面和平板使用配置模板的侧栏布局；手机端改为可访问的覆盖式导航，支持 Escape 关闭、遮罩关闭和焦点恢复。
- 设置中心样式统一放在 `src/settings-center.css`，使用 Carbon/Kosmo tokens；不得覆盖 Carbon 内部类、使用 `!important` 或重复追加响应式补丁。
- 自动检查覆盖 `src/Settings.tsx`、`src/SettingsBackend.tsx` 和 `src/settings-center.css`，不再因设置中心位于 `src/` 根目录而漏检。\n