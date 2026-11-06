# Kosmoevretis Design System Governance v1.0

状态：全站重构基准。规范优先级：IBM Carbon Design System v11 → Carbon Builder Skill / MCP → Kosmoevretis 项目治理。基础主题选型：Carbon Gray 10。

## 1. 分层职责

1. **Foundation**：以 IBM Carbon v11 官方设计系统为准。主题、颜色、字体、排版、间距、网格、焦点和层级使用 Carbon 官方规范与 Tokens；项目 tokens 只作语义别名，不另造平行体系。
2. **Shared components**：src/design-system/components。集中维护跨页面重复的页面标题、区块、空状态、加载、错误和状态标签等基础模式。
3. **Page patterns**：src/design-system/patterns。根据业务任务选择情报工作台、数据列表、配置管理和分析报告模板。
4. **Application Shell**：使用 Carbon v11 UI Shell 组件和官方交互模式。App.tsx 与 src/app-shell.css 是项目集成位置，不是不可变设计模板；允许按 Carbon 官方结构重构 Header、SideNav、Content 和响应式行为，同时保留认证、路由与导航业务能力。
5. **Business pages**：业务页面按 Carbon 官方组件、Grid、Typography、Layer 和交互模式重新组织；保留业务数据、接口、权限和工作流，不保留不符合 Carbon 的旧视觉实现。

## 2. AppShell 与导航规范

- 全站使用统一 IBM Carbon v11 UI Shell：Carbon Header、HeaderName、HeaderMenuButton、SideNav、SideNavItems、SideNavMenu、SideNavMenuItem / SideNavLink、SkipToContent，以及官方推荐的 Content 布局模式（按当前 Carbon React API 核实导入与用法）。
- 顶部栏使用 Carbon 官方 Header 尺寸与 inverse 层级；Gray 10 主画布上使用 Carbon 官方推荐的 Header 主题层级。品牌、全局操作属于 Header，不在业务页面重复实现。
- 菜单配置集中维护；桌面、平板和手机共用同一导航信息与路由定义。
- 桌面端（宽度大于 1055px）：侧边栏默认完整展开，显示分组、图标和文字，宽度 256px。
- 平板端（672px–1055px）：侧边栏默认收起为 48px 图标栏；图标必须具备可访问名称和 Tooltip。用户可通过 Header 菜单按钮展开；展开时覆盖内容，不持续挤压主工作区。
- 手机端（宽度不超过 671px）：侧边栏默认隐藏；Header 显示菜单按钮；点击后以抽屉/覆盖方式展开完整导航，不占据主内容宽度。
- 移动端导航支持遮罩关闭、Escape 关闭、路由跳转后关闭，并将焦点移回菜单触发按钮；打开时焦点进入导航。
- 当前路由必须以 aria-current="page" 或等效 Carbon 当前页语义表达，不能只用颜色或 CSS class。
- 导航图标使用 @carbon/icons-react，不允许使用 Unicode 字符或 CSS 线条模拟功能图标。
- 导航焦点、Hover、Active、选中和展开状态使用 Carbon 组件行为与 Design Tokens。
- AppShell 尺寸优先使用 Carbon 尺寸和 Grid 规范；项目专属尺寸通过 design-tokens.css 语义别名维护，禁止在 styles.css 或业务 CSS 中重复定义顶栏、侧栏宽度和断点。
- 以背景层级组织信息，以极少量边框辅助结构；禁止为每个菜单项添加独立边框。

## 3. 使用约定

- 新页面优先使用 Carbon v11 官方组件与 Grid；项目共享组件和模板只作为业务模式封装，若与 Carbon 官方模式冲突，应先重构共享组件，不得要求新页面迁就旧组件。
- 页面标题、区块标题、空状态、加载状态、错误状态和状态 Tag 优先使用共享实现。
- 情报工作台使用 IntelligencePageTemplate；列表使用 DataListPageTemplate；配置页使用 ConfigurationPageTemplate；研究报告使用 AnalysisPageTemplate。
- 页面模板的 slots 接收业务 React 内容，不规定业务数据结构，不替代业务逻辑；现有模板不是强制视觉框架，可按 Carbon 标准逐步重构。
- 表单、按钮、Tabs、表格和通知优先使用 Carbon v11；下拉框只允许 Carbon Dropdown、ComboBox 或项目 CarbonSelect。
- 页面专属 CSS 仅允许定义业务特有布局；优先采用 Carbon Grid 和官方组件 API，不覆盖 html/body/:root、Carbon 内部类或另建颜色体系。
- 新增共享组件或修改 Tokens 必须单独提交，并同步更新设计系统预览和规范文档。

### 3.1 采集工作台公共模式

- Instagram、X、Reddit、Pinterest、TikTok、YouTube 等采集工作台统一使用 `CollectionModeGrid`。
- 卡片尺寸、网格断点、文本截断、选中与焦点状态由公共组件和 `src/design-tokens.scss` 语义令牌维护；业务页面不得自定义卡片宽高或复制卡片 CSS。
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
- 每个新页面必须采用 Carbon 官方组件和页面级布局；现有模板可作为可选业务模式，不得成为阻止 Carbon 原生结构的强制门槛。
- 禁止浏览器原生 select。
- 禁止页面 CSS 硬编码 HEX/RGB 颜色。
- 禁止页面 CSS 覆盖全局元素和 Carbon 内部类。

检查由 GitHub Actions 在构建前执行。新业务页面统一放入 src/pages，以便自动门禁覆盖；设置中心作为既有根目录页面，由脚本显式检查 src/Settings.tsx、src/SettingsBackend.tsx 和 src/settings-center.css。其他尚未迁移的旧页面保持原路径，按页面逐一迁移；在迁移完成前不对存量页面进行全仓库强制拦截。

## 6. 新页面交付门槛

新页面必须：
- 优先使用 Carbon 官方 UI Shell、Grid 和组件；可复用已符合 Carbon 的项目模板，不符合时允许先重构模板。
- 复用共享组件与 Carbon 控件。
- 覆盖加载、空、错误、成功等适用状态。
- 通过 TypeScript、生产构建和设计系统检查。
- 完成桌面/移动端与既有页面回归。
- 在 3c-platform 分支提交并验证 Cloudflare Build / Deploy。


## 7. 设置中心专项约束

- 设置中心优先采用 Carbon 官方导航、表单和内容布局；现有 `ConfigurationPageTemplate` 可重构，不得为保留旧模板而牺牲 Carbon 结构。
- 设置分类导航使用真实路由链接（React Router `NavLink`），当前项必须输出 `aria-current="page"`；不得使用按钮模拟页面导航。
- 桌面和平板使用配置模板的侧栏布局；手机端改为可访问的覆盖式导航，支持 Escape 关闭、遮罩关闭和焦点恢复。
- 设置中心样式统一放在 `src/settings-center.css`，使用 Carbon/Kosmo tokens；不得覆盖 Carbon 内部类、使用 `!important` 或重复追加响应式补丁。
- 自动检查覆盖 `src/Settings.tsx`、`src/SettingsBackend.tsx` 和 `src/settings-center.css`，不再因设置中心位于 `src/` 根目录而漏检。\n

## 8. 全站重构原则（2026-11-05）

### 8.1 规范优先级
1. **IBM Carbon Design System v11**：唯一基础设计标准，涵盖组件、主题、Grid、Typography、Spacing、Layer、交互和无障碍。
2. **Carbon Builder Skill / MCP**：Carbon 标准的查询、实现和验证工具；连接可用时优先通过 MCP 获取实时 API 与示例。
3. **Kosmoevretis Governance**：定义产品业务、路由、数据、权限、中文内容、品牌主题选型和项目集成边界；不得与 Carbon 官方标准相抵触。

### 8.2 允许重构的范围
- AppShell、Header、SideNav、Content、页面模板和共享组件都允许按 Carbon 官方规范重新设计。
- 现有 CSS、组件和布局不是视觉正确性的依据；不为兼容旧样式而保留错误结构。
- 必须保留并回归验证业务能力：路由、认证、权限、Supabase 数据、API 调用、Actor 输入输出和已有用户工作流。
- 先建立基础层，再重构公共组件，最后逐页迁移业务页面。

### 8.3 主题与 Tokens
- 当前项目主题选用 Carbon Gray 10；Header 可按 Carbon 官方 UI Shell 推荐使用 inverse theme 层级，不得因此将主画布切换为 Gray 100。
- `src/design-tokens.css` 只提供 Carbon 官方 Tokens 的 Kosmoevretis 语义别名和少量业务尺寸。
- Carbon spacing scale 必须采用官方 2 / 4 / 8 / 12 / 16 / 24 / 32 / 40 / 48 / 64 / 80 / 96px 体系；旧 `--kosmo-space-*` 仅作兼容映射，新代码优先使用 `--kosmo-spacing-*` 或 `--cds-spacing-*`。
- 不得以 CSS 固定值重新实现 Carbon 的颜色、字体、字号、行高、间距和交互状态。

### 8.4 Grid 与断点
- 遵循 Carbon 2x Grid 断点：320 / 672 / 1056 / 1312 / 1584px。
- 新页面优先采用 Carbon Grid 组件；已有 CSS Grid/Flex 只有在结构清晰、符合 Carbon 2x Grid 和无障碍要求时才保留。
- 不为嵌套小组件机械添加 Grid/Column；以页面级布局和内容列为主要使用场景。

### 8.5 AppShell
- AppShell 必须按 Carbon v11 UI Shell 的官方组合、尺寸、主题层级和交互模式验收。
- 允许重构当前 Shell 的 CSS 和 JSX；不得将旧有 48px header、侧栏尺寸或自定义覆盖当成不可变规则。
- 禁止业务页面自行实现 Header、SideNav 或第二套内容偏移。


## 9. Carbon Content 与 Grid 实施约定（2026-11-05）

- 使用 Carbon `Content` 作为 UI Shell 的主内容容器，顶部偏移采用官方 Header 高度（3rem）；不要在业务页面再叠加 Header 高度。
- 页面级布局使用 Carbon v11 `Grid` 和 `Column`，优先 `Grid fullWidth`，并按 2x Grid 在 sm/md/lg 等断点设置列跨度。
- 多层布局必须按官方结构嵌套 `Grid > Column > Grid`，避免将 Column 直接嵌套在 Column 中。
- 页面级 gutters 交由 Carbon Grid 管理，Content 容器不再叠加第二套水平 padding。
- 组件内部的 CSS Grid/Flex 可用于数据卡片、表单字段和局部排列，不取代页面级 Carbon Grid。
