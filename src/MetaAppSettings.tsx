import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Dropdown, InlineNotification, PasswordInput, Tag, TextInput, Tile } from "@carbon/react";
import { supabase } from "./lib/supabase";
import "./meta-app-settings.css";

type Membership = { organization_id: string; role: string; organizations?: { name?: string } | null };
type Config = { app_id: string; graph_api_version: string; enabled: boolean; validation_status: string; validation_message?: string | null; last_validated_at?: string | null; has_app_secret: boolean; has_webhook_verify_token: boolean };
type MetaResponse = { config: Config | null; oauth_redirect_uri: string; webhook_url: string };

export default function MetaAppSettings() {
  const [memberships,setMemberships]=useState<Membership[]>([]);
  const [organizationId,setOrganizationId]=useState("");
  const [role,setRole]=useState("");
  const [config,setConfig]=useState<Config|null>(null);
  const [appId,setAppId]=useState("");
  const [appSecret,setAppSecret]=useState("");
  const [verifyToken,setVerifyToken]=useState("");
  const [graphVersion,setGraphVersion]=useState("");
  const [redirectUri,setRedirectUri]=useState("");
  const [webhookUrl,setWebhookUrl]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [testing,setTesting]=useState(false);
  const [notice,setNotice]=useState<{kind:"success"|"error"|"info";title:string;message:string}|null>(null);
  const canManage=useMemo(()=>["owner","admin"].includes(role.toLowerCase()),[role]);

  const loadMemberships=useCallback(async()=>{
    setLoading(true);
    const {data:userData,error:userError}=await supabase.auth.getUser();
    if(userError||!userData.user){setNotice({kind:"error",title:"无法读取登录用户",message:userError?.message||"请重新登录"});setLoading(false);return;}
    const {data,error}=await supabase.from("organization_members").select("organization_id,role,organizations(name)").eq("user_id",userData.user.id).order("created_at");
    if(error){setNotice({kind:"error",title:"组织列表读取失败",message:error.message});setLoading(false);return;}
    const rows=(data||[]) as unknown as Membership[];
    setMemberships(rows);
    if(rows.length){setOrganizationId(current=>current&&rows.some(x=>x.organization_id===current)?current:rows[0].organization_id);setRole(rows[0].role);}
    setLoading(false);
  },[]);

  const loadConfig=useCallback(async(id:string)=>{
    if(!id)return;
    setLoading(true);
    const {data,error}=await supabase.functions.invoke("meta-api",{body:{action:"config_get",organization_id:id}});
    if(error){setNotice({kind:"error",title:"Meta 配置读取失败",message:error.message});setLoading(false);return;}
    const result=data as MetaResponse;
    setConfig(result.config);
    setAppId(result.config?.app_id||"");
    setGraphVersion(result.config?.graph_api_version||"");
    setRedirectUri(result.oauth_redirect_uri||"");
    setWebhookUrl(result.webhook_url||"");
    setAppSecret("");setVerifyToken("");
    setRole(memberships.find(x=>x.organization_id===id)?.role||"");
    setLoading(false);
  },[memberships]);

  useEffect(()=>{void loadMemberships();},[loadMemberships]);
  useEffect(()=>{if(organizationId)void loadConfig(organizationId);},[organizationId,loadConfig]);

  const save=async()=>{
    if(!organizationId||!canManage)return;
    setSaving(true);setNotice(null);
    const {data,error}=await supabase.functions.invoke("meta-api",{body:{action:"config_save",organization_id:organizationId,app_id:appId,app_secret:appSecret,webhook_verify_token:verifyToken,graph_api_version:graphVersion}});
    setSaving(false);
    if(error||data?.error){setNotice({kind:"error",title:"保存失败",message:error?.message||data.error});return;}
    setAppSecret("");setVerifyToken("");
    setNotice({kind:"success",title:"组织 Meta App 配置已加密保存",message:"App Secret 与 Webhook Verify Token 仅保存在服务端加密字段中，前端不会再次读取明文。"});
    await loadConfig(organizationId);
  };
  const test=async()=>{
    if(!organizationId||!canManage)return;
    setTesting(true);setNotice(null);
    const {data,error}=await supabase.functions.invoke("meta-api",{body:{action:"config_test",organization_id:organizationId}});
    setTesting(false);
    if(error||data?.error){setNotice({kind:"error",title:"验证请求失败",message:error?.message||data.error});return;}
    setNotice({kind:data.valid?"success":"error",title:data.valid?"Meta App 验证成功":"Meta App 验证未通过",message:data.message||""});
    await loadConfig(organizationId);
  };

  const copy=async(value:string)=>{try{if(!navigator.clipboard)throw new Error("Clipboard unavailable");await navigator.clipboard.writeText(value);setNotice({kind:"success",title:"已复制",message:"回调地址已复制到剪贴板"});}catch{setNotice({kind:"info",title:"无法自动复制",message:"请手动选择并复制地址"});}};
  if(loading&&!memberships.length)return <Tile><p>正在读取组织与 Meta 配置…</p></Tile>;
  if(!memberships.length)return <InlineNotification kind="warning" lowContrast title="当前账号未加入组织" subtitle="请先加入一个组织，再配置该组织的 Meta Developer App。" hideCloseButton/>;
  return <div className="meta-app-settings">
    <InlineNotification kind="warning" lowContrast hideCloseButton title="Meta 审核尚未完成也可以先准备" subtitle="可以先创建 Meta Developer App、填写基础资料、保存应用凭证并登记回调地址。应用审核、Business Verification 和权限 Advanced Access 由 Meta 控制台决定；本页面不会将待审核状态误标为已获批。开发阶段可先用 App 角色和测试资产验证基础流程。"/>
    <section className="settings-catalog-group">
      <div className="settings-catalog-group-heading"><div><h4>组织 Meta 应用</h4><p>每个组织使用自己的 Meta Developer App；凭证加密保存在服务端，并与其他组织隔离。</p></div></div>
      <div className="settings-form-grid">
        <Dropdown id="meta-org" titleText="配置所属组织" label="选择组织" items={memberships.map(m=>({id:m.organization_id,text:m.organizations?.name||m.organization_id}))} itemToString={item=>item?.text||""} selectedItem={memberships.map(m=>({id:m.organization_id,text:m.organizations?.name||m.organization_id})).find(item=>item.id===organizationId)||null} onChange={({selectedItem})=>{if(selectedItem)setOrganizationId(selectedItem.id);}}/>
        <div className="meta-app-role"><span>当前组织角色</span><Tag type={canManage?"green":"gray"}>{role||"成员"}</Tag></div>
      </div>
      {!canManage&&<InlineNotification kind="warning" lowContrast title="需要组织管理员权限" subtitle="只有该组织的 Owner 或 Admin 可以查看和修改 Meta 应用配置。" hideCloseButton/>}
      <div className="settings-form-grid">
        <TextInput id="meta-app-id" labelText="Meta App ID" value={appId} onChange={e=>setAppId(e.target.value)} disabled={!canManage} placeholder="输入当前组织的 App ID"/>
        <TextInput id="meta-graph-version" labelText="Graph API 版本" value={graphVersion} onChange={e=>setGraphVersion(e.target.value)} disabled={!canManage} placeholder="例如 vNN.N（填写 Meta 当前支持版本）"/>
        <PasswordInput id="meta-app-secret" labelText="Meta App Secret" value={appSecret} onChange={e=>setAppSecret(e.target.value)} disabled={!canManage} placeholder={config?.has_app_secret?"已保存；留空表示保持原值":"输入 App Secret"}/>
        <PasswordInput id="meta-webhook-token" labelText="Webhook Verify Token" value={verifyToken} onChange={e=>setVerifyToken(e.target.value)} disabled={!canManage} placeholder={config?.has_webhook_verify_token?"已保存；留空表示保持原值":"设置自定义 Verify Token"}/>
      </div>
      <div className="settings-actions">
        <Button kind="primary" onClick={()=>void save()} disabled={!canManage||saving||!appId.trim()||!graphVersion.trim()}>{saving?"正在加密保存…":"保存组织配置"}</Button>
        <Button kind="tertiary" onClick={()=>void test()} disabled={!canManage||testing||!config}>{testing?"正在验证…":"测试 Meta App 凭证"}</Button>
        {config&&<Tag type={config.validation_status==="valid"?"green":config.validation_status==="invalid"?"red":"gray"}>{config.validation_status==="valid"?"验证通过":config.validation_status==="invalid"?"验证失败":"尚未验证"}</Tag>}
      </div>
      {config?.validation_message&&<p className="settings-helper-text">{config.validation_message}</p>}
    </section>
    <section className="settings-catalog-group">
      <div className="settings-catalog-group-heading"><div><h4>Meta 平台回调地址</h4><p>请将以下地址登记到当前组织自己的 Meta App 设置中。所有组织共用平台回调端点，但凭证和验签按组织区分。</p></div></div>
      <div className="meta-app-endpoint"><TextInput id="meta-oauth-uri" labelText="OAuth Redirect URI" value={redirectUri} readOnly/><Button kind="ghost" onClick={()=>copy(redirectUri)}>复制</Button></div>
      <div className="meta-app-endpoint"><TextInput id="meta-webhook-uri" labelText="Webhook Callback URL" value={webhookUrl} readOnly/><Button kind="ghost" onClick={()=>copy(webhookUrl)}>复制</Button></div>
    </section>
    <section className="settings-catalog-group">
      <div className="settings-catalog-group-heading"><div><h4>Meta 应用申请准备</h4><p>以下项目可在等待审核前完成；具体审核材料和状态以 Meta Developer Console 为准。</p></div></div>
      <div className="meta-app-preparation-grid">
        <div><strong>应用基础资料</strong><p>应用名称、类别、联系邮箱、应用图标、隐私政策、服务条款和应用域名。</p><Tag type="cool-gray">可先准备</Tag></div>
        <div><strong>企业验证</strong><p>按业务需要关联 Business Portfolio，准备企业主体资料和验证材料。</p><Tag type="warm-gray">待 Meta 验证</Tag></div>
        <div><strong>权限申请</strong><p>仅申请当前已实现功能实际需要的 Page、Messenger 或 WhatsApp 权限。</p><Tag type="warm-gray">待提交审核</Tag></div>
        <div><strong>测试资产</strong><p>配置 App 角色、测试 Page / 测试号码和可复现的开发模式测试流程。</p><Tag type="cool-gray">可先准备</Tag></div>
      </div>
      <div className="meta-app-official-links"><Button kind="ghost" href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer">打开 Meta Developer Console</Button><Button kind="ghost" href="https://developers.facebook.com/docs/permissions/" target="_blank" rel="noreferrer">查看权限说明</Button></div>
    </section>
    <InlineNotification kind="info" lowContrast title="密钥安全说明" subtitle="App Secret 和 Verify Token 仅在提交时发送至受保护的 Edge Function，并使用 SETTINGS_ENCRYPTION_KEY 做 AES-GCM 加密。读取配置时只返回是否已保存，不返回密钥明文或密文。" hideCloseButton/>
    {notice&&<InlineNotification kind={notice.kind} lowContrast title={notice.title} subtitle={notice.message} onCloseButtonClick={()=>setNotice(null)}/>}
  </div>;
}
