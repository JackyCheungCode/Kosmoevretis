import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const fail = (message: string, status = 400) => reply({ error: message }, status);
const adapters: Record<string, { functionName: string; kind: string; channel: string }> = {
  "google-trends": { functionName: "market-trends", kind: "search_trend", channel: "搜索引擎" },
  "google-news": { functionName: "google-news-rss", kind: "article", channel: "新闻媒体" },
  amazon: { functionName: "ecommerce-discovery", kind: "product_listing", channel: "电商平台" },
  walmart: { functionName: "ecommerce-discovery", kind: "product_listing", channel: "电商平台" },
  ebay: { functionName: "ecommerce-discovery", kind: "product_listing", channel: "电商平台" },
  "mercado-libre": { functionName: "ecommerce-discovery", kind: "product_listing", channel: "电商平台" },
  x: { functionName: "platform-data-collection", kind: "social_post", channel: "社交媒体" },
  reddit: { functionName: "platform-data-collection", kind: "social_post", channel: "社区论坛" },
  pinterest: { functionName: "platform-data-collection", kind: "social_post", channel: "社交媒体" },
  tiktok: { functionName: "platform-data-collection", kind: "social_post", channel: "社交媒体" },
  youtube: { functionName: "platform-data-collection", kind: "social_post", channel: "视频平台" },
  instagram: { functionName: "instagram-discovery", kind: "social_post", channel: "社交媒体" },
  facebook: { functionName: "facebook-discovery", kind: "social_post", channel: "社交媒体" },
  linkedin: { functionName: "linkedin-discovery", kind: "social_post", channel: "社交媒体" },
};
const ecomDomains: Record<string, Record<string, string>> = {
  amazon: { US:"www.amazon.com", GB:"www.amazon.co.uk", DE:"www.amazon.de", JP:"www.amazon.co.jp", CA:"www.amazon.ca", AU:"www.amazon.com.au" },
  walmart: { US:"www.walmart.com", CA:"www.walmart.ca" },
  ebay: { US:"www.ebay.com", GB:"www.ebay.co.uk", DE:"www.ebay.de", AU:"www.ebay.com.au" },
  "mercado-libre": { MX:"www.mercadolibre.com.mx", AR:"www.mercadolibre.com.ar", BR:"www.mercadolivre.com.br", CO:"www.mercadolibre.com.co", CL:"www.mercadolibre.cl" },
};
const newsLocales: Record<string,{hl:string;gl:string;ceid:string}> = {
  US:{hl:"en-US",gl:"US",ceid:"US:en"},GB:{hl:"en-GB",gl:"GB",ceid:"GB:en"},CA:{hl:"en-CA",gl:"CA",ceid:"CA:en"},
  AU:{hl:"en-AU",gl:"AU",ceid:"AU:en"},DE:{hl:"de-DE",gl:"DE",ceid:"DE:de"},JP:{hl:"ja-JP",gl:"JP",ceid:"JP:ja"},
  FR:{hl:"fr-FR",gl:"FR",ceid:"FR:fr"},ES:{hl:"es-ES",gl:"ES",ceid:"ES:es"},IT:{hl:"it-IT",gl:"IT",ceid:"IT:it"},
  BR:{hl:"pt-BR",gl:"BR",ceid:"BR:pt-419"},MX:{hl:"es-419",gl:"MX",ceid:"MX:es-419"},CN:{hl:"zh-CN",gl:"CN",ceid:"CN:zh-Hans"},
};
const decodeXml = (value:string) => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim();
const readXmlTag = (xml:string,tag:string) => { const match=xml.match(new RegExp("<"+tag+"(?:\\s[^>]*)?>([\\s\\S]*?)</"+tag+">","i"));return match?decodeXml(match[1]):""; };
async function collectGoogleNews(keywords:string[],markets:string[]) {
  const targets=markets.slice(0,8);
  const results=await Promise.allSettled(targets.map(async market=>{
    const locale=newsLocales[market==="CN-MAINLAND"?"CN":market]||{hl:"en-US",gl:market.slice(0,2)||"US",ceid:(market.slice(0,2)||"US")+":en"};
    const query=keywords.map(term=>'"'+term.replace(/"/g,"")+'"').join(" OR ");
    const params=new URLSearchParams({q:query,hl:locale.hl,gl:locale.gl,ceid:locale.ceid});
    const response=await fetch("https://news.google.com/rss/search?"+params.toString(),{headers:{Accept:"application/rss+xml, application/xml, text/xml","User-Agent":"KosmoevretisGlobalIntelligence/1.0"}});
    if(!response.ok)throw new Error(market+" Google News RSS 请求失败（HTTP "+response.status+"）。");
    const xml=await response.text();
    const items=[...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0,40).map(match=>{
      const block=match[0],sourceTag=block.match(/<source\b[^>]*url=["']([^"']+)["'][^>]*>/i);
      return {
        title:readXmlTag(block,"title"),url:readXmlTag(block,"link"),description:readXmlTag(block,"description"),
        published_at:readXmlTag(block,"pubDate"),publisher:readXmlTag(block,"source"),
        publisher_url:sourceTag?decodeXml(sourceTag[1]):"",market_code:market,language:locale.hl,
        search_query:keywords.join(" OR "),provider:"Google News RSS",
      };
    }).filter(item=>item.title&&item.url);
    return {market,result_count:items.length,items};
  }));
  const completed=results.filter((item):item is PromiseFulfilledResult<{market:string;result_count:number;items:any[]}>=>item.status==="fulfilled");
  const failed=results.filter((item):item is PromiseRejectedResult=>item.status==="rejected").map(item=>item.reason instanceof Error?item.reason.message:"Google News 请求失败。");
  return {
    status:completed.length===targets.length&&completed.length>0?"succeeded":completed.length?"partial":"failed",
    results:completed.flatMap(item=>item.value.items),
    error_message:failed.length?failed.join("；"):null,
    actor_meta:{provider:"Google News RSS",markets_queried:targets,market_runs:completed.map(item=>({market:item.value.market,result_count:item.value.result_count})),errors:failed},
  };
}
const uuidPattern = /^[0-9a-f-]{36}$/i;
const cleanList = (value: unknown, max = 12) => Array.isArray(value)
  ? [...new Set(value.map(item => String(item).trim()).filter(Boolean))].slice(0, max) : [];
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const stringValue = (value: unknown) => value == null ? "" : typeof value === "string" ? value : String(value);
const firstValue = (item: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = item[key];
    if (value != null && String(value).trim() !== "") return value;
  }
  return null;
};
const numericValue = (value: unknown) => {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : null;
};
async function hash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
function normalizeEvidence(source: { id: string; slug: string; channel: string }, kind: string, markets: string[], items: unknown[]) {
  return items.slice(0, 500).map((value: unknown) => {
    const item = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const title = stringValue(firstValue(item, ["title", "name", "productTitle", "productName", "keyword", "caption", "fullText", "text", "description"])).slice(0, 1200);
    const content = stringValue(firstValue(item, ["fullText", "text", "description", "caption", "summary", "content", "snippet"])).slice(0, 12000);
    const url = stringValue(firstValue(item, ["url", "permalink", "productUrl", "product_url", "webVideoUrl", "videoUrl", "postUrl", "canonicalUrl"])).slice(0, 2000) || null;
    const market = stringValue(firstValue(item, ["market_code", "geo", "countryCode", "country_code", "country"]) || markets[0] || "").toUpperCase().slice(0, 16) || null;
    const price = numericValue(firstValue(item, ["price", "currentPrice", "priceValue", "amount"]));
    const rank = numericValue(firstValue(item, ["rank", "position", "bestSellerRank", "bsr", "ranking"]));
    const rating = numericValue(firstValue(item, ["rating", "stars", "averageRating", "score"]));
    const reviewCount = numericValue(firstValue(item, ["reviewCount", "review_count", "ratingsCount", "numReviews"]));
    const metrics: Record<string, unknown> = {};
    for (const key of ["views", "viewCount", "playCount", "likes", "likeCount", "diggCount", "comments", "commentCount", "shareCount", "shares", "followers", "followerCount", "interest_over_time", "interest_by_region", "related_queries", "related_topics", "published_at", "publisher", "publisher_url", "search_query"]) {
      if (item[key] !== undefined) metrics[key] = item[key];
    }
    if (kind === "search_trend") {
      metrics.interest_over_time = item.interest_over_time ?? item.interestOverTime ?? [];
      metrics.interest_by_region = item.interest_by_region ?? item.interestByRegion ?? [];
      metrics.related_queries = item.related_queries ?? item.relatedQueries ?? {};
      metrics.related_topics = item.related_topics ?? item.relatedTopics ?? {};
    }
    const raw = JSON.parse(JSON.stringify(item));
    const identity = url || title || JSON.stringify(raw).slice(0, 4000);
    return {
      source_id: source.id, source_slug: source.slug, channel: source.channel || source.slug,
      evidence_kind: kind, evidence_type: "observed", title, content_text: content, source_url: url,
      market_code: market, language: stringValue(firstValue(item, ["language", "lang"]) || "") || null,
      currency: stringValue(firstValue(item, ["currency", "currencyCode"]) || "") || null,
      price, rank_value: rank, rating, review_count: reviewCount,
      metrics, raw_payload: raw, identity,
    };
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("Method not allowed", 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return fail("请先登录企业工作区。", 401);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser(authorization.slice(7));
    if (authError || !authData.user) return fail("登录状态已失效，请重新登录。", 401);
    const user = authData.user;
    const body = await req.json();
    const organizationId = String(body.organization_id || "");
    if (!uuidPattern.test(organizationId)) return fail("组织信息无效。");
    const { data: membership, error: membershipError } = await admin.from("organization_members")
      .select("role").eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership || membership.role === "viewer") return fail("当前账号没有执行全球情报任务的权限。", 403);

    const action = String(body.action || "");
    if (action === "list_history") {
      const { data, error } = await admin.from("market_trend_tasks")
        .select("id,title,status,result_count,created_at,input_snapshot,actor_meta,error_message")
        .eq("organization_id", organizationId).eq("task_type", "global_intelligence")
        .is("deleted_at", null).order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return reply({ history: data || [] });
    }

    if (action === "create_task") {
      const sourceIds = cleanList(body.source_ids, 20);
      const keywords = cleanList(body.keywords, 12);
      const markets = cleanList(body.markets, 30);
      const period = String(body.period || "12m");
      if (!sourceIds.length) return fail("请至少选择一个可执行的数据源。");
      if (!keywords.length) return fail("请至少输入一个分析关键词。");
      if (!markets.length) return fail("请至少选择一个目标市场。");
      if (!["30d", "90d", "12m", "5y"].includes(period)) return fail("不支持的分析时间范围。");
      const { data: sources, error: sourceError } = await admin.from("intelligence_data_sources")
        .select("id,slug,name,channel").in("id", sourceIds).eq("is_active", true);
      if (sourceError) throw sourceError;
      if (!sources?.length || sources.length !== sourceIds.length) return fail("部分数据源不存在或已停用，请刷新后重试。");
      if (sources.some(source => source.slug !== "google-news")) {
        const { data: provider, error: providerError } = await admin.from("platform_provider_connections")
          .select("is_enabled,status").eq("organization_id", organizationId).eq("provider_key", "apify").maybeSingle();
        if (providerError) throw providerError;
        if (!provider?.is_enabled || provider.status !== "verified") return fail("所选平台需要 Apify。请先到设置中心完成凭证配置与连接测试；Google News RSS 无需 Apify。");
      }
      const unsupported = sources.filter(source => !adapters[source.slug]);
      if (unsupported.length) return fail("以下数据源尚未接入实时采集接口：" + unsupported.map(source => source.name).join("、"));
      const productId = body.product_id && uuidPattern.test(String(body.product_id)) ? String(body.product_id) : null;
      if (productId) {
        const { data: product, error: productError } = await admin.from("products").select("id")
          .eq("id", productId).eq("organization_id", organizationId).maybeSingle();
        if (productError) throw productError;
        if (!product) return fail("所选产品不属于当前企业工作区。", 403);
      }
      const snapshot = body.analysis_snapshot && typeof body.analysis_snapshot === "object" ? body.analysis_snapshot : {};
      const title = String(snapshot.product_name || keywords[0] || "全球市场情报").slice(0, 200);
      const { data: task, error: taskError } = await admin.from("market_trend_tasks").insert({
        organization_id: organizationId, created_by: user.id, actor_id: "kosmoevretis/global-intelligence",
        task_type: "global_intelligence", title, status: "running", result_count: 0,
        input_snapshot: {
          ...snapshot, product_id: productId, keywords, markets, period,
          selected_source_ids: sources.map(source => source.id),
          selected_source_slugs: sources.map(source => source.slug),
          source: "Kosmoevretis Global Intelligence",
        },
        actor_meta: { pipeline_version: "1.0", source_runs: [] },
        started_at: new Date().toISOString(),
      }).select("id,title,status,created_at").single();
      if (taskError) throw taskError;
      const { error: sourceRowsError } = await admin.from("market_intelligence_task_sources").insert(sources.map(source => ({
        task_id: task.id, organization_id: organizationId, source_id: source.id,
        source_slug: source.slug, status: "queued",
      })));
      if (sourceRowsError) throw sourceRowsError;
      return reply({ task_id: task.id, task, sources });
    }

    if (action === "collect_source") {
      const taskId = String(body.task_id || "");
      const sourceId = String(body.source_id || "");
      if (!uuidPattern.test(taskId) || !uuidPattern.test(sourceId)) return fail("任务或数据源编号无效。");
      const { data: task, error: taskError } = await admin.from("market_trend_tasks")
        .select("id,organization_id,status,input_snapshot").eq("id", taskId)
        .eq("organization_id", organizationId).eq("task_type", "global_intelligence").maybeSingle();
      if (taskError) throw taskError;
      if (!task) return fail("找不到该任务，或当前账号无权访问。", 404);
      if (task.status !== "running") return fail("该任务已结束，不能继续添加采集结果。", 409);
      const { data: source, error: sourceError } = await admin.from("intelligence_data_sources")
        .select("id,slug,name,channel").eq("id", sourceId).eq("is_active", true).maybeSingle();
      if (sourceError) throw sourceError;
      if (!source || !adapters[source.slug]) return fail("该数据源尚未接入实时采集接口。", 400);
      const adapter = adapters[source.slug];
      const { data: priorSource } = await admin.from("market_intelligence_task_sources").select("status,result_count").eq("task_id",taskId).eq("source_id",source.id).maybeSingle();
      if (priorSource && ["succeeded","partial"].includes(priorSource.status)) return reply({source_id:source.id,source_slug:source.slug,status:priorSource.status,result_count:priorSource.result_count,already_completed:true});
      if (priorSource?.status === "running") return fail("该数据源正在执行，不能重复启动。",409);
      if (source.slug !== "google-news") {
        const { data: provider, error: providerError } = await admin.from("platform_provider_connections").select("is_enabled,status").eq("organization_id",organizationId).eq("provider_key","apify").maybeSingle();
        if (providerError) throw providerError;
        if (!provider?.is_enabled || provider.status !== "verified") return fail("Apify 尚未启用或验证，请先到设置中心完成连接测试。");
      }
      const snapshot = task.input_snapshot || {};
      const keywords = cleanList(snapshot.keywords, 12);
      const markets = cleanList(snapshot.markets, 30);
      const period = String(snapshot.period || "12m");
      const startedAt = new Date().toISOString();
      await admin.from("market_intelligence_task_sources").upsert({
        task_id: taskId, organization_id: organizationId, source_id: source.id,
        source_slug: source.slug, status: "running", started_at: startedAt,
        updated_at: startedAt, error_message: null,
      }, { onConflict: "task_id,source_id" });

      const invokeChild = async (functionName: string, payload: Record<string, unknown>) => {
        const response = await fetch(supabaseUrl + "/functions/v1/" + functionName, {
          method: "POST",
          headers: { Authorization: authorization, apikey: anonKey, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result?.error) throw new Error(String(result?.error || "数据源请求失败（HTTP " + response.status + "）。"));
        return result;
      };

      try {
        let result: Record<string, any>;
        if (source.slug === "google-trends") {
          const geo = markets.length === 1 ? (markets[0] === "CN-MAINLAND" ? "CN" : markets[0]) : "";
          result = await invokeChild("market-trends", {
            organization_id: organizationId, keywords, geo, period, markets,
            analysis_snapshot: { ...(snapshot || {}), title: task.title, active_tab: "search" },
          });
        } else if (source.slug === "google-news") {
          result = await collectGoogleNews(keywords, markets);
        } else if (adapter.kind === "product_listing") {
          const marketDomains=ecomDomains[source.slug]||{};
          const marketTargets=markets.filter(market=>marketDomains[market]).slice(0,5);
          if (!marketTargets.length) throw new Error("所选市场暂不支持 "+source.name+" 关键词采集。请改选该平台支持的国家 / 地区站点。");
          const marketRuns=await Promise.allSettled(marketTargets.map(async market=>{
            let child=await invokeChild("ecommerce-discovery",{
              action:"collect",organization_id:organizationId,platform:source.slug,
              mode:"keyword",input_values:keywords,marketplace:marketDomains[market],max_results:50,
            });
            const childTaskId=child.task_id;
            if(child.status==="running"&&childTaskId){
              for(let attempt=0;attempt<42;attempt+=1){
                await delay(2000);
                child=await invokeChild("ecommerce-discovery",{action:"poll_task",organization_id:organizationId,platform:source.slug,task_id:childTaskId});
                if(child.status!=="running")break;
              }
            }
            if(child.status==="running")throw new Error(market+" 电商采集仍在执行，请稍后查看子任务。");
            if(child.status==="failed")throw new Error(market+" 电商采集失败："+String(child.error_message||"Actor 未返回结果。"));
            return {market,marketplace:marketDomains[market],task_id:childTaskId,status:child.status||"succeeded",results:(Array.isArray(child.results)?child.results:[]).map((item:any)=>({...item,market_code:market})),actor_meta:child.actor_meta?{run_id:child.actor_meta.run_id||child.actor_meta.actor_run_id||null,dataset_id:child.actor_meta.dataset_id||null,usage_total_usd:child.actor_meta.usage_total_usd??null}:null};
          }));
          const fulfilled=marketRuns.filter((run):run is PromiseFulfilledResult<any>=>run.status==="fulfilled");
          const rejected=marketRuns.filter((run):run is PromiseRejectedResult=>run.status==="rejected").map(run=>run.reason instanceof Error?run.reason.message:"电商市场采集失败。");
          const marketResults=fulfilled.flatMap(run=>run.value.results);
          if(!fulfilled.length)throw new Error(rejected.join("；")||"所选电商市场均未返回结果。");
          result={status:rejected.length||fulfilled.some(run=>run.value.status==="partial")?"partial":"succeeded",results:marketResults,task_id:fulfilled[0].value.task_id,actor_meta:{market_runs:fulfilled.map(run=>({market:run.value.market,marketplace:run.value.marketplace,task_id:run.value.task_id,status:run.value.status,result_count:run.value.results.length,actor_meta:run.value.actor_meta})),skipped_markets:markets.filter(market=>!marketDomains[market]),errors:rejected},error_message:rejected.length?rejected.join("；"):null};
        } else if (source.slug === "instagram") {
          result = await invokeChild("instagram-discovery", {
            action: "collect", organization_id: organizationId, discovery_type: "hashtags",
            keywords, max_results: 50,
          });
        } else if (source.slug === "facebook") {
          result = await invokeChild("facebook-discovery", {
            action: "collect", organization_id: organizationId, search_terms: keywords,
            search_type: "posts", max_results: 50,
          });
        } else if (source.slug === "linkedin") {
          result = await invokeChild("linkedin-discovery", {
            action: "collect", organization_id: organizationId, discovery_type: "posts",
            search_terms: keywords, max_results: 50, date_range: "month",
          });
        } else {
          result = await invokeChild("platform-data-collection", {
            action: "collect", organization_id: organizationId, platform: source.slug,
            mode: "search", targets: keywords, max_results: 50,
            options: { region: markets[0] || "US", comments: true, insights: true },
          });
        }

        const rawItems = Array.isArray(result.results) ? result.results : [];
        const normalized = normalizeEvidence(source, adapter.kind, markets, rawItems);
        const evidenceRows = await Promise.all(normalized.map(async row => ({
          task_id: taskId, organization_id: organizationId, ...row,
          evidence_hash: await hash(source.slug + "|" + row.identity),
        })));
        for (let offset = 0; offset < evidenceRows.length; offset += 100) {
          const batch = evidenceRows.slice(offset, offset + 100).map(({ identity: _identity, ...row }) => row);
          if (batch.length) {
            const { error: evidenceError } = await admin.from("market_intelligence_evidence")
              .upsert(batch, { onConflict: "task_id,source_slug,evidence_hash" });
            if (evidenceError) throw evidenceError;
          }
        }
        const status = result.status === "partial" || rawItems.length === 0 ? "partial" : "succeeded";
        const completedAt = new Date().toISOString();
        const { error: sourceUpdateError } = await admin.from("market_intelligence_task_sources").update({
          status, child_task_id: result.task_id || null, result_count: rawItems.length,
          run_meta: { function_name: adapter.functionName, child_status: result.status || "succeeded", actor_meta: result.actor_meta ? { provider: result.actor_meta.provider || null, markets_queried: result.actor_meta.markets_queried || null, market_runs: result.actor_meta.market_runs || null, errors: result.actor_meta.errors || null } : null, evidence_count: evidenceRows.length },
          error_message: result.error_message || (rawItems.length ? null : "数据源已执行，但没有返回可用记录。"),
          completed_at: completedAt, updated_at: completedAt,
        }).eq("task_id", taskId).eq("source_id", source.id);
        if (sourceUpdateError) throw sourceUpdateError;
        return reply({ source_id: source.id, source_slug: source.slug, status, result_count: rawItems.length, evidence_count: evidenceRows.length, child_task_id: result.task_id || null, results: rawItems });
      } catch (error) {
        const message = error instanceof Error ? error.message : "数据源采集失败。";
        await admin.from("market_intelligence_task_sources").update({
          status: "failed", error_message: message, completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq("task_id", taskId).eq("source_id", source.id);
        return reply({ source_id: source.id, source_slug: source.slug, status: "failed", error: message }, 502);
      }
    }

    if (action === "finish_task") {
      const taskId = String(body.task_id || "");
      if (!uuidPattern.test(taskId)) return fail("任务编号无效。");
      const { data: task, error: taskError } = await admin.from("market_trend_tasks")
        .select("id,status").eq("id", taskId).eq("organization_id", organizationId)
        .eq("task_type", "global_intelligence").maybeSingle();
      if (taskError) throw taskError;
      if (!task) return fail("找不到该任务，或当前账号无权访问。", 404);
      const { data: rows, error: rowsError } = await admin.from("market_intelligence_task_sources")
        .select("source_slug,status,result_count,run_meta,error_message")
        .eq("task_id", taskId).eq("organization_id", organizationId);
      if (rowsError) throw rowsError;
      const sourceRuns = rows || [];
      const succeeded = sourceRuns.filter(row => row.status === "succeeded");
      const partial = sourceRuns.filter(row => row.status === "partial");
      const failed = sourceRuns.filter(row => row.status === "failed" || row.status === "unsupported");
      const pending = sourceRuns.some(row => row.status === "queued" || row.status === "running");
      const count = sourceRuns.reduce((total, row) => total + Number(row.result_count || 0), 0);
      const status = pending ? "running" : succeeded.length && !partial.length && !failed.length ? "succeeded" : succeeded.length || partial.length ? "partial" : "failed";
      const completedAt = new Date().toISOString();
      const { error: updateError } = await admin.from("market_trend_tasks").update({
        status, result_count: count,
        actor_meta: { pipeline_version: "1.0", source_runs: sourceRuns, evidence_count: count },
        error_message: status === "failed" ? "所有已选数据源均未能返回结果。" : failed.length ? failed.map(row => row.source_slug + "：" + (row.error_message || "采集失败")).join("；") : null,
        completed_at: pending ? null : completedAt, updated_at: completedAt,
      }).eq("id", taskId);
      if (updateError) throw updateError;
      return reply({ task_id: taskId, status, result_count: count, sources: sourceRuns });
    }

    if (action === "get_history") {
      const taskId = String(body.task_id || "");
      if (!uuidPattern.test(taskId)) return fail("任务编号无效。");
      const { data: task, error: taskError } = await admin.from("market_trend_tasks")
        .select("id,title,status,result_count,created_at,completed_at,input_snapshot,actor_meta,error_message")
        .eq("id", taskId).eq("organization_id", organizationId).eq("task_type", "global_intelligence").maybeSingle();
      if (taskError) throw taskError;
      if (!task) return fail("找不到该任务，或当前账号无权查看。", 404);
      const [{ data: sources, error: sourceError }, { data: evidence, error: evidenceError }] = await Promise.all([
        admin.from("market_intelligence_task_sources").select("*").eq("task_id", taskId).eq("organization_id", organizationId).order("created_at"),
        admin.from("market_intelligence_evidence").select("*").eq("task_id", taskId).eq("organization_id", organizationId).order("collected_at", { ascending: false }).limit(500),
      ]);
      if (sourceError) throw sourceError;
      if (evidenceError) throw evidenceError;
      return reply({ task, sources: sources || [], evidence: evidence || [] });
    }

    return fail("不支持的操作类型。");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "全球情报任务失败。", 500);
  }
});
