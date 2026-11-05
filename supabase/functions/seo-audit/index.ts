import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});
const enc = new TextEncoder();
const now = () => new Date().toISOString();
const clamp = (n: unknown, min: number, max: number, fallback: number) =>
  Math.min(max, Math.max(min, Number(n) || fallback));

async function decrypt(ciphertext: string, iv: string) {
  const secret = Deno.env.get("SETTINGS_ENCRYPTION_KEY");
  if (!secret || secret.length < 32) throw new Error("服务端凭证解密密钥未配置。");
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  const key = await crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["decrypt"]);
  const raw = (v: string) => Uint8Array.from(atob(v), c => c.charCodeAt(0));
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw(iv) }, key, raw(ciphertext));
  return new TextDecoder().decode(clear);
}
async function getCredential(admin: ReturnType<typeof createClient>, org: string, key: string) {
  const { data, error } = await admin.from("platform_provider_connections")
    .select("credential_ciphertext,credential_iv,is_enabled,status")
    .eq("organization_id", org).eq("provider_key", key).maybeSingle();
  if (error) throw error;
  if (!data?.is_enabled || !data.credential_ciphertext || !data.credential_iv) {
    throw new Error((key === "dataforseo" ? "DataForSEO" : "Google PageSpeed") + " 凭证尚未配置，请先到设置中心保存。");
  }
  return await decrypt(data.credential_ciphertext, data.credential_iv);
}
async function parseTarget(value: unknown) {
  let url: URL;
  try { url = new URL(String(value || "").trim()); } catch { throw new Error("请输入有效的网站首页 URL。"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("网站地址只允许 HTTP 或 HTTPS。");
  if (url.username || url.password) throw new Error("网址中不能包含登录凭证。");
  if (url.port && !((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443"))) {
    throw new Error("网站地址不允许使用非标准端口。");
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
      host.endsWith(".internal") || host === "metadata.google.internal" ||
      /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host === "0.0.0.0" || host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) {
    throw new Error("目标地址指向本地、内网或保留网络，出于安全原因不能扫描。");
  }
  if (!host.includes(".") && !/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) throw new Error("请输入可公开访问的域名。");
  const isPrivateIp = (ip: string) => {
    const v = ip.toLowerCase().replace(/^::ffff:/, "");
    if (v.includes(".")) {
      const parts = v.split(".").map(Number);
      if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
      const [a,b] = parts;
      return a === 0 || a === 10 || a === 127 || a >= 224 ||
        (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 168)) ||
        (a === 198 && (b === 18 || b === 19));
    }
    return v === "::" || v === "::1" || /^(fc|fd|fe[89ab])/i.test(v) || /^ff/i.test(v);
  };
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host) && host.includes(".")) {
    const lookups = await Promise.allSettled([Deno.resolveDns(host, "A"), Deno.resolveDns(host, "AAAA")]);
    const addresses = lookups.flatMap(result => result.status === "fulfilled" ? result.value : []);
    if (!addresses.length) throw new Error("网站域名无法解析，请检查 DNS 配置。");
    if (addresses.some(address => isPrivateIp(String(address)))) throw new Error("网站域名解析到了内网或保留 IP，出于安全原因不能扫描。");
  } else if (isPrivateIp(host)) throw new Error("目标地址不是可公开访问的 IP。");
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}
function splitDataForSeo(value: string) {
  const i = value.indexOf(":");
  if (i < 1 || i === value.length - 1) throw new Error("DataForSEO 凭证格式无效，请在设置中分别填写 API Login 和 API Password。");
  return { login: value.slice(0, i), password: value.slice(i + 1) };
}
async function dataForSeoRequest(login: string, password: string, path: string, body?: unknown) {
  const headers: Record<string, string> = { Authorization: "Basic " + btoa(login + ":" + password) };
  if (body) headers["Content-Type"] = "application/json";
  const response = await fetch("https://api.dataforseo.com" + path, {
    method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(45000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.status_code >= 40000) {
    const detail = payload?.status_message || payload?.tasks?.[0]?.status_message || ("HTTP " + response.status);
    throw new Error("DataForSEO 请求失败：" + String(detail).slice(0, 300));
  }
  return payload;
}
async function pageSpeed(url: string, key: string, strategy: "mobile" | "desktop") {
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("key", key);
  endpoint.searchParams.set("strategy", strategy);
  for (const category of ["performance", "accessibility", "best-practices", "seo"]) endpoint.searchParams.append("category", category);
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(30000) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("PageSpeed " + strategy + " 请求失败（HTTP " + response.status + "）。");
  const categories = payload?.lighthouseResult?.categories || {};
  const audits = payload?.lighthouseResult?.audits || {};
  return {
    url, strategy,
    scores: {
      performance: categories.performance?.score == null ? null : Math.round(categories.performance.score * 100),
      accessibility: categories.accessibility?.score == null ? null : Math.round(categories.accessibility.score * 100),
      best_practices: categories["best-practices"]?.score == null ? null : Math.round(categories["best-practices"].score * 100),
      seo: categories.seo?.score == null ? null : Math.round(categories.seo.score * 100),
    },
    metrics: {
      lcp_ms: audits["largest-contentful-paint"]?.numericValue ?? null,
      inp_ms: audits["interaction-to-next-paint"]?.numericValue ?? audits["max-potential-fid"]?.numericValue ?? null,
      cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
      fcp_ms: audits["first-contentful-paint"]?.numericValue ?? null,
      tbt_ms: audits["total-blocking-time"]?.numericValue ?? null,
      speed_index_ms: audits["speed-index"]?.numericValue ?? null,
    },
    opportunities: Object.values(audits).filter((a: any) => a?.details?.type === "opportunity" && a.score !== null && a.score < 0.9)
      .slice(0, 12).map((a: any) => ({ id: a.id, title: a.title, description: a.description, display_value: a.displayValue || null })),
    fetched_at: now(),
  };
}
function pageUrl(item: any, target: string) {
  const value = item?.url || item?.resource?.url || item?.page_url;
  try {
    const candidate = new URL(String(value || ""));
    if (["http:", "https:"].includes(candidate.protocol) && candidate.hostname === new URL(target).hostname) return candidate.toString();
  } catch { /* use the validated target URL */ }
  return target;
}
function makeReport(pages: any[], speed: any[], target: string, maxPages: number) {
  const average = (values: number[]) => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  const onpage = pages.map(p => Number(p.onpage_score)).filter(Number.isFinite);
  const perf = speed.map(s => s.scores?.performance).filter((v: any) => Number.isFinite(v));
  const seo = speed.map(s => s.scores?.seo).filter((v: any) => Number.isFinite(v));
  const accessibility = speed.map(s => s.scores?.accessibility).filter((v: any) => Number.isFinite(v));
  const technical = average(onpage);
  const performance = average(perf);
  const contentSignals = pages.map(p => {
    const meta = p.meta || {};
    const title = String(meta.title || "");
    const description = String(meta.description || "");
    const h1Values = p.meta?.htags?.h1 || p.h1 || [];
    const h1 = Array.isArray(h1Values) ? h1Values.length : Number(p.h1_count || 0);
    const words = Number(p.content?.plain_text_word_count || p.content?.word_count || p.meta?.content?.plain_text_word_count || p.word_count || 0);
    return (title.length >= 10 && title.length <= 60 ? 1 : 0) +
      (description.length >= 50 && description.length <= 160 ? 1 : 0) +
      (h1 === 1 ? 1 : 0) + (words >= 200 ? 1 : 0);
  });
  const content = contentSignals.length ? Math.round(contentSignals.reduce((a, b) => a + b, 0) / (contentSignals.length * 4) * 100) : null;
  const indexScore = average(seo);
  const weighted = [
    [technical, .35], [performance, .25], [content, .25], [indexScore, .15],
  ].filter((x): x is [number, number] => x[0] !== null);
  const coverage = Math.round(weighted.reduce((sum, x) => sum + x[1], 0) * 100);
  const total = weighted.length ? Math.round(weighted.reduce((sum, x) => sum + x[0] * x[1], 0) / weighted.reduce((sum, x) => sum + x[1], 0)) : null;
  const recommendations: any[] = [];
  for (const p of pages) {
    const meta = p.meta || {};
    const url = pageUrl(p, target);
    if (!meta.title) recommendations.push({ severity: "high", category: "内容", title: "页面缺少 Title", url, evidence: "DataForSEO 页面数据中未返回 meta.title", action: "为页面添加唯一、准确且包含核心主题的 Title。" });
    else if (String(meta.title).length > 60) recommendations.push({ severity: "medium", category: "内容", title: "Title 可能过长", url, evidence: "Title 长度为 " + String(meta.title).length + " 个字符", action: "精简标题并将最重要的主题放在前部。" });
    if (!meta.description) recommendations.push({ severity: "medium", category: "内容", title: "页面缺少 Meta Description", url, evidence: "DataForSEO 页面数据中未返回 meta.description", action: "编写页面专属摘要，准确概括内容与价值。" });
    const h1Values = p.meta?.htags?.h1 || p.h1 || [];
    const h1 = Array.isArray(h1Values) ? h1Values.length : Number(p.h1_count || 0);
    if (h1 !== 1) recommendations.push({ severity: "medium", category: "内容", title: "H1 标题数量异常", url, evidence: "检测到 H1 数量：" + h1, action: "确保页面有一个清晰、描述主题的主 H1。" });
    const code = Number(p.status_code || p.status_code_http || 0);
    if (code >= 400) recommendations.push({ severity: "high", category: "技术 SEO", title: "页面返回 HTTP 错误", url, evidence: "HTTP 状态码 " + code, action: "检查页面路由、服务器响应和内部链接，修复错误页面。" });
  }
  for (const s of speed) {
    if (s.scores?.performance !== null && s.scores?.performance < 50) recommendations.push({ severity: "high", category: "性能", title: "PageSpeed 性能评分偏低", url: s.url, evidence: s.strategy + " Performance " + s.scores.performance + "/100", action: "优先检查 LCP、主线程阻塞、图片体积与未使用 JavaScript。" });
    for (const o of (s.opportunities || []).slice(0, 3)) recommendations.push({ severity: "medium", category: "性能", title: o.title, url: s.url, evidence: o.display_value || o.description || o.id, action: "根据 Lighthouse 机会项检查并优化对应资源。" });
  }
  const unique = new Map<string, any>();
  for (const item of recommendations) unique.set(item.category + "|" + item.title + "|" + item.url, item);
  return {
    target, crawled_pages: pages.length, requested_max_pages: maxPages, pagespeed_samples: new Set(speed.map((item: any) => item.url)).size,
    coverage_percent: coverage, overall_score: total,
    scores: { technical_seo: technical, performance, content, indexability: indexScore, accessibility: average(accessibility) },
    recommendations: [...unique.values()].slice(0, 100),
    generated_at: now(),
    methodology: "评分仅基于本次 DataForSEO OnPage 与 Google PageSpeed 实际返回的数据；未覆盖的维度不计为满分。PageSpeed 仅检测代表性页面，不代表全站逐页性能。",
  };
}
async function authorized(req: Request) {
  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw Object.assign(new Error("请先登录企业工作区。"), { status: 401 });
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser(authorization.slice(7));
  if (error || !data.user) throw Object.assign(new Error("登录状态已失效，请重新登录。"), { status: 401 });
  return data.user;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  try {
    const user = await authorized(req);
    const body = await req.json();
    const org = String(body.organization_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(org)) return reply({ error: "组织信息无效。" }, 400);
    const { data: member, error: memberError } = await admin.from("organization_members").select("role")
      .eq("organization_id", org).eq("user_id", user.id).maybeSingle();
    if (memberError) throw memberError;
    if (!member || member.role === "viewer") return reply({ error: "当前账号没有执行 SEO 诊断任务的权限。" }, 403);

    if (body.action === "test_connections") {
      const df = splitDataForSeo(await getCredential(admin, org, "dataforseo"));
      await dataForSeoRequest(df.login, df.password, "/v3/appendix/user_data");
      const psiKey = await getCredential(admin, org, "google_pagespeed");
      const psi = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
      psi.searchParams.set("url", "https://example.com/");
      psi.searchParams.set("key", psiKey);
      psi.searchParams.set("strategy", "mobile");
      psi.searchParams.set("category", "performance");
      const check = await fetch(psi, { signal: AbortSignal.timeout(20000) });
      if (!check.ok) throw new Error("Google PageSpeed API 验证失败（HTTP " + check.status + "），请检查 API Key 和 API 启用状态。");
      await admin.from("platform_provider_connections").update({ status: "verified", last_tested_at: now(), last_error_code: null, updated_at: now() })
        .eq("organization_id", org).in("provider_key", ["dataforseo", "google_pagespeed"]);
      return reply({ success: true, message: "DataForSEO 与 Google PageSpeed 连接均已验证。" });
    }

    if (body.action === "list_history") {
      const { data, error } = await admin.from("market_trend_tasks").select("id,title,status,result_count,created_at,error_message,actor_meta,input_snapshot")
        .eq("organization_id", org).eq("task_type", "seo_audit").is("deleted_at", null)
        .order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return reply({ history: data || [] });
    }
    if (body.action === "get_history" || body.action === "poll_task") {
      const id = String(body.task_id || "");
      const { data: task, error } = await admin.from("market_trend_tasks")
        .select("id,title,status,actor_run_id,input_snapshot,raw_items,result_count,actor_meta,error_message,created_at")
        .eq("id", id).eq("organization_id", org).eq("task_type", "seo_audit").maybeSingle();
      if (error) throw error;
      if (!task) return reply({ error: "找不到该诊断任务，或当前账号无权查看。" }, 404);
      if (body.action === "get_history") return reply({ task });
      if (task.status !== "running") return reply({ task });
      const credentials = splitDataForSeo(await getCredential(admin, org, "dataforseo"));
      const providerTaskId = String(task.actor_run_id || "");
      const response = await dataForSeoRequest(credentials.login, credentials.password, "/v3/on_page/task_get/advanced/" + encodeURIComponent(providerTaskId));
      const providerTask = response?.tasks?.[0];
      const providerResult = providerTask?.result?.[0];
      const providerCode = Number(providerTask?.status_code || 0);
      if (providerCode >= 40000 && providerCode !== 40601) {
        const message = "DataForSEO 爬取失败：" + String(providerTask?.status_message || providerTask?.status_code || "未知错误");
        await admin.from("market_trend_tasks").update({ status: "failed", error_message: message, completed_at: now(), updated_at: now() }).eq("id", task.id);
        return reply({ task: { ...task, status: "failed", error_message: message } });
      }
      if (!providerResult || !Array.isArray(providerResult.items)) {
        return reply({ task, progress: providerTask?.data?.crawl_progress || providerTask?.status_message || "DataForSEO 正在抓取网站" });
      }
      const pages = providerResult.items.slice(0, Number(task.input_snapshot?.max_pages || 500));
      const target = String(task.input_snapshot?.target || "");
      const pageLimit = Number(task.input_snapshot?.pagespeed_limit || 10);
      const urls = [...new Set([target, ...pages.map((p: any) => pageUrl(p, target))])].slice(0, pageLimit);
      const meta = { ...(task.actor_meta || {}) } as Record<string, any>;
      if (!Array.isArray(meta.pagespeed_results)) meta.pagespeed_results = [];
      if (!Array.isArray(meta.pagespeed_queue)) {
        meta.pagespeed_queue = urls.flatMap(url => [{ url, strategy: "mobile" }, { url, strategy: "desktop" }]);
      }
      let psiKey: string | null = null;
      if (!meta.pagespeed_unavailable) {
        try { psiKey = await getCredential(admin, org, "google_pagespeed"); }
        catch { meta.pagespeed_unavailable = true; }
      }
      let processed = 0;
      if (!meta.pagespeed_unavailable && psiKey) {
        while (meta.pagespeed_queue.length && processed < 2) {
          const next = meta.pagespeed_queue.shift();
          try {
            const result = await pageSpeed(next.url, psiKey, next.strategy);
            meta.pagespeed_results.push(result);
          } catch (error) {
            meta.pagespeed_results.push({ url: next.url, strategy: next.strategy, error: error instanceof Error ? error.message : "PageSpeed 请求失败" });
          }
          processed++;
        }
      } else {
        meta.pagespeed_queue = [];
      }
      const completed = meta.pagespeed_queue.length === 0;
      if (!completed) {
        await admin.from("market_trend_tasks").update({ actor_meta: meta, updated_at: now() }).eq("id", task.id);
        return reply({ task: { ...task, actor_meta: meta }, progress: "PageSpeed 已完成 " + meta.pagespeed_results.length + " / " + (urls.length * 2) + " 项检测" });
      }
      const speedResults = meta.pagespeed_results.filter((x: any) => !x.error);
      const report = makeReport(pages, speedResults, target, Number(task.input_snapshot?.max_pages || 500));
      meta.report = report;
      meta.pagespeed_unavailable = !!meta.pagespeed_unavailable;
      const status = meta.pagespeed_unavailable || !speedResults.length ? "partial" : "succeeded";
      const errorMessage = meta.pagespeed_unavailable ? "PageSpeed 未配置或不可用；已完成 DataForSEO 网站爬取，性能维度未纳入评分。" :
        speedResults.length < urls.length * 2 ? "部分 PageSpeed 页面检测失败，报告已按实际覆盖范围计算。" : null;
      const { data: updated, error: updateError } = await admin.from("market_trend_tasks").update({
        status, raw_items: pages, result_count: pages.length, actor_meta: meta,
        error_message: errorMessage, completed_at: now(), updated_at: now(),
      }).eq("id", task.id).select("id,title,status,result_count,actor_meta,error_message,input_snapshot,raw_items,created_at").single();
      if (updateError) throw updateError;
      return reply({ task: updated });
    }

    if (body.action === "start") {
      const target = await parseTarget(body.url);
      const maxPages = clamp(body.max_pages, 1, 500, 500);
      const pageSpeedLimit = clamp(body.pagespeed_limit, 1, 10, 10);
      const market = String(body.market || "US").toUpperCase();
      if (!/^(GLOBAL|[A-Z]{2})$/.test(market)) return reply({ error: "目标市场必须为 ISO 两位国家代码或 GLOBAL。" }, 400);
      const credentials = splitDataForSeo(await getCredential(admin, org, "dataforseo"));
      const { data: task, error: insertError } = await admin.from("market_trend_tasks").insert({
        organization_id: org, created_by: user.id, actor_id: "dataforseo/on_page",
        task_type: "seo_audit", title: "SEO 诊断：" + target,
        status: "running",
        input_snapshot: { target, market, max_pages: maxPages, pagespeed_limit: pageSpeedLimit },
        raw_items: [], result_count: 0, actor_meta: { provider: "DataForSEO OnPage", stage: "submitting", pagespeed_results: [] },
        started_at: now(),
      }).select("id").single();
      if (insertError) throw insertError;
      try {
        const submitted = await dataForSeoRequest(credentials.login, credentials.password, "/v3/on_page/task_post", [{
          target: (new URL(target).hostname.toLowerCase().startsWith("www.") ? new URL(target).hostname.slice(4) : new URL(target).hostname), max_crawl_pages: maxPages,
          start_url: target, max_crawl_depth: 10, load_resources: true, enable_javascript: false,
          store_raw_html: false, enable_browser_rendering: false,
        }]);
        const taskInfo = submitted?.tasks?.[0];
        const providerId = taskInfo?.id;
        if (!providerId) throw new Error("DataForSEO 未返回有效任务 ID：" + String(taskInfo?.status_message || "未知错误"));
        const meta = { provider: "DataForSEO OnPage", stage: "crawling", provider_status: taskInfo.status_message || "Queued" };
        const { error: updateError } = await admin.from("market_trend_tasks").update({
          actor_run_id: providerId, actor_meta: meta, updated_at: now(),
        }).eq("id", task.id);
        if (updateError) throw updateError;
        return reply({ task_id: task.id, status: "running", provider_task_id: providerId });
      } catch (error) {
        const message = error instanceof Error ? error.message : "DataForSEO 任务启动失败。";
        await admin.from("market_trend_tasks").update({ status: "failed", error_message: message, completed_at: now(), updated_at: now() }).eq("id", task.id);
        return reply({ error: message, task_id: task.id }, 502);
      }
    }
    return reply({ error: "不支持的操作类型。" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "SEO 诊断服务发生未知错误。";
    return reply({ error: message }, Number((error as any)?.status) || 400);
  }
});