import { Accordion, AccordionItem, InlineNotification, Tag, Tile } from "@carbon/react";
import { Chat, Connect, DataBase, Security, Share, Phone } from "@carbon/icons-react";
import { ConfigurationPageTemplate } from "./design-system/patterns";
import { PageSection } from "./design-system/components";
import "./meta-channel-management.css";

const channels = [
  {
    id: "facebook",
    name: "Facebook Pages",
    purpose: "主页资产与公开互动发现",
    description: "连接组织拥有或获准管理的 Facebook Page，读取授权范围内的主页资料、帖子及互动信号。",
    capabilities: ["授权主页列表与资产选择", "主页资料和公开内容读取", "帖子互动与潜在线索归档", "主页权限与授权有效期监控"],
    permissions: "按实际功能申请 pages_show_list、pages_read_engagement 等必要权限；发布或管理能力需另行申请对应权限并通过审核。",
    icon: Share,
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    purpose: "企业客户会话与业务消息",
    description: "通过官方 WhatsApp Business Platform 连接企业账号和电话号码，接收客户消息并在合规条件下回复。",
    capabilities: ["WhatsApp Business Account 与号码管理", "联系人、会话和消息同步", "模板消息与发送状态管理", "用户 opt-in 与服务窗口校验"],
    permissions: "需要 Meta Business 资产、WhatsApp Business Account、Phone Number ID、访问令牌及获准的消息权限。",
    icon: Phone,
  },
  {
    id: "messenger",
    name: "Messenger",
    purpose: "Facebook Page 客户私信",
    description: "连接获授权的 Facebook Page，集中接收和处理 Page 范围内的 Messenger 客户对话。",
    capabilities: ["Page 绑定与消息权限管理", "客户私信接收和会话同步", "文本及支持的附件消息", "消息窗口与允许用途校验"],
    permissions: "需要 Meta App、Facebook Page 授权及 pages_messaging 等适用权限；须遵循 Meta 消息窗口和平台政策。",
    icon: Chat,
  },
];

function ChannelCard({ channel }: { channel: typeof channels[number] }) {
  const Icon = channel.icon;
  return (
    <Tile className="meta-channel-card">
      <div className="meta-channel-card__head">
        <span className="meta-channel-card__icon"><Icon size={24} /></span>
        <Tag type="cool-gray">尚未连接</Tag>
      </div>
      <div>
        <h3>{channel.name}</h3>
        <p className="meta-channel-card__purpose">{channel.purpose}</p>
        <p>{channel.description}</p>
      </div>
      <div className="meta-channel-card__capabilities">
        <strong>规划接入能力</strong>
        <ul>{channel.capabilities.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
      <div className="meta-channel-card__permission">
        <strong>授权与权限要求</strong>
        <p>{channel.permissions}</p>
      </div>
    </Tile>
  );
}

export default function MetaChannelManagement() {
  return (
    <ConfigurationPageTemplate
      className="module meta-channel-management"
      title="Meta 渠道管理"
      description="统一规划和管理 Facebook Pages、WhatsApp Business 与 Messenger 的企业资产授权、消息能力和运行安全。"
      eyebrow="META BUSINESS CHANNELS"
      headingLevel={1}
    >
      <PageSection title="连接概览" description="所有连接均属于当前组织。完成 Meta App 配置和服务端授权能力后，才能启用真实数据同步与消息收发。" headingLevel={3}>
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="当前处于接入建设阶段"
          subtitle="本页面是管理界面第一阶段交付。尚未配置 Meta App 凭证、OAuth 回调或 Webhook；因此不显示虚构的连接状态，也不会尝试发送消息。"
        />
        <div className="meta-channel-summary">
          <div><span>渠道</span><strong>3</strong><small>Facebook · WhatsApp · Messenger</small></div>
          <div><span>真实连接</span><strong>0</strong><small>等待完成服务端授权</small></div>
          <div><span>统一消息</span><strong>待接入</strong><small>复用现有统一消息中心</small></div>
        </div>
        <div className="meta-channel-grid">{channels.map((channel) => <ChannelCard key={channel.id} channel={channel} />)}</div>
      </PageSection>
      <PageSection title="统一接入架构" description="三种渠道共享授权、安全、事件处理和 CRM 关联基础设施。" headingLevel={3}>
        <div className="meta-architecture-grid">
          <div><Connect size={20}/><strong>企业资产授权</strong><p>管理员发起授权，选择 Page、WhatsApp Business Account 或电话号码，并将资产绑定到当前组织。</p></div>
          <div><Security size={20}/><strong>凭证与权限安全</strong><p>Token 和 App Secret 仅保存在服务端加密存储；浏览器只读取非敏感连接元数据。</p></div>
          <div><DataBase size={20}/><strong>Webhook 与数据归档</strong><p>校验 Meta 签名、事件幂等入库，再将会话、消息和客户线索关联到 CRM。</p></div>
          <div><Chat size={20}/><strong>统一消息工作区</strong><p>真实会话进入统一消息中心，按渠道筛选，并支持 AI 草稿与人工审批发送。</p></div>
        </div>
      </PageSection>
      <PageSection title="接入前置检查" description="完成以下基础配置后，才进入 OAuth 和真实 API 联调。" headingLevel={3}>
        <Accordion>
          <AccordionItem title="Meta Developer App 与企业资产">
            <ul>
              <li>创建或指定 Meta Developer App，并关联企业 Business Portfolio。</li>
              <li>配置 Facebook Login / Business Login 及所需产品。</li>
              <li>准备 App ID、App Secret 和 OAuth 回调域名；密钥仅通过服务端环境变量配置。</li>
              <li>按实际产品能力申请最小权限，并完成必要的 App Review / Business Verification。</li>
            </ul>
          </AccordionItem>
          <AccordionItem title="Webhook 与生产安全">
            <ul>
              <li>配置 HTTPS Webhook URL 与独立 Verify Token。</li>
              <li>使用 App Secret 验证 X-Hub-Signature-256，拒绝无效签名。</li>
              <li>对事件建立幂等键、重试机制和失败隔离。</li>
              <li>组织隔离、权限检查、审计日志和密钥轮换必须通过验收。</li>
            </ul>
          </AccordionItem>
          <AccordionItem title="消息合规与人工审批">
            <ul>
              <li>WhatsApp 记录用户 opt-in；服务窗口外使用获批模板。</li>
              <li>Messenger 严格执行允许的消息窗口和使用场景。</li>
              <li>AI 只负责分类、摘要、翻译和回复草稿；外发消息须由人员确认。</li>
              <li>报价、折扣、库存和交期承诺不得由 AI 自动发送。</li>
            </ul>
          </AccordionItem>
        </Accordion>
      </PageSection>
    </ConfigurationPageTemplate>
  );
}
