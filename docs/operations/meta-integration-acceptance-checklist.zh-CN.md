# Meta 组织隔离接入验收清单

本清单用于开发/预览环境验收。任何一项未通过都应记录为阻断或待办，不得以代码已部署代替真实集成验收。

## A. 部署与运行环境
- [ ] Supabase 数据库迁移已应用；`crm_meta_app_configs` 开启 RLS。
- [ ] `anon` 与 `authenticated` 对凭证表无直接权限；仅 service role 可访问。
- [ ] `meta-api` Edge Function 为 ACTIVE，`verify_jwt=false`，函数内部管理 API 自行验证用户身份和组织角色。
- [ ] Supabase Edge Function secrets 中存在 `SETTINGS_ENCRYPTION_KEY`（至少 32 字符）和正确的 `APP_ORIGIN`；只核验存在性/配置正确性，不输出密钥值。
- [ ] 新版函数部署后至少完成一次真实 API 请求，并检查对应日志无密钥、Token、Authorization Header 或原始敏感内容泄露。

## B. 组织权限与凭证隔离
- [ ] 组织 A Owner/Admin 可读取、保存、测试组织 A 配置。
- [ ] 组织 A 普通成员无法保存或测试 App 凭证。
- [ ] 组织 B 用户不能读取、覆盖或推断组织 A 的配置。
- [ ] 保存后 App Secret / Verify Token 仅以服务端 AES-GCM 密文形式持久化。
- [ ] API 响应、浏览器网络响应、前端状态和日志不包含明文或密文。
- [ ] Secret 字段留空更新非秘密字段时，原 Secret 保留。
- [ ] 错误响应不泄露密钥、内部 SQL 或敏感配置。

## C. OAuth
- [ ] OAuth start 要求有效 Supabase 用户会话和组织 Owner/Admin 权限。
- [ ] OAuth state 随机、短时有效、单次使用，并绑定 organization_id、user_id、provider。
- [ ] 回调只能使用 state 所绑定组织的 Meta App 配置。
- [ ] 无效、过期、重复使用或跨组织 state 均被拒绝。
- [ ] Redirect URI 与 Meta Developer App 登记值完全一致。
- [ ] 资产发现仅返回授权用户可访问的 Page / WABA 元数据，不返回 Access Token。
- [ ] 完成连接后 Token 加密保存，连接记录组织归属正确。

## D. Webhook
- [ ] GET challenge 仅接受有效订阅模式和对应组织 Verify Token。
- [ ] 无效 Verify Token 不返回 challenge。
- [ ] POST 使用原始请求体执行 X-Hub-Signature-256 HMAC-SHA256 校验。
- [ ] 无签名、错误签名和错误 App Secret 均拒绝。
- [ ] 多组织 App Secret 匹配后，事件只允许进入匹配组织的连接范围。
- [ ] 重复事件通过幂等键去重。
- [ ] 事件成功持久化后才返回成功响应。
- [ ] Webhook 不依赖 Supabase 用户 JWT；管理 API 仍必须做用户/组织鉴权。

## E. 前端与体验
- [ ] 设置入口只对有权限的角色显示或允许操作。
- [ ] 组织切换后配置状态与组织一致，无跨组织残留。
- [ ] 表单、错误提示和加载状态符合 Carbon 设计系统。
- [ ] 不使用浏览器原生 select/dropdown。
- [ ] OAuth Redirect URI / Webhook URL 可复制且内容准确。
- [ ] Secret 不回显；留空保留旧值的行为有明确说明。
- [ ] 移动端窄屏下表单和状态信息可读。

## F. 发布与产品边界
- [ ] CI：typecheck、design-system guard、production build 全部通过。
- [ ] Cloudflare Preview 页面实际打开并完成手工检查。
- [ ] 组织管理员使用测试 Business Portfolio、测试 Page / WhatsApp 号码完成联调。
- [ ] Meta Business Verification / App Review / Advanced Access 状态已记录。
- [ ] 明确告知用户：消息入库归一化、发送、模板、Opt-in、送达回执和审批执行尚未交付。
- [ ] 未经单独授权，不合并 PR、不部署 Cloudflare 生产。

## 验收结果记录

| 项目 | 结果 | 证据 / 缺陷 |
|---|---|---|
| 数据库与 RLS | 已应用，待回归 | |
| Edge Function 部署 | 已部署，运行时待联调 | |
| Secrets | 待平台管理员核验 | |
| 组织权限隔离 | 待双组织测试 | |
| OAuth | 待真实 Meta App 测试 | |
| Webhook | 待 Meta 控制台回调测试 | |
| CI / Preview | 待最新文档提交检查 | |
