import { useEffect, useState } from "react";
import { Button, Dropdown, InlineLoading, InlineNotification, Tile } from "@carbon/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { useAuth } from "./auth/AuthProvider";
import { ConfigurationPageTemplate } from "./design-system/patterns";
import { PageSection } from "./design-system/components";

type Provider = "facebook_pages" | "whatsapp_business" | "messenger";
type Asset = { id: string; name: string; asset_type: "facebook_page" | "whatsapp_business_account"; details?: Record<string, unknown> };
const labels: Record<Provider,string> = {
  facebook_pages: "Facebook Pages",
  whatsapp_business: "WhatsApp Business",
  messenger: "Messenger",
};
const paths: Record<Provider,string> = {
  facebook_pages: "/meta-channels/facebook",
  whatsapp_business: "/meta-channels/whatsapp",
  messenger: "/meta-channels/messenger",
};

export default function MetaChannelConnect() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const state = search.get("state") || "";
  const [organizationId,setOrganizationId] = useState("");
  const [provider,setProvider] = useState<Provider|null>(null);
  const [assets,setAssets] = useState<Asset[]>([]);
  const [selected,setSelected] = useState<Asset|null>(null);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!session?.user.id || !state) {
        setError(!state ? "授权状态参数缺失，请返回渠道页面重新发起连接。" : "请先登录企业工作区。");
        setLoading(false);
        return;
      }
      try {
        const { data: membership, error: membershipError } = await supabase.from("organization_members")
          .select("organization_id").eq("user_id",session.user.id).order("created_at",{ascending:true}).limit(1).maybeSingle();
        if (membershipError) throw membershipError;
        if (!membership?.organization_id) throw new Error("当前账号尚未加入企业工作区。");
        const orgId = membership.organization_id;
        const { data, error: invokeError } = await supabase.functions.invoke("meta-api", {
          body: { action:"list_oauth_assets", organization_id:orgId, state },
        });
        if (invokeError) throw invokeError;
        if (data?.error) throw new Error(data.error);
        if (!active) return;
        setOrganizationId(orgId);
        setProvider(data.provider as Provider);
        setAssets((data.assets || []) as Asset[]);
        setSelected((data.assets || [])[0] || null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "读取 Meta 企业资产失败。");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  },[session?.user.id,state]);

  const complete = async () => {
    if (!organizationId || !provider || !selected || busy) return;
    setBusy(true); setError("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("meta-api", {
        body: { action:"complete_connection", organization_id:organizationId, state, asset_id:selected.id },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      navigate(paths[provider],{replace:true});
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存渠道连接失败。");
      setBusy(false);
    }
  };

  const dropdownItems = assets.map(asset => ({ id:asset.id, text:asset.name }));
  const selectedItem = dropdownItems.find(item => item.id === selected?.id) || null;

  return (
    <ConfigurationPageTemplate
      className="module meta-channel-connect"
      title="选择授权企业资产"
      description="选择本次连接要绑定到当前 Kosmoevretis 组织的 Meta 企业资产。"
      eyebrow="META ASSET AUTHORIZATION"
      headingLevel={1}
    >
      <PageSection title="授权结果" description="只会保存你在 Meta 授权流程中明确授予的资产。" headingLevel={3}>
        {loading && <InlineLoading description="正在安全读取授权资产…" />}
        {error && <InlineNotification kind="error" lowContrast title="无法完成授权" subtitle={error} />}
        {!loading && provider && (
          <Tile className="meta-channel-connect__tile">
            <h3>{labels[provider]}</h3>
            {assets.length ? (
              <>
                <Dropdown
                  id="meta-authorized-asset"
                  titleText="选择企业资产"
                  label="选择一个已授权资产"
                  items={dropdownItems}
                  itemToString={item => item?.text || ""}
                  selectedItem={selectedItem}
                  onChange={({ selectedItem: item }) => setSelected(assets.find(asset => asset.id === item?.id) || null)}
                />
                <div className="meta-channel-connect__asset-note">
                  {selected?.asset_type === "facebook_page" ? "Facebook Page 将以 Page access token 连接。" : "WhatsApp Business Account 将以获授权的业务访问令牌连接。"}
                </div>
                <Button kind="primary" onClick={() => void complete()} disabled={!selected || busy}>
                  {busy ? "正在保存连接…" : "确认并连接此资产"}
                </Button>
              </>
            ) : (
              <InlineNotification kind="warning" lowContrast title="没有发现可连接资产" subtitle="当前 Meta 账号没有向应用授权可用的 Page 或 WhatsApp Business Account。请检查企业资产分配、应用权限及 Business Verification 后重新授权。" />
            )}
          </Tile>
        )}
        <InlineNotification kind="info" lowContrast title="安全提示" subtitle="访问令牌仅在服务端加密保存。浏览器不会接收或保存 Meta access token；完成连接后可在渠道页面查看连接状态。" />
        <Button kind="ghost" onClick={() => navigate("/meta-channels")}>返回 Meta 渠道管理</Button>
      </PageSection>
    </ConfigurationPageTemplate>
  );
}
