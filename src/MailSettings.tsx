import React, { useCallback, useEffect, useState } from "react";
import { Button, InlineNotification, PasswordInput, Select, SelectItem, Tag, TextInput, Tile } from "@carbon/react";
import { Add, Building, Email, TrashCan } from "@carbon/icons-react";
import { supabase } from "./lib/supabase";
import "./mail-settings.css";

const ORGANIZATION_ID = "d6dd93fe-75ac-4c2f-90a3-53474acdef8f";
type MailAccount = {
  id: string; provider_key: string; email_address: string; display_name: string; status: string;
  is_default: boolean; sync_window_days: number; last_sync_at: string | null;
};
const initialForm = {
  email_address: "", display_name: "", username: "", password: "",
  imap_host: "", imap_port: "993", imap_tls: true,
  smtp_host: "", smtp_port: "465", smtp_tls_mode: "tls", sync_window_days: "30",
};

export default function MailSettings() {
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [form, setForm] = useState(initialForm);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{kind:"success"|"error"|"info";title:string;message:string}|null>(null);

  const invoke = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("mail-api", {
      body: { action, organization_id: ORGANIZATION_ID, ...payload },
    });
    if (error) throw new Error(error.message || "邮件设置服务请求失败");
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoke("list_accounts");
      setAccounts(data.accounts || []);
    } catch (error) {
      setNotice({kind:"error",title:"读取邮箱账户失败",message:error instanceof Error ? error.message : "未知错误"});
    } finally { setLoading(false); }
  }, [invoke]);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);

  const updateForm = (key: keyof typeof initialForm, value: string | boolean) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const saveAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setNotice(null);
    try {
      await invoke("save_imap_smtp_account", { account: form });
      setNotice({kind:"success",title:"邮箱配置已保存",message:"服务器参数和加密凭证已保存。当前账户状态为待连接验证，邮件同步与收发尚未启用。"});
      setForm(initialForm); setFormOpen(false);
      await loadAccounts();
    } catch (error) {
      setNotice({kind:"error",title:"保存邮箱配置失败",message:error instanceof Error ? error.message : "未知错误"});
    } finally { setSaving(false); }
  };

  const accountAction = async (id: string, action: string, payload: Record<string, unknown> = {}) => {
    setBusyId(id); setNotice(null);
    try {
      await invoke(action, {account_id:id,...payload});
      await loadAccounts();
      setNotice({kind:"success",title:"设置已更新",message:"邮箱账户设置已保存。"});
    } catch (error) {
      setNotice({kind:"error",title:"操作失败",message:error instanceof Error ? error.message : "未知错误"});
    } finally { setBusyId(null); }
  };

  return <div className="mail-settings-page">
    <InlineNotification kind="info" lowContrast hideCloseButton title="邮箱配置统一由系统设置管理" subtitle="每位用户可以绑定多个邮箱账户。邮箱凭证由后端加密保存；邮件发送仍需用户确认。" />
    {notice && <InlineNotification kind={notice.kind} lowContrast title={notice.title} subtitle={notice.message} onCloseButtonClick={()=>setNotice(null)} />}
    <section className="settings-catalog-group">
      <div className="settings-catalog-group-heading"><div><h4>已绑定邮箱账户</h4><p>账户配置属于当前登录用户；不同用户的邮箱内容相互隔离。</p></div><Button kind="ghost" size="sm" renderIcon={Add} onClick={()=>setFormOpen(open=>!open)}>添加企业邮箱</Button></div>
      {loading ? <p>正在读取邮箱账户…</p> : accounts.length === 0 ? <p className="settings-catalog-description">尚未绑定邮箱。可以先配置企业自定义域名邮箱；Gmail 和 Outlook OAuth 接入待完成应用授权配置。</p> :
        <div className="settings-catalog-items">{accounts.map(account=><Tile key={account.id} className="settings-catalog-item">
          <div className="settings-catalog-item-head"><div className="settings-catalog-identity">{account.provider_key==="imap_smtp"?<Building size={24}/>:<Email size={24}/>}<div className="settings-catalog-name"><strong>{account.email_address}</strong><span>{account.display_name || account.provider_key}</span></div></div><Tag type={account.status==="connected"?"green":"gray"}>{account.status==="connected"?"已连接":account.status==="error"?"连接异常":"待连接验证"}</Tag></div>
          <div className="mail-account-settings-row"><span>同步范围</span><Select id={"sync-window-"+account.id} labelText="近期邮件" hideLabel size="sm" value={String(account.sync_window_days)} disabled={busyId===account.id} onChange={event=>void accountAction(account.id,"update_sync_window",{sync_window_days:Number(event.target.value)})}><SelectItem value="7" text="最近 7 天"/><SelectItem value="30" text="最近 30 天"/><SelectItem value="90" text="最近 90 天"/></Select></div>
          <div className="settings-catalog-actions">{account.is_default?<Tag type="blue">默认发件账户</Tag>:<Button kind="ghost" size="sm" disabled={busyId===account.id} onClick={()=>void accountAction(account.id,"set_default_account")}>设为默认</Button>}<Button kind="danger--tertiary" size="sm" renderIcon={TrashCan} disabled={busyId===account.id} onClick={()=>void accountAction(account.id,"remove_account")}>移除</Button></div>
        </Tile>)}</div>}
    </section>
    <section className="settings-catalog-group">
      <div className="settings-catalog-group-heading"><div><h4>主流邮箱平台</h4><p>通过官方 OAuth 授权接入，不需要用户向 Kosmoevretis 提供邮箱密码。</p></div></div>
      <div className="settings-catalog-items">
        <Tile className="settings-catalog-item"><div className="settings-catalog-item-head"><div className="settings-catalog-identity"><Email size={24}/><div className="settings-catalog-name"><strong>Gmail / Google Workspace</strong><span>Google OAuth 2.0 + Gmail API</span></div></div><Tag type="gray">OAuth 待配置</Tag></div><div className="settings-catalog-actions"><Button kind="secondary" disabled>连接 Gmail</Button></div></Tile>
        <Tile className="settings-catalog-item"><div className="settings-catalog-item-head"><div className="settings-catalog-identity"><Building size={24}/><div className="settings-catalog-name"><strong>Outlook / Microsoft 365</strong><span>Microsoft OAuth 2.0 + Graph API</span></div></div><Tag type="gray">OAuth 待配置</Tag></div><div className="settings-catalog-actions"><Button kind="secondary" disabled>连接 Outlook</Button></div></Tile>
      </div>
    </section>
    {formOpen && <section className="settings-catalog-group">
      <div className="settings-catalog-group-heading"><div><h4>添加企业自定义域名邮箱</h4><p>支持 IMAP 收件和 SMTP 发件配置。密码只发送到受认证的后端，并以 AES-GCM 加密保存。</p></div></div>
      <form className="mail-account-form" onSubmit={saveAccount}>
        <div className="settings-form-grid">
          <TextInput id="mail-address" labelText="邮箱地址" placeholder="sales@example.com" value={form.email_address} onChange={e=>updateForm("email_address",e.target.value)} required/>
          <TextInput id="mail-display-name" labelText="显示名称" placeholder="销售团队" value={form.display_name} onChange={e=>updateForm("display_name",e.target.value)}/>
          <TextInput id="mail-username" labelText="邮箱用户名" placeholder="通常为完整邮箱地址" value={form.username} onChange={e=>updateForm("username",e.target.value)} required/>
          <PasswordInput id="mail-password" labelText="邮箱密码 / 应用专用密码" value={form.password} onChange={e=>updateForm("password",e.target.value)} required/>
          <TextInput id="mail-imap-host" labelText="IMAP 服务器" placeholder="imap.example.com" value={form.imap_host} onChange={e=>updateForm("imap_host",e.target.value)} required/>
          <TextInput id="mail-imap-port" labelText="IMAP 端口" value={form.imap_port} onChange={e=>updateForm("imap_port",e.target.value)} required/>
          <TextInput id="mail-smtp-host" labelText="SMTP 服务器" placeholder="smtp.example.com" value={form.smtp_host} onChange={e=>updateForm("smtp_host",e.target.value)} required/>
          <TextInput id="mail-smtp-port" labelText="SMTP 端口" value={form.smtp_port} onChange={e=>updateForm("smtp_port",e.target.value)} required/>
          <Select id="mail-smtp-tls" labelText="SMTP 加密方式" value={form.smtp_tls_mode} onChange={e=>updateForm("smtp_tls_mode",e.target.value)}><SelectItem value="tls" text="SSL / TLS"/><SelectItem value="starttls" text="STARTTLS"/></Select>
          <Select id="mail-sync-window" labelText="首次同步范围" value={form.sync_window_days} onChange={e=>updateForm("sync_window_days",e.target.value)}><SelectItem value="7" text="最近 7 天"/><SelectItem value="30" text="最近 30 天"/><SelectItem value="90" text="最近 90 天"/></Select>
        </div>
        <InlineNotification kind="warning" lowContrast hideCloseButton title="当前只保存连接参数" subtitle="IMAP / SMTP 服务器连接测试、邮件同步与收发服务仍在开发中。保存配置不会启动网络连接。" />
        <div className="settings-catalog-actions"><Button kind="secondary" type="button" onClick={()=>setFormOpen(false)}>取消</Button><Button kind="primary" type="submit" disabled={saving}>{saving?"保存中…":"保存邮箱配置"}</Button></div>
      </form>
    </section>}
    <section className="settings-catalog-group">
      <div className="settings-catalog-group-heading"><div><h4>AI 邮件处理策略</h4><p>采用高级模式：自动分类和生成草稿，但不自动发送。</p></div><Tag type="blue">高级模式</Tag></div>
      <div className="settings-catalog-items">
        <Tile className="settings-catalog-item"><strong>自动分类与摘要</strong><p className="settings-catalog-description">识别询价、采购、合作、订单、售后及其他商务邮件，并提取关键需求。</p><Tag type="gray">后端任务待接入</Tag></Tile>
        <Tile className="settings-catalog-item"><strong>自动生成回复草稿</strong><p className="settings-catalog-description">根据原邮件语言和会话上下文生成可编辑的回复草稿。</p><Tag type="gray">后端任务待接入</Tag></Tile>
      </div>
      <InlineNotification kind="warning" lowContrast hideCloseButton title="发送必须由用户授权" subtitle="AI 只允许生成和保存草稿。任何邮件都必须由用户检查发件账户、收件人及正文后，主动点击发送。" />
    </section>
  </div>;
}
