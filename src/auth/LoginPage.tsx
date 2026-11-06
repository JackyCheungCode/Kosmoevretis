import React, { useEffect, useRef, useState } from "react";
import { Button, InlineNotification, PasswordInput, TextInput } from "@carbon/react";
import { ArrowRight, Locked } from "@carbon/icons-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";

type RedirectState = { from?: { pathname?: string; search?: string; hash?: string } };

function ParticleGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const carbon = getComputedStyle(document.documentElement);
    const blue30 = carbon.getPropertyValue("--cds-blue-30").trim();
    const blue40 = carbon.getPropertyValue("--cds-blue-40").trim();
    const blue60 = carbon.getPropertyValue("--cds-blue-60").trim();
    const interactive = carbon.getPropertyValue("--cds-interactive").trim();
    let frame = 0;
    let width = 0;
    let height = 0;
    let points: Array<{ x: number; y: number; z: number; phase: number }> = [];
    let rotation = 0;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(650, Math.min(1500, Math.round(width * height / 430)));
      points = Array.from({ length: count }, (_, i) => {
        const y = 1 - (i / (count - 1)) * 2;
        const radius = Math.sqrt(1 - y * y);
        const theta = goldenAngle * i;
        return { x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius, phase: (i * 2.399) % (Math.PI * 2) };
      });
    };

    const draw = () => {
      if (!context) return;
      context.clearRect(0, 0, width, height);
      const cx = width * 0.52;
      const cy = height * 0.49;
      const radius = Math.min(width * 0.36, height * 0.39, 330);
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const projected = points.map((point) => {
        const x = point.x * cos - point.z * sin;
        const z = point.x * sin + point.z * cos;
        const perspective = 2.8 / (2.8 - z * 0.42);
        return { x: cx + x * radius * perspective, y: cy + point.y * radius * perspective, z, depth: (z + 1) / 2, phase: point.phase };
      });

      context.globalAlpha = 0.1;
      context.fillStyle = blue60;
      context.beginPath();
      context.arc(cx, cy, radius * 1.2, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = "rgba(66, 190, 255, .10)";
      context.lineWidth = 0.65;
      for (let i = 0; i < projected.length; i += 1) {
        const a = projected[i];
        if (a.z < -0.2) continue;
        for (let j = i + 1; j < Math.min(i + 9, projected.length); j += 1) {
          const b = projected[j];
          if (b.z < -0.2) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = dx * dx + dy * dy;
          if (distance < radius * radius * 0.012) {
            context.globalAlpha = Math.max(0.04, (1 - distance / (radius * radius * 0.012)) * 0.19);
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
          }
        }
      }
      context.globalAlpha = 1;

      projected.forEach((point, index) => {
        if (point.z < -0.34) return;
        const pulse = 0.72 + Math.sin((reduceMotion ? 0 : frame * 0.018) + point.phase) * 0.28;
        const size = (0.55 + point.depth * 1.25) * pulse;
        context.globalAlpha = 0.25 + point.depth * 0.72;
        context.fillStyle = index % 13 === 0 ? blue30 : index % 5 === 0 ? blue40 : interactive;
        context.beginPath();
        context.arc(point.x, point.y, size, 0, Math.PI * 2);
        context.fill();

      });
      context.globalAlpha = 1;

      // Fine orbital paths add depth without competing with the particle globe.
      context.strokeStyle = blue40;
      context.globalAlpha = 0.18;
      context.lineWidth = 0.8;
      for (let orbit = 0; orbit < 3; orbit += 1) {
        context.beginPath();
        context.ellipse(cx, cy, radius * (1.08 + orbit * 0.09), radius * (0.25 + orbit * 0.035), -0.32 + orbit * 0.28, 0, Math.PI * 2);
        context.stroke();
      }

      if (!reduceMotion) {
        rotation += 0.0018;
        frame += 1;
        animationId = window.requestAnimationFrame(draw);
      }
    };

    let animationId = 0;
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    draw();
    return () => {
      window.cancelAnimationFrame(animationId);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="kosmo-globe-canvas" aria-hidden="true" />;
}

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
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
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
      <section className="kosmo-login-visual" aria-label="全球市场情报视觉展示">
        <div className="kosmo-visual-grid" />
        <ParticleGlobe />
        <div className="kosmo-visual-top">
          <div className="kosmo-login-brand kosmo-login-brand-light">
            <span className="kosmo-login-mark">K</span>
            <span>KOSMOEVRETIS</span>
          </div>
          <span className="kosmo-visual-status"><i /> GLOBAL NETWORK ACTIVE</span>
        </div>
        <div className="kosmo-visual-copy">
          <div className="kosmo-login-eyebrow">SEE THE WORLD. FIND THE SIGNAL.</div>
          <h1>洞察全球市场<br /><span>发现商业机会。</span></h1>
          <p>连接全球市场、产品趋势与商业信号，<br />让每一次决策都拥有更广阔的视野。</p>
        </div>
        <div className="kosmo-visual-metrics">
          <div><strong>GLOBAL</strong><span>市场覆盖</span></div>
          <div><strong>INTELLIGENCE</strong><span>多维情报</span></div>
          <div><strong>DISCOVERY</strong><span>机会发现</span></div>
        </div>
        <div className="kosmo-visual-coordinate">31°13′ N&nbsp;&nbsp; 121°28′ E <span>GLOBAL INTELLIGENCE NETWORK</span></div>
      </section>

      <section className="kosmo-login-panel" aria-labelledby="kosmo-login-title">
        <div className="kosmo-login-panel-inner">
          <div className="kosmo-login-brand kosmo-login-brand-mobile">
            <span className="kosmo-login-mark">K</span><span>KOSMOEVRETIS</span>
          </div>
          <div className="kosmo-login-heading">
            <div className="kosmo-login-eyebrow">GLOBAL INTELLIGENCE PLATFORM</div>
            <h2 id="kosmo-login-title">欢迎回来</h2>
            <p>登录以继续使用全球情报工作台。</p>
          </div>
          <form className="kosmo-login-form" onSubmit={handleSubmit}>
            {error && <InlineNotification kind="error" lowContrast title="无法登录" subtitle={error} hideCloseButton />}
            <TextInput id="kosmo-login-email" type="email" labelText="邮箱" placeholder="输入账户邮箱" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <PasswordInput id="kosmo-login-password" labelText="密码" placeholder="输入密码" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <Button type="submit" kind="primary" size="lg" className="kosmo-login-submit" renderIcon={ArrowRight} disabled={busy || !email.trim() || !password}>
              {busy ? "正在登录…" : "登录"}
            </Button>
          </form>
          <div className="kosmo-login-footnote"><Locked size={16} /><span>仅限已创建的账户登录 · 不提供公开注册</span></div>
        </div>
        <div className="kosmo-login-panel-footer">© KOSMOEVRETIS <span>GLOBAL INTELLIGENCE</span></div>
      </section>
    </main>
  );
}
