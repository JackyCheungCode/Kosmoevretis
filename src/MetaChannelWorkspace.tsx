import { Accordion, AccordionItem, Button, InlineNotification, Tag, Tile } from "@carbon/react";
import { ArrowLeft, Chat, Connect, DataBase, Locked, Phone, Share } from "@carbon/icons-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { InlineLoading } from "@carbon/react";
import { supabase } from "./lib/supabase";
import { useAuth } from "./auth/AuthProvider";
import { ConfigurationPageTemplate } from "./design-system/patterns";
import { PageSection } from "./design-system/components";
import "./meta-channel-workspace.css";

type MetaChannel = "facebook" | "whatsapp" | "messenger";

const definitions = {
  facebook: {
    name: "Facebook Pages",
    eyebrow: "FACEBOOK PAGE ASSETS",
    purpose: "企业主页资产、公开内容与互动线索",
    description: "连接组织拥有或获准管理的 Facebook Page，围绕主页内容、公开互动和潜在线索建立可审计的数据入口。",
    icon: Share,
    assetTitle: "Facebook Page",
    assets: ["管理员授权的 Page 列表", "Page ID、名称、头像与公开主页资料", "获授权范围内的帖子与互动指标"],
    permissions: ["pages_show_list：读取当前用户可管理的主页列表", "pages_read_engagement：读取获授权主页的内容与互动", "pages_manage_metadata：仅在确有 Webhook 订阅需求时申请", "发布、评论管理等权限需按实际功能单独申请并通过审核"],
    events: ["主页资料与授权状态变化", "帖子发布与公开互动信号", "评论或提及等获授权事件", "潜在线索归档并关联 CRM 联系人/企业"],
    policy: ["仅处理授权 Page 资产，不读取个人账号私密内容或私人群组", "不得将公开互动量直接等同于购买意向或真实销量", "任何后续自动回复或内容发布都需要单独的权限与人工审批流程"],
  },
  whatsapp: {
    name: "WhatsApp Business",
    eyebrow: "WHATSAPP BUSINESS PLATFORM",
    purpose: "企业号码、客户会话与合规业务消息",
    description: "通过官方 WhatsApp Business Platform 连接企业资产，将客户主动发起的会话纳入统一消息中心，并在政策允许的范围内处理回复。",
    icon: Phone,
    assetTitle: "WhatsApp Business Account",
    assets: ["Meta Business Portfolio 与 WhatsApp Business Account（WABA）", "Phone Number ID、显示号码与号码质量状态", "Webhook 订阅、消息模板与业务展示名称"],
    permissions: ["whatsapp_business_management：管理获授权的 WABA 资产与模板", "whatsapp_business_messaging：在获准范围内收发业务消息", "business_management：仅在资产发现/选择确有需要时申请"],
    events: ["客户入站消息与会话更新", "消息发送、送达、已读或失败状态", "模板审核状态与质量信号", "号码状态与授权有效期变化"],
    policy: ["保存用户 opt-in 证据、来源、时间和用途", "服务窗口外主动联系必须使用已获批模板", "发送前重新校验号码、模板、服务窗口、用户退订和组织审批状态", "禁止未经同意的批量营销与自动化冷启动外联"],
  },
  messenger: {
    name: "Messenger",
    eyebrow: "MESSENGER PAGE MESSAGING",
    purpose: "Facebook Page 私信与客户服务对话",
    description: "将获授权 Facebook Page 的 Messenger 对话集中到统一消息工作区，支持客户服务、需求识别和人工审核后的回复。",
    icon: Chat,
    assetTitle: "Facebook Page + Messenger",
    assets: ["已授权且启用 Messenger 的 Facebook Page", "Page ID 与消息 Webhook 订阅", "应用权限审核状态和允许用途配置"],
    permissions: ["pages_show_list：发现可授权的 Page", "pages_messaging：在适用场景下处理 Page 私信", "pages_manage_metadata：订阅 Page Webhook 时按需申请"],
    events: ["Page 范围内客户入站私信", "会话参与者与消息附件元数据", "消息发送状态与 Webhook 事件", "对话摘要、客户需求与 CRM 关联"],
    policy: ["只访问 Page 授权的对话，不访问个人 Messenger 收件箱", "严格执行 Meta 消息窗口、允许用途及标签规则", "窗口外联系仅限平台明确允许的场景与方式", "AI 可以摘要和起草，但外发必须经过人员确认"],
  },
} satisfies Record<MetaChannel, {
  name: string; eyebrow: string; purpose: string; description: string; icon: typeof Share;
  assetTitle: string; assets: string[]; permissions: string[]; events: string[]; policy: string[];
}>;

export default function MetaChannelWorkspace({ channel }: { channel: MetaChannel }) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [organizationId, setOrganizationId] = useState("");
  const [connections, setConnections] = useState<Array<{id:string;provider:MetaChannel;display_name:string;status:string;external_asset_id:string}>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const config = definitions[channel];

  const loadConnections = async (orgId: string) => {
    const { data, error: invokeError } = await supabase.functions.invoke("meta-api", {
      body: { action: "list_connections", organization_id: orgId },
    });
    if (invokeError) throw invokeError;
    if (data?.error) throw new Error(data.error);
    setConnections((data?.connections || []).filter((item: {provider:string}) => item.provider === channel));
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!session?.user.id) { setLoading(false); return; }
      try {
        const { data: membership, error: membershipError } = await supabase.from("organization_members")
          .select("organization_id").eq("user_id", session.user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
        if (membershipError) throw membershipError;
        if (!membership?.organization_id) throw new Error("当前账号尚未加入企业工作区。");
        if (!active) return;
        setOrganizationId(membership.organization_id);
        await loadConnections(membership.organization_id);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "无法读取渠道连接。");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [session?.user.id]);

  const startOAuth = async () => {
    if (!organizationId || busy) return;
    setBusy(true); setError("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("meta-api", {
        body: { action: "start_oauth", organization_id: organizationId, provider: channel },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      if (!data?.authorization_url) throw new Error("服务端没有返回 Meta 授权地址。");
      window.location.assign(data.authorization_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法启动 Meta 授权。");
      setBusy(false);
    }
  };
  const Icon = config.icon;
  return (
    <ConfigurationPageTemplate
      className="module meta-channel-workspace"
      title={config.name}
      description={config.description}
      eyebrow={config.eyebrow}
      headingLevel={1}
    >
      <div className="meta-channel-workspace__back">
        <Button kind="ghost" size="md" renderIcon={ArrowLeft} onClick={() => navigate("/meta-channels")}>返回 Meta 渠道管理</Button>
        <Tag type="cool-gray">尚未连接</Tag>
      </div>
      <PageSection title="渠道状态" description={config.purpose} headingLevel={3}>
        {error && <InlineNotification kind="error" lowContrast title="渠道连接操作失败" subtitle={error} />}
        <div className="meta-channel-workspace__connection-actions">
          <Button kind="primary" size="md" onClick={() => void startOAuth()} disabled={!organizationId || busy}>
            {busy ? "正在准备授权…" : "连接 Meta 企业资产"}
          </Button>
          <Button kind="ghost" size="md" onClick={() => organizationId && void loadConnections(organizationId).catch(err => setError(err.message))} disabled={!organizationId || loading}>
            刷新连接
          </Button>
          {loading && <InlineLoading description="正在读取当前组织的连接…" />}
        </div>
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="真实授权尚未启用"
          subtitle="当前环境尚未配置 Meta App ID、App Secret、回调地址和加密密钥。此页面展示的是接入配置与能力范围，不代表已经连接任何企业资产。"
        />
        <div className="meta-channel-workspace__connected-list">
          <h3>已授权企业资产</h3>
          {connections.length ? connections.map(item => (
            <div className="meta-channel-workspace__connected-row" key={item.id}>
              <div><strong>{item.display_name}</strong><small>{item.external_asset_id}</small></div>
              <Tag type={item.status === "connected" ? "green" : "cool-gray"}>{item.status === "connected" ? "已连接" : item.status}</Tag>
              <Button kind="ghost" size="sm" onClick={async () => {
                if (!organizationId) return;
                const { data, error: invokeError } = await supabase.functions.invoke("meta-api", {
                  body: { action: "disconnect_connection", organization_id: organizationId, connection_id: item.id },
                });
                if (invokeError || data?.error) { setError(data?.error || invokeError?.message || "断开连接失败"); return; }
                await loadConnections(organizationId);
              }}>断开连接</Button>
            </div>
          )) : <p className="meta-channel-workspace__empty">当前组织尚未连接此渠道的企业资产。</p>}
        </div>
        <div className="meta-channel-workspace__summary">
          <Tile className="meta-channel-workspace__metric-tile"><Icon size={24}/><span>渠道资产</span><strong>{config.assetTitle}</strong><small>等待管理员授权并选择资产</small></Tile>
          <Tile className="meta-channel-workspace__metric-tile"><Connect size={24}/><span>OAuth 授权</span><strong>待配置</strong><small>服务端回调与单次 state 校验</small></Tile>
          <Tile className="meta-channel-workspace__metric-tile"><DataBase size={24}/><span>事件同步</span><strong>待配置</strong><small>Webhook 签名校验与幂等入库</small></Tile>
          <Tile className="meta-channel-workspace__metric-tile"><Locked size={24}/><span>凭证安全</span><strong>服务端加密</strong><small>密钥不进入浏览器或客户端存储</small></Tile>
        </div>
      </PageSection>
      <PageSection title="企业资产与授权范围" description="连接前明确需要授权的资产及最小权限集合。" headingLevel={3}>
        <div className="meta-channel-workspace__columns">
          <Tile>
            <h3>需要选择的资产</h3>
            <ul>{config.assets.map(item => <li key={item}>{item}</li>)}</ul>
          </Tile>
          <Tile>
            <h3>权限申请建议</h3>
            <ul>{config.permissions.map(item => <li key={item}>{item}</li>)}</ul>
          </Tile>
        </div>
      </PageSection>
      <PageSection title="数据与业务能力" description="授权后进入统一 CRM 与消息中心的数据处理范围。" headingLevel={3}>
        <div className="meta-channel-workspace__columns">
          <Tile className="meta-channel-workspace__detail-tile"><h3>计划接收与同步</h3><ul>{config.events.map(item => <li key={item}>{item}</li>)}</ul></Tile>
          <Tile className="meta-channel-workspace__detail-tile"><h3>平台政策与发送约束</h3><ul>{config.policy.map(item => <li key={item}>{item}</li>)}</ul></Tile>
        </div>
      </PageSection>
      <PageSection title="上线前检查" description="所有检查通过后才开放真实连接入口。" headingLevel={3}>
        <Accordion>
          <AccordionItem title="应用与资产准备">
            <ul>
              <li>确认 Meta Developer App 所属企业及管理员。</li>
              <li>完成 Business Verification 和当前功能所需的 App Review。</li>
              <li>核对 OAuth Redirect URI、产品开通状态及最小权限范围。</li>
            </ul>
          </AccordionItem>
          <AccordionItem title="安全与数据隔离">
            <ul>
              <li>OAuth state 必须单次使用、短时有效，并绑定组织和发起用户。</li>
              <li>Token 使用 AES-GCM 服务端加密保存，禁止写入前端或日志。</li>
              <li>Webhook 必须验证 HMAC 签名，事件先幂等持久化再异步处理。</li>
              <li>所有连接、会话和消息都必须执行组织级权限校验与 RLS。</li>
            </ul>
          </AccordionItem>
          <AccordionItem title="消息发送与审计">
            <ul>
              <li>AI 仅生成分类、摘要、翻译和回复草稿。</li>
              <li>发送前重新检查权限、窗口、收件人资格和审批状态。</li>
              <li>保存审批人、发送尝试、平台消息 ID 与最终状态。</li>
            </ul>
          </AccordionItem>
        </Accordion>
      </PageSection>
    </ConfigurationPageTemplate>
  );
}
