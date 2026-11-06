import { Accordion, AccordionItem, Button, InlineNotification, Tag, Tile } from "@carbon/react";
import { Chat, Connect, DataBase, Locked, Share, Phone, Launch, CheckmarkOutline, Time } from "@carbon/icons-react";
import { useSearchParams } from "react-router-dom";
import { ConfigurationPageTemplate } from "./design-system/patterns";
import { PageSection } from "./design-system/components";
import "./meta-channel-management.css";

const channels = [
  {
    id: "facebook",
    name: "Facebook Pages",
    purpose: "企业主页资产与公开互动情报",
    description: "为组织授权一个或多个 Facebook Page，后续可按获批权限读取主页资料、内容和互动信号。",
    capabilities: ["发现并选择获授权的 Page", "读取权限范围内的主页与内容数据", "将公开互动信号转为待跟进线索", "监控授权状态与资产归属"],
    permissions: "按实际功能评估 pages_show_list、pages_read_engagement 等权限；涉及管理、发布或 Webhook 的能力需单独评估对应权限。",
    icon: Share,
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    purpose: "企业号码与客户服务会话",
    description: "连接 WhatsApp Business Account 和企业电话号码，为后续客户主动咨询、会话管理和合规回复做好准备。",
    capabilities: ["发现 WABA 与企业电话号码", "接收客户主动发起的消息", "管理模板、会话窗口与发送状态", "记录 opt-in、退订和人工审批证据"],
    permissions: "根据所需功能评估 whatsapp_business_management、whatsapp_business_messaging 及资产发现所需权限。",
    icon: Phone,
  },
  {
    id: "messenger",
    name: "Messenger",
    purpose: "Facebook Page 私信与客户沟通",
    description: "将获授权 Page 的 Messenger 客户对话纳入统一工作区，后续用于需求识别、客户服务和人工审核回复。",
    capabilities: ["绑定启用 Messenger 的 Facebook Page", "接收授权范围内的 Page 私信", "按政策管理会话与消息状态", "关联 CRM 联系人、企业和商机"],
    permissions: "根据实际用途评估 pages_messaging、pages_show_list、pages_manage_metadata 等权限，并遵守 Meta 的消息窗口和平台政策。",
    icon: Chat,
  },
];

const preparationSteps = [
  { number: "01", title: "创建 Meta Developer App", detail: "在 Meta for Developers 创建应用，选择与实际业务匹配的应用类型，并关联企业 Business Portfolio（如适用）。", status: "可先准备" },
  { number: "02", title: "配置应用产品与基础信息", detail: "补齐应用名称、联系邮箱、隐私政策、服务条款、应用域名及 OAuth 登录产品配置。", status: "可先准备" },
  { number: "03", title: "完成企业验证与权限申请", detail: "根据目标渠道和实际功能提交 Business Verification、App Review 与所需权限；审核结果以 Meta 控制台为准。", status: "待 Meta 审核" },
  { number: "04", title: "配置回调并完成联调", detail: "将本平台提供的 OAuth Redirect URI、Webhook Callback URL 和 Verify Token 登记到 Meta App，再使用测试资产验证。", status: "待应用创建" },
];

function ChannelCard({ channel }: { channel: typeof channels[number] }) {
  const Icon = channel.icon;
  return (
    <Tile className="meta-channel-card">
      <div className="meta-channel-card__head">
        <span className="meta-channel-card__icon"><Icon size={24} /></span>
        <Tag type="cool-gray">待授权</Tag>
      </div>
      <div>
        <h3>{channel.name}</h3>
        <p className="meta-channel-card__purpose">{channel.purpose}</p>
        <p>{channel.description}</p>
      </div>
      <div className="meta-channel-card__capabilities">
        <strong>接入后可启用</strong>
        <ul>{channel.capabilities.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
      <div className="meta-channel-card__permission">
        <strong>权限申请参考</strong>
        <p>{channel.permissions}</p>
      </div>
      <Button kind="tertiary" size="md" href={`/meta-channels/${channel.id}`}>查看渠道准备</Button>
    </Tile>
  );
}

export default function MetaChannelManagement() {
  const [search] = useSearchParams();
  const metaError = search.get("meta_error");
  return (
    <ConfigurationPageTemplate
      className="module meta-channel-management"
      title="Meta 渠道管理"
      description="统一管理 Facebook Pages、WhatsApp Business 与 Messenger 的企业资产接入准备、授权状态和后续消息工作流。"
      eyebrow="META BUSINESS CHANNELS"
      headingLevel={1}
    >
      <PageSection title="当前接入阶段" description="Meta 应用尚未完成审核时，可以先完成平台侧配置和申请准备；审核通过前不会显示为已获批，也不会启动真实业务消息。 " headingLevel={3}>
        {metaError && <InlineNotification kind="error" lowContrast title="Meta 授权未完成" subtitle={metaError} />}
        <InlineNotification kind="warning" lowContrast hideCloseButton title="Meta API 权限尚未获批" subtitle="当前阶段以准备和配置为主。开发模式下可使用 Meta App 角色及测试资产进行有限联调；正式用户、生产权限和实际消息能力须以 Meta 审核与授权结果为准。" />
        <div className="meta-readiness-actions">
          <Button kind="primary" href="/settings/meta-apps">打开 Meta 应用配置</Button>
          <Button kind="tertiary" href="https://developers.facebook.com/apps/" renderIcon={Launch}>Meta Developer Console</Button>
        </div>
        <div className="meta-readiness-steps">
          {preparationSteps.map((step) => (
            <div className="meta-readiness-step" key={step.number}>
              <span className="meta-readiness-step__number">{step.number}</span>
              <div className="meta-readiness-step__body"><strong>{step.title}</strong><p>{step.detail}</p></div>
              <Tag type={step.status === "待 Meta 审核" ? "warm-gray" : "cool-gray"}>{step.status}</Tag>
            </div>
          ))}
        </div>
      </PageSection>
      <PageSection title="渠道接入准备" description="先确定未来要使用的 Meta 产品。每个渠道的权限申请、资产要求和政策约束不同。" headingLevel={3}>
        <div className="meta-channel-grid">{channels.map((channel) => <ChannelCard key={channel.id} channel={channel} />)}</div>
      </PageSection>
      <PageSection title="Meta App 审核准备清单" description="按实际功能申请最小权限，不要为了预留功能一次性申请全部权限。" headingLevel={3}>
        <div className="meta-review-checklist">
          <div><CheckmarkOutline size={20}/><div><strong>应用基础资料</strong><p>应用名称、类别、联系邮箱、应用图标、隐私政策 URL、服务条款 URL 和应用域名。</p></div></div>
          <div><CheckmarkOutline size={20}/><div><strong>数据使用说明</strong><p>说明收集哪些 Page、消息或业务资产数据，处理目的、保存期限、用户权利和删除流程。</p></div></div>
          <div><Time size={20}/><div><strong>权限与审核材料</strong><p>为每项权限准备真实使用场景、操作录屏、测试账号和可复现的审核步骤。具体材料以 Meta 控制台要求为准。</p></div></div>
          <div><Time size={20}/><div><strong>生产安全与合规</strong><p>准备组织隔离、令牌加密、Webhook 验签、事件幂等、审计记录、用户 opt-in 和人工发送审批流程。</p></div></div>
        </div>
        <Accordion>
          <AccordionItem title="建议的申请顺序">
            <ol>
              <li>先创建应用并补齐基础资料，完成平台侧 App ID、Secret 和回调配置。</li>
              <li>先用应用角色（管理员、开发者、测试者）和测试 Page / 测试号码完成开发模式联调。</li>
              <li>只针对第一阶段实际启用的渠道提交所需权限，不申请当前没有产品功能支撑的权限。</li>
              <li>按 Meta 要求提交权限用途说明、录屏和测试步骤，等待审核结果。</li>
              <li>审核通过后再启用正式客户授权，并重新执行组织隔离、Webhook 和消息合规验收。</li>
            </ol>
          </AccordionItem>
          <AccordionItem title="消息能力的上线边界">
            <ul>
              <li>WhatsApp 需管理 opt-in、模板审批、服务窗口、退订和发送资格。</li>
              <li>Messenger 需严格执行 Meta 消息窗口、允许用途及相关标签规则。</li>
              <li>AI 可以做摘要、分类、翻译和回复草稿；未经人工确认不得自动发送客户消息。</li>
              <li>Meta 权限获批不等于消息发送功能已经上线，仍需完成服务端发送、回执和审计能力。</li>
            </ul>
          </AccordionItem>
        </Accordion>
      </PageSection>
      <PageSection title="平台接入架构" description="各渠道共用组织隔离、凭证安全和事件接收基础设施。" headingLevel={3}>
        <div className="meta-architecture-grid">
          <div><Connect size={20}/><strong>企业资产授权</strong><p>由组织管理员发起授权，选择 Page、WABA 或电话号码，并绑定到当前组织。</p></div>
          <div><Locked size={20}/><strong>凭证与权限安全</strong><p>App Secret 和访问令牌仅在服务端加密保存，浏览器只读取非敏感元数据。</p></div>
          <div><DataBase size={20}/><strong>Webhook 与事件归档</strong><p>验证 Meta 签名、识别所属组织并执行事件幂等持久化。</p></div>
          <div><Chat size={20}/><strong>统一消息工作区</strong><p>后续将渠道会话关联 CRM，支持 AI 辅助和人工审批回复。</p></div>
        </div>
      </PageSection>
    </ConfigurationPageTemplate>
  );
}
