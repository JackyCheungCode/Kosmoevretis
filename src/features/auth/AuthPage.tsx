import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, TextInput, InlineNotification } from "@carbon/react";
import { requireSupabase } from "../../lib/supabase";
import { useAuth } from "../../app/AuthProvider";

export function AuthPage() {
  const [mode, setMode] = useState<"login"|"signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const client = requireSupabase();
      const result = mode === "signup"
        ? await client.auth.signUp({ email, password })
        : await client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setError("注册成功。请先完成邮箱验证，再返回此处登录。"); return;
      }
      await refresh(); navigate("/workspace");
    } catch (e) { setError(e instanceof Error ? e.message : "身份验证失败"); }
    finally { setBusy(false); }
  };
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}>
    <div className="eyebrow">KOSMOEVRETIS · SECURE ACCESS</div><h1>{mode === "signup" ? "创建账户" : "欢迎回来"}</h1>
    <p>登录后创建或进入你的组织工作空间。</p>
    {error && <InlineNotification kind="error" title="提示" subtitle={error} />}
    <TextInput id="auth-email" labelText="邮箱" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
    <TextInput id="auth-password" labelText="密码（至少 8 位）" type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8}/>
    <Button type="submit" disabled={busy} className="auth-submit">{busy ? "处理中…" : mode === "signup" ? "注册并继续" : "登录"}</Button>
    <button type="button" className="text-button" onClick={()=>setMode(mode==="signup"?"login":"signup")}>{mode==="signup"?"已有账户？登录":"没有账户？创建账户"}</button>
  </form></main>;
}
