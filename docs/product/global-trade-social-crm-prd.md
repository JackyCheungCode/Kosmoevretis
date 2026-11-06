# 全球外贸客户与社交渠道中心 PRD

- 产品：Kosmoevretis 全球 3C 市场情报平台
- 目标：将市场情报、潜客发现、社交渠道沟通、CRM 与销售跟进连接为外贸业务闭环
- 开发基线：`feat/global-trade-social-crm`，基于导航重构预览分支快照
- 自动化策略：Hybrid，人机协作；商务承诺与对外发送默认需要人工确认

## 1. 产品目标

从全球市场信号中发现潜在买家，将客户及其来源、兴趣、采购需求沉淀为统一客户档案，并通过授权的 Meta 商业 API 与邮件渠道开展持续沟通，最终跟踪报价、样品、订单和复购。

## 2. 业务工作流

1. 市场发现：复用 Google、全球电商、社媒与公开网页情报能力，识别品类需求、品牌、分销商、零售商和潜在采购商。
2. 客户识别：AI 归一化企业/联系人，识别国家地区、网站、渠道来源、产品兴趣和采购角色；合并重复线索并保留来源证据。
3. 客户经营：建立统一客户档案、联系人、标签、负责人、客户等级、沟通时间线和商机阶段。
4. 多渠道沟通：连接 Facebook Page、WhatsApp Business Platform、Messenger；复用现有邮件沟通工作区。
5. AI 销售协作：会话摘要、意图/实体抽取、多语言草稿、产品推荐、FAQ 检索、跟进提醒；支持人工接管。
6. 商机转化：记录需求、报价版本、样品、订单、成交/丢单原因与复购机会。
7. 经营分析：按国家、品类、来源渠道、客户类型、负责人和阶段分析线索质量及转化。

## 3. 导航与页面

纳入「客户与渠道」业务域，建议页面：
- 全球客户中心：客户列表、筛选、客户详情与时间线。
- 客户发现：复用现有 Facebook/Instagram/LinkedIn/Google Maps 发现能力，支持线索审核后入库。
- 社交渠道连接：Meta 应用连接状态、Page/WhatsApp Business Account/号码资产、Webhook 状态、权限与健康检查。
- 统一消息中心：会话列表、渠道标识、客户上下文、AI 建议回复、人工接管、发送确认。
- 销售商机：阶段看板/列表、下一步动作、报价与样品记录。
- 外贸分析：来源质量、国家分布、阶段转化与响应效率。

## 4. Meta 渠道能力边界

### Facebook Pages
- 对已授权 Page 读取可用主页内容、评论及 Insights；在获批权限范围内发布和管理 Page 内容、处理互动。
- 不提供读取任意个人账号私密内容、任意群组或全站用户数据的能力。

### WhatsApp Business Platform
- 基于 WhatsApp Cloud API 与 Webhooks 接收和发送业务消息。
- 支持客户服务窗口内回复；窗口外主动触达按 Meta 模板、用户同意及平台政策执行。
- 支持消息状态、媒体消息和会话归档；模板审核状态需可见。

### Messenger
- 基于已授权 Facebook Page 接收和回复 Page 私信。
- 遵循 Messenger 消息窗口、用户互动和平台政策；不支持无条件批量触达陌生用户。

### 接入要求
- Meta Developer App、Business Portfolio/Business Verification（按应用场景要求）、OAuth 授权、权限审核/App Review（按权限要求）、Webhook HTTPS 回调。
- Token、App Secret、Webhook Verify Token 只能保存在服务端密钥环境，不得写入前端、日志或普通业务表。
- 每个组织独立授权和隔离资产；支持撤销授权、Token 失效提示和重新连接。

## 5. 核心数据对象

- `trade_accounts`: 组织级渠道账户连接，记录 provider、external_business_id、授权状态、scope 摘要、token_secret_ref、最后校验时间。
- `trade_channel_assets`: Page、WhatsApp Business Account、电话号码等授权资产。
- `crm_companies`: 客户企业主档，含名称、域名、国家/地区、行业、规模、来源与去重键。
- `crm_contacts`: 联系人及其渠道身份；仅保存合法取得且业务所需的数据。
- `crm_leads`: 线索来源、原始记录引用、产品兴趣、采购意向、评分、审核状态。
- `crm_conversations`: 渠道会话、参与者、负责人、状态及最近活动。
- `crm_messages`: 消息方向、类型、时间、外部消息 ID、投递状态、媒体引用；敏感内容按保留策略管理。
- `crm_opportunities`: 商机阶段、预估金额/币种、产品、数量、预计成交日期、负责人。
- `crm_activities`: 跟进、备注、任务、报价、样品和订单事件。
- `crm_ai_suggestions`: AI 摘要、意图、实体、建议草稿、模型版本与人工采纳状态。

所有业务数据必须带 organization_id 并执行 Supabase RLS。外部 ID 应按 provider + organization 唯一约束。Webhook 事件需幂等处理。

## 6. AI 能力与安全规则

- 会话摘要、语言识别/翻译、产品与采购需求抽取、客户分类、线索评分、回复草稿和跟进建议。
- AI 草稿必须展示引用的客户上下文；不确定字段标记为待确认。
- 默认不自动发送外部消息，不自动承诺价格、库存、交期、认证或付款条件。
- 发送、报价、批量触达等动作须权限校验、审计日志与人工确认。
- 遵守渠道 opt-in、退订/拒收、消息窗口、模板与数据最小化要求。

## 7. 分阶段交付

### P0：基础客户经营
- 客户/联系人/线索/商机数据模型、RLS、去重与审计。
- 客户中心与客户详情时间线。
- 将现有社媒发现结果经人工审核转为 CRM 线索。
- 邮件沟通与客户档案关联。

### P1：Meta 连接与消息
- Meta OAuth/资产选择/权限状态。
- WhatsApp Cloud API、Messenger Webhooks 与消息收发。
- 统一消息中心、会话分配、人工接管与消息状态。
- Facebook Page 内容/互动能力按获批权限逐项启用。

### P2：AI 销售协作
- 多语言摘要、需求抽取、回复草稿、产品匹配与跟进建议。
- 人工审批、审计与质量评估。

### P3：外贸转化分析
- 报价、样品、订单阶段与复购。
- 渠道 ROI、国家/品类转化和销售漏斗。

## 8. 验收标准

- 组织间数据隔离通过 RLS 测试；无跨组织客户、消息或渠道资产泄露。
- 同一 Webhook 重放不会产生重复消息/事件。
- 授权撤销、Token 失效、Webhook 异常均有可见状态和恢复路径。
- 消息中心可区分 Facebook、WhatsApp、Messenger、邮件来源，并可关联客户档案。
- AI 输出仅作为建议；未确认前不会触发对外发送。
- 每条线索可追溯来源与采集时间；重复客户可合并且保留来源历史。
- UI 使用 Carbon 组件与现有 Design Tokens；以背景层级组织信息，以极少量边框辅助结构；不使用浏览器原生 select。
- Preview 构建、类型检查、design-system:check 通过后才提交验收；生产部署必须经过明确批准。

## 9. 配置与凭据

在「系统设置」中新增「社交渠道与 Meta」配置区。OAuth App ID 等非秘密配置可按需展示；App Secret、Access Token、Webhook Verify Token 必须通过服务端 Secret 管理。不得要求用户把凭据粘贴到普通聊天或前端表单中。
