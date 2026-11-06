# Meta 应用配置与渠道接入操作指南

适用范围：Kosmoevretis 组织独立 Meta App 模式。每个组织使用自己的 Meta Developer App；组织 Owner/Admin 管理本组织配置。本文不代表 Meta 已批准应用权限，也不代表消息收发能力已上线。Meta App 尚未通过审核时，仍可先创建应用、配置基础资料、保存组织凭证并准备回调；开发模式下只能在 Meta 允许的应用角色和测试资产范围内验证。

## 1. 开始前的准备

- 当前登录用户属于目标组织，且角色为 Owner 或 Admin。
- 组织已创建自己的 Meta Developer App，并可访问该 App 的设置。
- 已准备 App ID、App Secret、Webhook Verify Token，以及 Meta 当前支持的 Graph API Version。
- Supabase Edge Function 的 `SETTINGS_ENCRYPTION_KEY`（至少 32 字符）和 `APP_ORIGIN` 已由平台管理员配置。不要将任何密钥发送到聊天、工单或前端环境变量。

## 2. 打开组织 Meta 应用配置

进入 Kosmoevretis：**系统设置 → 渠道集成 → Meta 应用配置**。

页面按当前组织显示配置。只有组织 Owner/Admin 可以保存或测试凭证；普通成员不能管理 App Secret 或 Verify Token。

## 3. 填写配置

| 字段 | 填写内容 | 说明 |
|---|---|---|
| Meta App ID | Meta Developer App 的 App ID | 非秘密标识 |
| App Secret | 对应 App Secret | 仅在安全表单提交，服务端加密保存 |
| Webhook Verify Token | 自行设定的随机验证字符串 | 必须与 Meta Webhook 配置中的 Verify Token 完全一致 |
| Graph API Version | Meta 当前支持的版本，例如 `vX.Y` | 以 Meta 当前开发者文档/应用可用版本为准，不要照抄过期示例 |

首次保存时四项必需。后续修改时，Secret 字段留空表示保留服务端已保存的值；系统不会把明文或密文返回浏览器。

点击保存后，使用“测试 Meta App 凭证”执行服务端校验。该测试仅验证 App ID / App Secret 能否通过 Graph API 的应用凭证流程，不代表 Business Verification、App Review 或任何权限的 Advanced Access 已获批。测试失败时先核对 App ID/Secret 是否属于同一个 App、版本格式及 Meta App 状态。

## 4. 在 Meta Developer App 注册回调与 Webhook

使用配置页面显示的地址。当前 Supabase 项目对应：

**OAuth Redirect URI**
`https://npkesfmszokmlgnzqelb.supabase.co/functions/v1/meta-api?action=oauth_callback`

**Webhook Callback URL**
`https://npkesfmszokmlgnzqelb.supabase.co/functions/v1/meta-api/webhook`

在每个组织自己的 Meta App 中分别注册以上地址。Webhook Verify Token 必须与 Kosmoevretis 组织配置完全一致。按实际启用的产品选择 Page / WhatsApp 相关 Webhook 字段和权限，遵循 Meta 的权限最小化原则。

## 5. 发起渠道授权

完成 App 配置和 Meta 后台回调登记后，回到 Kosmoevretis 对应渠道页面：
1. 由组织管理员发起 Meta OAuth 授权。
2. 在 Meta 页面登录并同意必要权限。
3. 返回 Kosmoevretis 后，检查发现的 Page / WhatsApp Business Account 资产。
4. 明确选择需要接入的业务资产，再完成连接。
5. 在渠道连接列表确认组织、渠道、资产名称和连接状态正确。

OAuth state 与组织和发起用户绑定，短时有效且单次使用。若过期或流程中断，请重新发起授权。

## 6. 安全与故障排查

- **凭证测试失败**：核对 App ID 与 Secret 配对、Secret 是否已重置、Graph API 版本是否仍受支持。
- **OAuth 回调失败**：核对 Redirect URI 字符串完全一致、App 模式/权限、组织成员角色和授权用户。
- **Webhook 验证失败**：核对 Callback URL、Verify Token、订阅对象和字段。
- **Webhook POST 验签失败**：确认 Meta App Secret 与当前组织配置一致；不要关闭签名校验。
- **页面提示服务端加密配置缺失**：由平台管理员在 Supabase Edge Function secrets 检查 `SETTINGS_ENCRYPTION_KEY` 和 `APP_ORIGIN`。不要在浏览器或聊天中粘贴密钥。
- **权限/资产不可见**：确认登录 Meta 用户对目标 Page / WABA 有足够业务资产权限，并确认 App 已获得对应权限。

## 7. Meta 尚未审核通过时的使用方式

- 可以先完成应用基础资料、隐私政策/服务条款 URL、应用域名、OAuth Redirect URI 和 Webhook Callback URL 准备。
- 可以先在 Kosmoevretis 保存 App ID、App Secret、Verify Token 和 Graph API 版本，并执行凭证基础测试。
- 可以使用 Meta App 角色（管理员、开发者、测试者）及测试 Page / 测试号码进行受限联调，具体可用范围由 Meta 当前开发模式规则决定。
- 不要将“凭证测试通过”理解为“权限审核通过”；正式客户授权、Advanced Access 和生产消息能力仍以 Meta 控制台审核结果为准。
- 页面会在凭证未验证时阻止发起渠道 OAuth，避免误以为尚未准备好的 App 已可直接连接。

## 8. 当前能力边界

当前版本提供组织级 App 配置、凭证加密、OAuth 授权入口、资产选择、连接管理，以及 Webhook challenge / HMAC 验签和事件收件箱持久化基础。

以下能力尚未交付：Webhook 事件归一化到 CRM 会话/消息、消息发送、模板管理、Opt-in 证据管理、送达回执、自动化审批执行。系统不会因为完成 Meta 连接就自动发送消息。Meta Business Verification、App Review 和 Advanced Access 由各组织按实际权限需求自行完成。

## 9. 官方入口

- Meta for Developers: https://developers.facebook.com/
- Meta Apps: https://developers.facebook.com/apps/
- Meta Graph API 文档: https://developers.facebook.com/docs/graph-api/
- WhatsApp Cloud API 文档: https://developers.facebook.com/docs/whatsapp/cloud-api/
