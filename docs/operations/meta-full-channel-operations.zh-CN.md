# Meta 全渠道业务能力交付记录

开发分支：`feat/meta-full-channel-operations`  
目标基线：`3c-platform`（本分支叠加 Meta 预审准备分支的改动）

## 已交付的第一批能力

### Facebook Pages
- 组织授权的 Page 资产选择与连接。
- Page 帖子草稿、文字/链接发布。
- 单张公开图片 URL 发布（图片由 Meta 服务器读取）。
- 同步最近 50 条 Page 帖子到本地内容列表。
- 同步评论、回复评论、隐藏/取消隐藏评论。
- Page Insights 基础查询（按日指标，取决于获批权限）。
- OAuth 完成后自动尝试订阅 Page Webhook 的 feed 或 Messenger 事件字段，并把订阅状态写入资产元数据。

### WhatsApp Business
- Webhook 入站消息归一化为 CRM 会话和消息。
- 发送状态回执更新（sent / delivered / read / failed）。
- 同步 WhatsApp 模板及其审核状态。
- 发送 Meta 已批准模板（需要有效 opt-in 证据）。
- 在 24 小时服务窗口内发送文本回复（仍要求有效 opt-in）。
- 组织级 opt-in / opt-out 证据记录。

### Messenger
- Webhook 入站消息归一化为 CRM 会话和消息。
- 24 小时服务窗口内文本回复。
- 统一消息中心会话列表、消息时间线、待审批草稿和管理员审核发送。

### 安全与数据治理
- App Secret / Verify Token / 渠道 Access Token 保持服务端加密。
- 新增帖子、评论、模板和同意记录数据表；组织 RLS 读取隔离。
- 帖子、评论、模板和同意记录的写操作由服务端 Edge Function 执行。
- 发送操作检查组织管理员权限、服务窗口、WhatsApp opt-in 和草稿状态；草稿发送采用状态抢占，降低重复发送风险。
- Webhook 继续校验 Meta HMAC 签名并先持久化幂等事件，再归一化入站消息。
- 已部署 Supabase Edge Functions：`meta-api` v6、`meta-operations` v2。

## 当前尚未交付 / 需要后续阶段完成

- Facebook 视频、多图轮播、Reels、Stories、直播、排程发布、批量内容日历。
- 完整媒体上传/下载、附件代理与病毒扫描。
- 更完整的 Page 互动类型、评论分页、私信附件和对话分页同步。
- WhatsApp 媒体消息收发、模板创建/编辑/提交审核、模板变量编辑器、质量评级与号码健康监控。
- Messenger 媒体消息、结构化消息、按钮/菜单、标签与人工接管规则的完整 UI。
- Instagram Business / Creator 资产连接与内容能力。
- Webhook 事件重试工作台、死信队列、后台定时消费者和可观测性面板。
- Token 轮换、过期自动告警、远程撤销和资产权限变更检测。
- Meta App Review / Advanced Access 通过后的真实客户账号验收。

## 审核与启用边界

Meta OAuth 凭证测试通过不代表 Business Verification、App Review 或 Advanced Access 获批。未获批期间，只能在 Meta 允许的开发者角色和测试资产范围内联调。正式客户资产和生产消息能力必须在 Meta 审核、权限授权及真实 Webhook 验收后启用。

本交付不读取个人 Facebook 私密内容、不访问未授权 Page、不进行陌生用户批量触达，也不绕过 WhatsApp opt-in、模板审核或 Messenger 消息窗口限制。
