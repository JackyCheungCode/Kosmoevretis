import React, { useState } from "react";
import { Button, InlineNotification, PasswordInput, TextInput } from "@carbon/react";
import { ArrowRight, Locked } from "@carbon/icons-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";

type RedirectState = { from?: { pathname?: string; search?: string; hash?: string } };

export default function LoginPage() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!loading && session) {
    const from = (location.state as RedirectState | null)?.from;
    return <Navigate to={from ? { pathname: from.pathname || "/intelligence", search: from.search || "", hash: from.hash || "" } : "/intelligence"} replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      const from = (location.state as RedirectState | null)?.from;
      navigate(from ? { pathname: from.pathname || "/intelligence", search: from.search || "", hash: from.hash || "" } : "/intelligence", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "登录失败，请检查邮箱和密码后重试。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="kosmo-login-screen">
      <section className="kosmo-login-panel" aria-labelledby="kosmo-login-title">
        <div className="kosmo-login-brand">
          <span className="kosmo-login-mark">K</span>
          <span>KOSMOEVRETIS</span>
        </div>
        <div className="kosmo-login-heading">
          <div className="kosmo-login-eyebrow">GLOBAL INTELLIGENCE PLATFORM</div>
          <h1 id="kosmo-login-title">欢迎回来</h1>
          <p>登录以继续使用全球情报工作台。</p>
        </div>
        <form className="kosmo-login-form" onSubmit={handleSubmit}>
          {error && <InlineNotification kind="error" lowContrast title="无法登录" subtitle={error} hideCloseButton />}
          <TextInput
            id="kosmo-login-email"
            type="email"
            labelText="邮箱"
            placeholder="输入 Supabase 账户邮箱"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <PasswordInput
            id="kosmo-login-password"
            labelText="密码"
            placeholder="输入密码"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Button type="submit" kind="primary" size="lg" className="kosmo-login-submit" renderIcon={ArrowRight} disabled={busy || !email.trim() || !password}>
            {busy ? "正在登录…" : "登录"}
          </Button>
        </form>
        <div className="kosmo-login-footnote">
          <Locked size={16} />
          <span>仅限已创建的账户登录 · 不提供公开注册</span>
        </div>
      </section>
      <div className="kosmo-login-footer">KOSMOEVRETIS · GLOBAL INTELLIGENCE</div>
    </main>
  );
}
