import { useCallback, useEffect, useState } from "react";
import { Button, InlineLoading, InlineNotification, PasswordInput, PasswordInputSkeleton, TextInput, Tile, Tag } from "@carbon/react";
import { supabase } from "./lib/supabase";

const ORGANIZATION_ID = "d6dd93fe-75ac-4c2f-90a3-53474acdef8f";

type ApiState = {
  providers: Array<{ provider_key: string; display_name: string; is_enabled: boolean; credential_hint: string | null; status: string; last_tested_at: string | null }>;
};

export default function SettingsBackend() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [token, setToken] = useState("");
  const [provider, setProvider] = useState<ApiState["providers"][number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error" | "info"; title: string; message: string } | null>(null);

  const invoke = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("settings-api", {
      body: { action, organization_id: ORGANIZATION_ID, ...payload },
    });
    if (error) throw new Error(error.message || "设置服务请求失败");
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const load = useCallback(async () => {
    const data = await invoke("list") as ApiState;
    setProvider(data.providers?.find(item => item.provider_key === "apify") || null);
  }, [invoke]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSignedIn(!!data.session);
      setSessionReady(true);
      if (data.session) load().catch(error => setNotice({ kind: "error", title: "读取配置失败", message: error.message }));
    }).catch(error => {
      if (active) {
        setSessionReady(true);
        setNotice({ kind: "error", title: "读取登录状态失败", message: error.message });
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
      if (session) load().catch(error => setNotice({ kind: "error", title: "读取配置失败", message: error.message }));
      else setProvider(null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [load]);

  const signIn = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      setPassword("");
      setNotice({ kind: "success", title: "登录成功", message: "正在读取组织配置。" });
    } catch (error) {
      setNotice({ kind: "error", title: "登录失败", message: error instanceof Error ? error.message : "请检查账号和密码。" });
    } finally {
      setBusy(false);
    }
  };

  const saveAndTest = async () => {
    if (!token.trim() && !provider?.credential_hint) {
      setNotice({ kind: "error", title: "缺少 API Token", message: "请先输入 Apify API Token。" });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      if (token.trim()) {
        await invoke("save_provider", {
          provider_key: "apify",
          display_name: "Apify",
          credential: token.trim(),
          is_enabled: true,
        });
        setToken("");
      }
      const result = await invoke("test_apify") as { actor_username?: string; plan?: string };
      await load();
      setNotice({
        kind: "success",
        title: "Apify 连接成功",
        message: [result.actor_username ? "账号：" + result.actor_username : "", result.plan ? "套餐：" + result.plan : ""].filter(Boolean).join(" · ") || "API Token 已验证。",
      });
    } catch (error) {
      setNotice({ kind: "error", title: "Apify 连接失败", message: error instanceof Error ? error.message : "请检查 Token 和服务配置。" });
      await load().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setNotice({ kind: "info", title: "已退出", message: "组织设置需要重新登录后才能管理。" });
  };

  if (!sessionReady) return <InlineLoading description="正在检查管理员登录状态…" />;
  return <div className="intelligence-panel">
    <div className="results-heading">
      <h3>Apify 账号连接</h3>
      <p>通过服务端加密保存 API Token，并使用 Apify 官方账号接口验证连接。凭证不会返回浏览器。</p>
    </div>
    {!signedIn ? <Tile className="library-card">
      <div className="library-card-head"><strong>组织管理员登录</strong><Tag type="gray">需要授权</Tag></div>
      <p>设置中心的凭证管理仅允许组织 Owner 或 Admin 操作。请使用已加入当前组织的管理员账号登录。</p>
      <TextInput id="settings-admin-email" labelText="管理员邮箱" type="email" value={email} onChange={event => setEmail(event.target.value)} />
      <PasswordInput id="settings-admin-password" labelText="登录密码" value={password} onChange={event => setPassword(event.target.value)} />
      <div className="analysis-submit-row"><span>登录状态仅保存在 Supabase Auth 会话中。</span><Button kind="primary" disabled={!email.trim() || !password || busy} onClick={signIn}>{busy ? "登录中…" : "登录并加载配置"}</Button></div>
    </Tile> : <>
      <Tile className="library-card">
        <div className="library-card-head"><div><strong>Apify API Token</strong><span>{provider?.credential_hint ? "已保存凭证 · " + provider.credential_hint : "尚未配置凭证"}</span></div><Tag type={provider?.status === "verified" ? "green" : provider?.status === "error" ? "red" : provider?.credential_hint ? "blue" : "gray"}>{provider?.status === "verified" ? "已验证" : provider?.status === "error" ? "连接异常" : provider?.credential_hint ? "已保存" : "未配置"}</Tag></div>
        <PasswordInput id="settings-apify-token" labelText="Apify API Token" placeholder={provider?.credential_hint ? "留空则保留当前凭证" : "输入 Apify API Token"} value={token} onChange={event => setToken(event.target.value)} />
        <div className="analysis-submit-row"><span>{provider?.last_tested_at ? "上次测试：" + new Date(provider.last_tested_at).toLocaleString() : "凭证将通过 AES-GCM 加密保存。"}</span><Button kind="primary" disabled={busy} onClick={saveAndTest}>{busy ? "处理中…" : "保存并测试连接"}</Button></div>
      </Tile>
      <div className="analysis-submit-row"><span>已通过组织管理员身份验证。</span><Button kind="ghost" size="sm" onClick={signOut}>退出登录</Button></div>
    </>}
    {notice && <InlineNotification kind={notice.kind} lowContrast title={notice.title} subtitle={notice.message} hideCloseButton />}
  </div>;
}
