import { useMemo, useState } from "react";
import {
  Button, Dropdown, InlineNotification, Search, Tag, Tile
} from "@carbon/react";
import { Add, Chat, Email, LogoFacebook, LogoWhatsapp, SettingsAdjust } from "@carbon/icons-react";
import { ConfigurationPageTemplate } from "./design-system/patterns";
import { PageSection } from "./design-system/components";
import "./unified-message-center.css";

type ChannelId = "all" | "whatsapp" | "messenger" | "facebook" | "email";
const channels = [
  { id: "all", text: "全部渠道" },
  { id: "whatsapp", text: "WhatsApp" },
  { id: "messenger", text: "Messenger" },
  { id: "facebook", text: "Facebook" },
  { id: "email", text: "邮件" },
];
const channelDetails = [
  { id: "whatsapp", name: "WhatsApp Business", description: "通过 WhatsApp Business Platform 管理客户业务消息。", status: "待配置", detail: "需要 Business Account、Phone Number ID、访问令牌与 Webhook。" },
  { id: "messenger", name: "Messenger", description: "集中处理 Facebook Page 收到的客户私信。", status: "待配置", detail: "需要 Meta App、Facebook Page 授权与消息权限审核。" },
  { id: "facebook", name: "Facebook Page", description: "查看 Page 互动并将公开互动线索归档到客户。", status: "待配置", detail: "仅限已授权 Page 范围，不读取个人私密消息或任意群组内容。" },
  { id: "email", name: "邮件", description: "把客户邮件与企业、联系人和商机建立关联。", status: "现有邮件模块", detail: "邮件账户连接与发送策略在邮件设置中管理。" },
] as const;
const itemToString = (item: { id: string; text: string } | null) => item?.text || "";

export default function UnifiedMessageCenter() {
  const [channel, setChannel] = useState<ChannelId>("all");
  const [query, setQuery] = useState("");
  const [showPolicy, setShowPolicy] = useState(false);
  const visibleChannels = useMemo(
    () => channelDetails.filter((item) => channel === "all" || item.id === channel),
    [channel]
  );

  return (
    <ConfigurationPageTemplate
      className="module unified-message-center"
      title="统一消息中心"
      description="以客户为中心汇集 WhatsApp、Messenger、Facebook Page 与邮件沟通。渠道授权完成后，消息将与客户档案和销售商机关联。"
      eyebrow="GLOBAL CUSTOMER COMMUNICATION"
      headingLevel={1}
    >
      <PageSection title="渠道连接" description="先完成渠道授权与服务端密钥配置，再启用对应消息收发能力。" headingLevel={3}>
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="当前为接入准备阶段"
          subtitle="尚未连接 Meta 消息 API，也未启用真实消息收发。不会展示模拟会话或发送测试消息。"
        />
        <div className="umc-channel-grid">
          {channelDetails.map((item) => (
            <Tile key={item.id} className="umc-channel-tile">
              <div className="umc-channel-topline">
                <span className={"umc-channel-icon umc-channel-icon--" + item.id}>
                  {item.id === "whatsapp" ? <LogoWhatsapp size={22} /> :
                    item.id === "messenger" ? <Chat size={22} /> :
                    item.id === "facebook" ? <LogoFacebook size={22} /> : <Email size={22} />}
                </span>
                <Tag type={item.id === "email" ? "blue" : "cool-gray"}>{item.status}</Tag>
              </div>
              <h4>{item.name}</h4>
              <p>{item.description}</p>
              <span className="umc-channel-detail">{item.detail}</span>
              <Button kind="ghost" size="sm" renderIcon={SettingsAdjust} onClick={() => setShowPolicy(true)}>
                查看接入要求
              </Button>
            </Tile>
          ))}
        </div>
        {showPolicy && (
          <InlineNotification
            kind="warning"
            lowContrast
            title="渠道接入与安全要求"
            subtitle="OAuth 授权后由服务端保存 Token 与 App Secret；通过 Webhook 接收事件。WhatsApp 窗口外主动触达须使用获批模板并满足用户 opt-in。Messenger 按 Meta 消息窗口和平台政策执行。所有外发消息、报价及交期承诺均需人工确认。"
            onCloseButtonClick={() => setShowPolicy(false)}
          />
        )}
      </PageSection>
      <PageSection title="客户消息" description="按渠道筛选客户对话。连接渠道并完成 Webhook 配置后，这里才会出现真实会话。" headingLevel={3}>
        <div className="umc-toolbar">
          <Search size="lg" labelText="搜索会话" placeholder="搜索客户、联系人或消息内容" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Dropdown
            id="umc-channel-filter"
            titleText="消息渠道"
            label="全部渠道"
            items={channels}
            itemToString={itemToString}
            selectedItem={channels.find((item) => item.id === channel) || channels[0]}
            onChange={({ selectedItem }) => setChannel((selectedItem?.id || "all") as ChannelId)}
          />
          <Button kind="tertiary" renderIcon={Add} disabled>
            新建消息
          </Button>
        </div>
        <div className="umc-empty-state">
          <Chat size={32} />
          <strong>暂无已接入的客户会话</strong>
          <span>{query ? "当前没有匹配的会话。" : "完成渠道授权和 Webhook 接入后，客户消息会自动归档到这里。"}</span>
          <div className="umc-empty-tags">
            {visibleChannels.map((item) => <Tag key={item.id} type="cool-gray">{item.name}</Tag>)}
          </div>
        </div>
      </PageSection>
      <PageSection title="AI 销售协作与发送审批" description="AI 负责理解和准备，商务动作由人员把关。" headingLevel={3}>
        <div className="umc-approval-grid">
          <div><Tag type="green">AI 可自动</Tag><strong>理解与整理</strong><p>识别语言、提取采购需求、生成会话摘要、归档客户信息、建议跟进时间。</p></div>
          <div><Tag type="blue">AI 辅助</Tag><strong>回复草稿</strong><p>根据客户语境生成多语言回复草稿，展示引用依据与待确认字段。</p></div>
          <div><Tag type="red">人工确认</Tag><strong>对外商务动作</strong><p>发送消息、报价、价格折扣、库存与交期承诺，以及批量触达。</p></div>
        </div>
      </PageSection>
    </ConfigurationPageTemplate>
  );
}
