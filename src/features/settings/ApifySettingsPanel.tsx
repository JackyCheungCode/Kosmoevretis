import { useState } from "react";
import { Button, InlineNotification, PasswordInput, Tag } from "@carbon/react";
import { CheckmarkFilled, Locked } from "@carbon/icons-react";

type Props = { adminToken: string };
async function readResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `请求失败（HTTP ${response.status}）`);
  return payload;
}
export function ApifySettingsPanel({ adminToken }: Props) {
  const [apiToken, setApiToken] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const headers = { "Content-Type": "application/json", "X-Kosmo-Admin-Token": adminToken };
  const load = async () => {
    if (!adminToken) { setError("请先输入并验证平台管理员令牌。"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await readResponse(await fetch("/api/integrations/apify", { headers }));
      setHasToken(!!result.hasToken);
      setMessage(result.hasToken ? "Apify API Token 已安全保存，服务端调用已启用。" : "尚未配置 Apify API Token。");
    } catch (e) { setError(e instanceof Error ? e.message : "读取 Apify 配置失败。"); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!adminToken) { setError("请先输入并验证平台管理员令牌。"); return; }
    if (!apiToken.trim()) { setError("请输入 Apify API Token。"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      await readResponse(await fetch("/api/integrations/apify", { method: "POST", headers, body: JSON.stringify({ apiToken }) }));
      setApiToken(""); setHasToken(true); setMessage("Apify API Token 已加密保存。密钥不会在页面回显。");
    } catch (e) { setError(e instanceof Error ? e.message : "保存 Apify 配置失败。"); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!adminToken) { setError("请先输入并验证平台管理员令牌。"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      await readResponse(await fetch("/api/integrations/apify", { method: "DELETE", headers }));
      setHasToken(false); setApiToken(""); setMessage("已删除设置中保存的 Apify Token。");
    } catch (e) { setError(e instanceof Error ? e.message : "删除 Apify 配置失败。"); }
    finally { setBusy(false); }
  };
  return <section className="ai-admin-panel apify-settings-panel">
    <div className="ai-section-head"><div><div className="ep-section-kicker">数据服务接入</div><h2>Apify 数据采集服务</h2><p>统一管理 Actor API 凭证。Token 仅在服务端加密保存，市场趋势页面无需重复填写。</p></div><Tag type={hasToken ? "green" : "gray"}>{hasToken ? "已配置" : "未配置"}</Tag></div>
    <div className="apify-settings-content">
      <div className="apify-settings-icon"><Locked size={20} /></div>
      <div className="apify-settings-fields">
        <PasswordInput id="apify-api-token" labelText="Apify API Token" autoComplete="new-password" value={apiToken} onChange={event => setApiToken(event.target.value)} placeholder={hasToken ? "已保存 Token；输入新值可轮换密钥" : "粘贴 Apify Console 中的 API Token"} helperText="建议使用专用 API Token。输入内容仅发送至本平台服务端，不会写入前端存储或代码仓库。" />
        <div className="apify-settings-actions">
          <Button kind="primary" onClick={save} disabled={busy || !apiToken.trim()}>加密保存</Button>
          <Button kind="tertiary" onClick={load} disabled={busy}>检查配置状态</Button>
          {hasToken && <Button kind="danger--tertiary" onClick={remove} disabled={busy}>删除 Token</Button>}
        </div>
        {busy && <p className="ai-usage-note">正在处理 Apify 配置…</p>}
        {message && <p className="ai-usage-note" role="status"><CheckmarkFilled size={16} /> {message}</p>}
        {error && <InlineNotification kind="error" lowContrast title="Apify 配置失败" subtitle={error} />}
      </div>
    </div>
  </section>;
}
