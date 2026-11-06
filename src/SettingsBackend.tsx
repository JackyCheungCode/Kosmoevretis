import { useCallback, useEffect, useState } from "react";
import { Accordion, AccordionItem, Button, InlineLoading, InlineNotification, PasswordInput, TextInput, Tile, Tag } from "@carbon/react";
import { supabase } from "./lib/supabase";
import BrandLogo from "./BrandLogo";

const ORGANIZATION_ID = "d6dd93fe-75ac-4c2f-90a3-53474acdef8f";

const apiProviders = [
  { key: "apify", name: "Apify", domain: "apify.com", group: "数据采集与网页抓取", description: "Actor 自动化执行与数据采集平台", credentialLabel: "Apify API Token", placeholder: "输入 Apify API Token" },
  { key: "context_dev", name: "Context.dev", domain: "context.dev", group: "SEO 与网站分析", description: "全站 URL 发现、页面内容采集与 AI SEO 诊断数据源。", credentialLabel: "Context.dev API Key", placeholder: "输入 Context.dev API Key" },
  { key: "dataforseo", name: "DataForSEO（旧版）", domain: "dataforseo.com", group: "SEO 与网站分析", description: "旧版 OnPage 服务配置；新版 SEO 诊断不再依赖此服务。", credentialLabel: "DataForSEO API Key / Authorization Token", placeholder: "粘贴 DataForSEO API Key（Base64 凭证）" },
  { key: "google_pagespeed", name: "Google PageSpeed Insights", domain: "developers.google.com", group: "SEO 与网站分析", description: "Lighthouse 性能、SEO、无障碍与最佳实践检测。", credentialLabel: "PageSpeed API Key", placeholder: "输入 Google PageSpeed API Key" },
  { key: "octoparse", name: "Octoparse", domain: "octoparse.com", group: "数据采集与网页抓取", description: "云端网页抓取与无代码数据采集", credentialLabel: "Octoparse API Key", placeholder: "输入 Octoparse API Key" },
  { key: "firecrawl", name: "Firecrawl", domain: "firecrawl.dev", group: "数据采集与网页抓取", description: "网页搜索、抓取与 AI 就绪内容提取", credentialLabel: "Firecrawl API Key", placeholder: "输入 Firecrawl API Key" },
  { key: "bright_data", name: "Bright Data", domain: "brightdata.com", group: "全球数据访问", description: "全球代理网络、网页采集与结构化数据", credentialLabel: "Bright Data API Key", placeholder: "输入 Bright Data API Key" },
  { key: "phantombuster", name: "PhantomBuster", domain: "phantombuster.com", group: "社媒与线索采集", description: "社交平台自动化、线索采集与数据丰富", credentialLabel: "PhantomBuster API Key", placeholder: "输入 PhantomBuster API Key" },
  { key: "texau", name: "TexAu", domain: "texau.com", group: "社媒与线索采集", description: "销售情报、社交数据与工作流自动化", credentialLabel: "TexAu API Key", placeholder: "输入 TexAu API Key" },
  { key: "upkuajing", name: "跨境魔方", domain: "upkuajing.com", group: "跨境市场数据", description: "全球企业、采购商与海关贸易数据 API", credentialLabel: "跨境魔方 API Key", placeholder: "输入跨境魔方 API Key" },
] as const;

const providerGroups = [
  { name: "数据采集与网页抓取", description: "管理网页抓取、自动化采集和结构化数据服务。" },
  { name: "全球数据访问", description: "管理全球代理网络与跨区域网页数据访问能力。" },
  { name: "社媒与线索采集", description: "管理社交平台自动化、线索发现与数据丰富服务。" },
  { name: "跨境市场数据", description: "管理跨境电商、企业与贸易市场数据服务。" },
  { name: "SEO 与网站分析", description: "管理网站爬取、技术 SEO 与页面性能检测服务。" },
] as const;

type ApiState = {
  providers: Array<{ provider_key: string; display_name: string; is_enabled: boolean; credential_hint: string | null; status: string; last_tested_at: string | null }>;
};

export default function SettingsBackend() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [dataForSeoApiKey, setDataForSeoApiKey] = useState("");
  const [savedProviders, setSavedProviders] = useState<ApiState["providers"]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
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
    setSavedProviders(data.providers || []);
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
      else setSavedProviders([]);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [load]);

  const signIn = async () => {
    setBusyKey("login");
    setNotice(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      setPassword("");
      setNotice({ kind: "success", title: "登录成功", message: "正在读取组织配置。" });
    } catch (error) {
      setNotice({ kind: "error", title: "登录失败", message: error instanceof Error ? error.message : "请检查账号和密码。" });
    } finally {
      setBusyKey(null);
    }
  };

  const saveProvider = async (providerKey: string) => {
    const definition = apiProviders.find(item => item.key === providerKey);
    const credential = providerKey === "dataforseo"
      ? dataForSeoApiKey.trim()
      : credentials[providerKey]?.trim();
    if (!definition || !credential) {
      setNotice({ kind: "error", title: "缺少 API 凭证", message: "请先输入 " + (definition?.credentialLabel || "API Key") + "。" });
      return;
    }
    setBusyKey(providerKey);
    setNotice(null);
    try {
      await invoke("save_provider", {
        provider_key: providerKey,
        display_name: definition.name,
        credential,
        is_enabled: true,
      });
      setCredentials(current => ({ ...current, [providerKey]: "" }));
      if (providerKey === "dataforseo") setDataForSeoApiKey("");
      if (providerKey === "apify") {
        const result = await invoke("test_apify") as { actor_username?: string; plan?: string };
        await load();
        setNotice({
          kind: "success",
          title: "Apify 连接成功",
          message: [result.actor_username ? "账号：" + result.actor_username : "", result.plan ? "套餐：" + result.plan : ""].filter(Boolean).join(" · ") || "API Token 已验证。",
        });
      } else {
        await load();
        setNotice({ kind: "success", title: definition.name + " 凭证已安全保存", message: providerKey === "context_dev" || providerKey === "google_pagespeed" ? "凭证已通过服务端加密保存；可在本组下方测试实际 API 连通性。" : "凭证已通过服务端加密保存。" });
      }
    } catch (error) {
      setNotice({ kind: "error", title: definition.name + " 配置失败", message: error instanceof Error ? error.message : "请检查凭证和服务配置。" });
      await load().catch(() => undefined);
    } finally {
      setBusyKey(null);
    }
  };

  const testSeoConnections = async () => {
    setBusyKey("seo-test");
    setNotice(null);
    try {
      const { data, error } = await supabase.functions.invoke("seo-intelligence", {
        body: { action: "test_connections", organization_id: ORGANIZATION_ID },
      });
      if (error) throw new Error(error.message || "SEO 服务连接测试失败。");
      if (data?.error) throw new Error(data.error);
      setNotice({ kind: "success", title: "SEO 服务连接成功", message: data.message || "Context.dev 与 Google PageSpeed 已验证。" });
      await load();
    } catch (error) {
      setNotice({ kind: "error", title: "SEO 服务连接测试失败", message: error instanceof Error ? error.message : "请检查 API 凭证。" });
    } finally { setBusyKey(null); }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setNotice({ kind: "info", title: "已退出", message: "组织设置需要重新登录后才能管理。" });
  };

  if (!sessionReady) return <InlineLoading description="正在检查管理员登录状态…" />;
  return <div className="intelligence-panel">
    {!signedIn ? <Tile className="library-card">
      <div className="library-card-head"><strong>组织管理员登录</strong><Tag type="gray">需要授权</Tag></div>
      <p>设置中心的凭证管理仅允许组织 Owner 或 Admin 操作。请使用已加入当前组织的管理员账号登录。</p>
      <TextInput id="settings-admin-email" labelText="管理员邮箱" type="email" value={email} onChange={event => setEmail(event.target.value)} />
      <PasswordInput id="settings-admin-password" labelText="登录密码" value={password} onChange={event => setPassword(event.target.value)} />
      <div className="analysis-submit-row"><span>登录状态仅保存在 Supabase Auth 会话中。</span><Button kind="primary" disabled={!email.trim() || !password || busyKey === "login"} onClick={signIn}>{busyKey === "login" ? "登录中…" : "登录并加载配置"}</Button></div>
    </Tile> : <>
      <div className="provider-groups">{providerGroups.map(group => {
        const definitions = apiProviders.filter(item => item.group === group.name);
        return <section className="provider-group" key={group.name}>
          <div className="provider-group-heading">
            <div><h4>{group.name}</h4><p>{group.description}</p></div>
            <Tag type="cool-gray">{definitions.length} 个服务商</Tag>
          </div>
          <div className="provider-directory">{definitions.map(definition => {
            const saved = savedProviders.find(item => item.provider_key === definition.key);
            const isApify = definition.key === "apify";
            const status = saved?.status === "verified" ? "已验证" : saved?.status === "error" ? "连接异常" : saved?.credential_hint ? "已保存" : "未配置";
            const tagType = saved?.status === "verified" ? "green" : saved?.status === "error" ? "red" : saved?.credential_hint ? "blue" : "gray";
            return <Accordion key={definition.key} className="provider-directory-item">
              <AccordionItem title={<div className="provider-directory-row">
                <div className="provider-identity">
                  <BrandLogo name={definition.name} domain={definition.domain} />
                  <div className="provider-directory-name"><strong>{definition.name}</strong><span>{definition.description}</span></div>
                </div>
                <Tag type={tagType}>{status}</Tag>
              </div>}>
                <div className="provider-detail">
                  <div className="provider-detail-description">{definition.description}</div>
                  {definition.key === "dataforseo" ? <PasswordInput
                    id="settings-dataforseo-api-key"
                    labelText="API Key / Authorization Token"
                    placeholder={saved?.credential_hint ? "留空则保留当前凭证" : "粘贴 API Access 中的 Base64 凭证"}
                    helperText="支持 Base64 编码的 login:password；也兼容直接填写 login:password。"
                    value={dataForSeoApiKey}
                    onChange={event => setDataForSeoApiKey(event.target.value)}
                  /> : <PasswordInput
                    id={"settings-provider-" + definition.key}
                    labelText={definition.credentialLabel}
                    placeholder={saved?.credential_hint ? "留空则保留当前凭证" : definition.placeholder}
                    value={credentials[definition.key] || ""}
                    onChange={event => setCredentials(current => ({ ...current, [definition.key]: event.target.value }))}
                  />}
                  <div className="provider-detail-meta">
                    <span>{saved?.credential_hint ? "已保存凭证 · " + saved.credential_hint : "尚未配置连接凭证"}</span>
                    {isApify && saved?.last_tested_at && <span>上次测试：{new Date(saved.last_tested_at).toLocaleString()}</span>}
                  </div>
                  <div className="analysis-submit-row">
                    <span>{isApify ? "保存后将调用 Apify 用户接口验证凭证。" : definition.key === "dataforseo" ? "旧版 DataForSEO 凭证仅保留兼容，不参与新版诊断。" : definition.key === "context_dev" ? "Context.dev API Key 仅在服务端解密调用，并通过现有加密凭证机制保存。" : "凭证通过服务端加密保存；可在本组下方执行连接测试。"}</span>
                    <Button kind="primary" disabled={!!busyKey} onClick={() => saveProvider(definition.key)}>
                      {busyKey === definition.key ? "处理中…" : isApify ? "保存并测试连接" : "安全保存凭证"}
                    </Button>
                  </div>
                </div>
              </AccordionItem>
            </Accordion>;
          })}</div>
        </section>;
      })}</div>
      <div className="analysis-submit-row">
        <span>Context.dev 与 Google PageSpeed 凭证保存后，可执行实际连接验证。</span>
        <Button kind="secondary" disabled={!!busyKey} onClick={testSeoConnections}>{busyKey === "seo-test" ? "测试中…" : "测试 SEO 数据服务"}</Button>
      </div>
      <div className="analysis-submit-row"><span>已通过组织管理员身份验证。</span><Button kind="ghost" size="sm" onClick={signOut}>退出登录</Button></div>
    </>}
    {notice && <InlineNotification kind={notice.kind} lowContrast title={notice.title} subtitle={notice.message} hideCloseButton />}
  </div>;
}
