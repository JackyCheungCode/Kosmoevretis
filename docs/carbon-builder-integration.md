# IBM Carbon Builder / MCP 接入说明

本仓库集成 IBM Carbon 官方 Carbon Builder Skill，并提供 Carbon MCP 远程服务配置。

## 官方来源
- Carbon MCP 仓库：https://github.com/carbon-design-system/carbon-mcp
- 官方安装说明：https://www.carbondesignsystem.com/getting-started/carbon-mcp/onboarding-and-setup
- 远程 MCP 地址：`https://mcp.carbondesignsystem.com/mcp`
- Carbon Builder Skill：官方仓库 `public/skills/carbon-builder`，Apache-2.0。

## 仓库内集成
- `.github/skills/carbon-builder/`：供 GitHub Copilot coding agent 发现。
- `.mcp.json`：不含凭据的远程 Carbon MCP 端点配置。
- Skill 主文件保留官方内容，并追加 Kosmoevretis 项目约束；官方参考文件完整同步。

## 在支持 MCP 的开发客户端中启用
1. 打开客户端的 MCP / Server 设置。
2. 添加仓库根目录的 `.mcp.json` 配置，或手动添加远程服务器：
   - 类型：Streamable HTTP
   - URL：`https://mcp.carbondesignsystem.com/mcp`
3. 按客户端提示完成 IBMid OAuth 登录。
4. 确认 Carbon MCP 服务器已连接，然后新开 Agent 会话，让客户端重新载入仓库 Skill。

Carbon MCP 需要 IBMid 身份认证。仓库配置只包含公开服务地址，不包含 token、session ID 或任何密钥。不要把个人凭据提交到 Git。

## Kosmoevretis 使用规则
Carbon Builder 是 Carbon 组件、Token、图标、图表和官方文档的事实来源；本项目现有治理文档仍是项目架构与视觉规则的事实来源。不得以安装官方 Skill 为由替换 Carbon v11、Gray 10、AppShell、Design Tokens 或现有业务组件。

视觉验收必须以真实桌面和手机截图为依据。代码检查和构建通过不等于视觉验收通过。


## 规范冲突审计与优先级（2026-11-05）

项目规则优先于 Skill 中的通用示例，具体执行顺序：

1. Kosmoevretis Design Governance 与 UI Standard：决定 Gray 10、Design Tokens、AppShell、导航、页面模板、断点和 CSS 边界。
2. IBM Carbon v11：提供组件语义、交互、无障碍和基础设计原则。
3. Carbon Builder Skill / MCP：提供 Carbon 组件、图标、Charts、API 和官方文档检索辅助，不得改变项目架构。

已明确的冲突处理：
- 通用 `cds--white` fallback 不适用于本项目，必须保留 Gray 10。
- 通用“所有布局必须使用 Carbon Grid”调整为新页面优先使用；现有模板及可访问的 CSS Grid/Flex 布局无需为满足示例而重构。
- 通用 UIShell / Content 组合不得替换现有 AppShell，也不得重复添加固定 Header 的 48px 偏移。
- AppShell 中已有的 Carbon 内部类选择器属于集中维护的既有集成边界；业务页面不得复制或扩展该例外。
- MCP-first 只在当前 Agent 确实连接 MCP 时强制执行；未连接时按已安装 Carbon 版本、项目现有用法和官方文档验证，不得虚称 MCP 已查询。

官方 Skill 的参考资料保持原样；项目例外写在 Skill 主文件、相关参考文件的项目附录及本说明中，避免篡改上游通用知识。
