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
  const [verified, setVerified] = useState(false);
  const headers = { "Content-Type": "application/json", "X-Kosmo-Admin-Token": adminToken };
  const load = async () => {
    if (!adminToken) { setError("请先输入并验证平台管理员令牌。"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await readResponse(await fetch("/api/integrations/apify", { headers }));
      setHasToken(!!result.hasToken);
      setVerified(false);
      setMessage(result.hasToken ? "Apify API Token 已加密保存。此状态仅代表凭证存在，尚未验证 Apify 账号或 Actor 权限。" : "尚未配置 Apify API Token。");
    } catch (e) { setError(e instanceof Error ? e.message : "读取 Apify 配置失败。"); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!adminToken) { setError("请先输入并验证平台管理员令牌。"); return; }
    if (!apiToken.trim()) { setError("请输入 Apify API Token。"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      await readResponse(await fetch("/api/integrations/apify", { method: "POST", headers, body: JSON.stringify({ apiToken }) }));
      setApiToken(""); setHasToken(true); setVerified(false); setMessage("Apify API Token 已加密保存。密钥不会在页面回显；请继续执行真实连接验证。");
    } catch (e) { setError(e instanceof Error ? e.message : "保存 Apify 配置失败。"); }
    finally { setBusy(false); }
  };
  const testConnection = async () => {\n    if (!adminToken) { setError("请先输入并验证平台管理员令牌。"); return; }\n    setBusy(true); setError(""); setMessage(""); setVerified(false);\n    try {\n      const result = await readResponse(await fetch("/api/integrations/apify/test", { method: "POST", headers }));\n      setVerified(true);\n      setMessage("验证成功：Apify 账号 " + (result.account?.username || result.account?.id) + " 可读取关键词研究 Actor（" + result.actor?.id + "）。");\n    } catch (e) { setError(e instanceof Error ? e.message : "Apify 连接验证失败。"); }\n    finally { setBusy(false); }\n  };\n  const remove = async () => {
    if (!adminToken) { setError("请先输入并验证平台管理员令牌。"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      await readResponse(await fetch("/api/integrations/apify", { method: "DELETE", headers }));
      setHasToken(false); setVerified(false); setApiToken(""); setMessage("已删除设置中保存的 Apify Token。");
    } catch (e) { setError(e instanceof Error ? e.message : "删除 Apify 配置失败。"); }
    finally { setBusy(false); }
  };
  return <section className="ai-admin-panel apify-settings-panel">
    <div className="ai-section-head"><div><div className="ep-section-kicker">数据服务接入</div><h2>Apify 数据采集服务</h2><p>统一管理 Actor API 凭证。Token 仅在服务端加密保存；保存状态与真实 API 连通性分开验证。</p></div><Tag type={verified ? "green" : hasToken ? "blue" : "gray"}>{verified ? "账号与 Actor 已验证" : hasToken ? "已保存 · 未验证" : "未配置"}</Tag></div>
    <div className="apify-settings-content">
      <div className="apify-settings-icon"><Locked size={20} /></div>
      <div className="apify-settings-fields">
        <PasswordInput id="apify-api-token" labelText="Apify API Token" autoComplete="new-password" value={apiToken} onChange={event => setApiToken(event.target.value)} placeholder={hasToken ? "已保存 Token；输入新值可轮换密钥" : "粘贴 Apify Console 中的 API Token"} helperText="建议使用专用 API Token。输入内容仅发送至本平台服务端，不会写入前端存储或代码仓库。" />
        <div className="apify-settings-actions">
          <Button kind="primary" onClick={save} disabled={busy || !apiToken.trim()}>加密保存</Button>
          <Button kind="tertiary" onClick={load} disabled={busy}>检查保存状态</Button>\n          <Button kind="secondary" onClick={testConnection} disabled={busy || !hasToken}>验证账号与 Actor 权限</Button>
          {hasToken && <Button kind="danger--tertiary" onClick={remove} disabled={busy}>删除 Token</Button>}
        </div>
        {busy && <p className="ai-usage-note">正在处理 Apify 配置…</p>}
        {message && <p className="ai-usage-note" role="status"><CheckmarkFilled size={16} /> {message}</p>}
        {error && <InlineNotification kind="error" lowContrast title="Apify 配置失败" subtitle={error} />}
      </div>
    </div>
  </section>;
}
