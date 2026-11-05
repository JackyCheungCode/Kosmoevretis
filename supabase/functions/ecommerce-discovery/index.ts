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
const ACTOR_ID = "apify/e-commerce-scraping-tool";
const PLATFORMS = ["amazon", "walmart", "ebay", "aliexpress", "temu", "etsy", "shopify", "mercado-libre", "rakuten"];
const MODES = ["keyword", "details", "listing", "reviews", "sellers"];
const KEYWORD_PLATFORMS = ["amazon", "walmart", "ebay", "mercado-libre"];

async function decrypt(ciphertext: string, iv: string) {
  const secret = Deno.env.get("SETTINGS_ENCRYPTION_KEY");
  if (!secret || secret.length < 32) throw new Error("服务端凭证解密密钥未配置。");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["decrypt"]);
  const raw = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0));
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw(iv) }, key, raw(ciphertext));
  return new TextDecoder().decode(clear);
}
const cleanList = (value: unknown, max = 50) => Array.isArray(value)
  ? [...new Set(value.map(item => String(item).trim()).filter(Boolean))].slice(0, max)
  : [];
const isHttpUrl = (value: string) => {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol); }
  catch { return false; }
};
async function readDataset(datasetId: string, token: string, limit: number) {
  const url = "https://api.apify.com/v2/datasets/" + encodeURIComponent(datasetId)
    + "/items?format=json&clean=true&offset=0&limit=" + encodeURIComponent(String(limit));
  const response = await fetch(url, { headers: { Authorization: "Bearer " + token } });
  if (!response.ok) throw new Error("读取 Apify Dataset 失败（HTTP " + response.status + "）。");
  const items = await response.json();
  if (!Array.isArray(items)) throw new Error("Apify Dataset 返回格式无效。");
  return items as Record<string, unknown>[];
}
function buildActorInput(body: Record<string, unknown>, platform: string, mode: string, values: string[]) {
  const limit = Math.min(500, Math.max(1, Number(body.max_results) || 50));
  const marketplace = String(body.marketplace || "").trim();
  const includeAdditional = body.include_additional !== false;
  if (mode === "keyword") {
    if (platform === "shopify") throw new Error("Shopify 独立站请使用店铺或商品列表 URL。");
    if (!marketplace) throw new Error("请先选择目标市场站点。");
    return {
      keyword: values.join("\n"),
      marketplaces: [marketplace],
      maxProductResults: limit,
      additionalProperties: includeAdditional,
      deduplicateProducts: body.deduplicate !== false,
    };
  }
  if (mode === "details" || mode === "listing" || mode === "sellers" || (mode === "reviews" && values.every(isHttpUrl))) {
    if (!values.every(isHttpUrl)) throw new Error("当前模式仅接受完整的 http(s) URL。");
  }
  if (mode === "details") return {
    detailsUrls: values.map(url => ({ url })), maxProductResults: limit,
    additionalProperties: includeAdditional, deduplicateProducts: body.deduplicate !== false,
  };
  if (mode === "listing") return {
    listingUrls: values.map(url => ({ url })), maxProductResults: limit,
    additionalProperties: includeAdditional, deduplicateProducts: body.deduplicate !== false,
  };
  if (mode === "reviews") {
    const isUrls = values.every(isHttpUrl);
    const input: Record<string, unknown> = {
      sortReview: String(body.review_sort || "Most recent"),
      maxReviewResults: limit,
      additionalReviewProperties: includeAdditional,
    };
    if (isUrls) input.reviewDetailsUrls = values.map(url => ({ url }));
    else {
      if (!marketplace) throw new Error("关键词评论采集需要选择目标市场。");
      input.keywordReviews = values.join("\n");
      input.marketplacesReviews = [marketplace];
    }
    return input;
  }
  if (mode === "sellers") return {
    sellerUrls: values.map(url => ({ url })),
    maxSellerResults: limit,
  };
  throw new Error("不支持的电商发现模式。");
}
async function getApifyToken(admin: ReturnType<typeof createClient>, organizationId: string) {
  const { data, error } = await admin.from("platform_provider_connections")
    .select("credential_ciphertext,credential_iv,is_enabled,status")
    .eq("organization_id", organizationId).eq("provider_key", "apify").maybeSingle();
  if (error) throw error;
  if (!data?.is_enabled || data.status !== "verified" || !data.credential_ciphertext || !data.credential_iv) {
    throw new Error("Apify 尚未启用或验证，请先到设置中心完成连接测试。");
  }
  return await decrypt(data.credential_ciphertext, data.credential_iv);
}
async function startActor(input: Record<string, unknown>, token: string) {
  const endpoint = "https://api.apify.com/v2/acts/" + ACTOR_ID.replace("/", "~") + "/runs?waitForFinish=0";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Apify Actor 启动失败（HTTP " + response.status + "）：" + String(payload?.error?.message || payload?.message || "请检查 Actor 权限和输入参数。"));
  const run = payload?.data || {};
  if (!run.id || !run.defaultDatasetId) throw new Error("Apify 未返回有效 Run ID 或 Dataset ID。");
  return run;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  let taskId: string | null = null;
  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return reply({ error: "请先登录企业工作区。" }, 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser(authorization.slice(7));
    if (authError || !authData.user) return reply({ error: "登录状态已失效，请重新登录。" }, 401);
    const user = authData.user;
    const body = await req.json();
    const organizationId = String(body.organization_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(organizationId)) return reply({ error: "组织信息无效。" }, 400);
    const { data: membership, error: membershipError } = await admin.from("organization_members").select("role")
      .eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership || membership.role === "viewer") return reply({ error: "当前账号没有执行电商发现任务的权限。" }, 403);

    const platform = String(body.platform || "");
    if (!PLATFORMS.includes(platform)) return reply({ error: "不支持的电商平台。" }, 400);

    if (body.action === "list_history") {
      const { data, error } = await admin.from("market_trend_tasks")
        .select("id,title,status,result_count,created_at,actor_id,actor_meta,input_snapshot,error_message")
        .eq("organization_id", organizationId).eq("task_type", "ecommerce_discovery")
        .eq("input_snapshot->>platform", platform).is("deleted_at", null)
        .order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return reply({ history: data || [] });
    }
    if (body.action === "get_history") {
      const { data, error } = await admin.from("market_trend_tasks")
        .select("id,title,status,result_count,created_at,actor_id,actor_run_id,dataset_id,actor_meta,input_snapshot,raw_items,error_message")
        .eq("id", String(body.task_id || "")).eq("organization_id", organizationId)
        .eq("task_type", "ecommerce_discovery").eq("input_snapshot->>platform", platform).maybeSingle();
      if (error) throw error;
      if (!data) return reply({ error: "找不到该采集记录，或当前账号无权查看。" }, 404);
      return reply({ history: data });
    }
    if (body.action === "collect") {
      const mode = String(body.mode || "");
      if (!MODES.includes(mode)) return reply({ error: "不支持的电商发现类型。" }, 400);
      const values = cleanList(body.input_values);
      if (!values.length) return reply({ error: "请提供关键词或有效 URL。" }, 400);
      const actorInput = buildActorInput(body, platform, mode, values);
      const title = platform + " " + mode + "：" + values.slice(0, 3).join("、");
      const startedAt = new Date().toISOString();
      const { data: task, error: insertError } = await admin.from("market_trend_tasks").insert({
        organization_id: organizationId, created_by: user.id, actor_id: ACTOR_ID,
        task_type: "ecommerce_discovery", title, status: "running",
        input_snapshot: {
          platform, mode, input_values: values, marketplace: body.marketplace || null,
          max_results: Math.min(500, Math.max(1, Number(body.max_results) || 50)),
          country_code: body.country_code || null, actor_id: ACTOR_ID, actor_input: actorInput,
        },
        actor_meta: { actor_id: ACTOR_ID, actor_status: "starting" },
        started_at: startedAt,
      }).select("id").single();
      if (insertError) throw insertError;
      taskId = task.id;
      try {
        const token = await getApifyToken(admin, organizationId);
        const run = await startActor(actorInput, token);
        const actorMeta = {
          actor_id: ACTOR_ID, run_id: run.id, dataset_id: run.defaultDatasetId,
          status: run.status || "RUNNING", started_at: run.startedAt || startedAt,
          usage_total_usd: run.usageTotalUsd ?? null,
        };
        const { error: updateError } = await admin.from("market_trend_tasks").update({
          actor_run_id: run.id, dataset_id: run.defaultDatasetId, actor_meta: actorMeta, updated_at: new Date().toISOString(),
        }).eq("id", taskId);
        if (updateError) throw updateError;
        return reply({ task_id: taskId, actor_run_id: run.id, status: "running", actor_meta: actorMeta });
      } catch (error) {
        const message = error instanceof Error ? error.message : "启动 Apify Actor 失败。";
        await admin.from("market_trend_tasks").update({
          status: "failed", error_message: message, completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq("id", taskId);
        return reply({ error: message, task_id: taskId }, 502);
      }
    }
    if (body.action === "poll_task") {
      const id = String(body.task_id || "");
      const { data: task, error: taskError } = await admin.from("market_trend_tasks")
        .select("id,status,actor_run_id,dataset_id,actor_meta,input_snapshot,raw_items,result_count,error_message")
        .eq("id", id).eq("organization_id", organizationId).eq("task_type", "ecommerce_discovery")
        .eq("input_snapshot->>platform", platform).maybeSingle();
      if (taskError) throw taskError;
      if (!task) return reply({ error: "找不到该任务，或当前账号无权查看。" }, 404);
      if (task.status !== "running") return reply({
        status: task.status, results: task.raw_items || [], result_count: task.result_count || 0,
        actor_meta: task.actor_meta || null, error_message: task.error_message || null,
      });
      if (!task.actor_run_id || !task.dataset_id) return reply({ status: "running", results: [], result_count: 0 });
      const token = await getApifyToken(admin, organizationId);
      const runResponse = await fetch("https://api.apify.com/v2/actor-runs/" + encodeURIComponent(task.actor_run_id), {
        headers: { Authorization: "Bearer " + token },
      });
      const runPayload = await runResponse.json().catch(() => ({}));
      if (!runResponse.ok) throw new Error("查询 Apify Run 状态失败（HTTP " + runResponse.status + "）。");
      const run = runPayload?.data || {};
      const status = String(run.status || "RUNNING");
      if (["READY", "RUNNING", "TIMING-OUT"].includes(status)) return reply({ status: "running", actor_meta: task.actor_meta || null });
      const completedAt = new Date().toISOString();
      if (status !== "SUCCEEDED") {
        const message = "Apify Actor 执行结束，状态：" + status + "。";
        const actorMeta = { ...(task.actor_meta || {}), status, finished_at: run.finishedAt || completedAt, usage_total_usd: run.usageTotalUsd ?? null };
        await admin.from("market_trend_tasks").update({
          status: "failed", error_message: message, actor_meta: actorMeta,
          completed_at: completedAt, updated_at: completedAt,
        }).eq("id", task.id);
        return reply({ status: "failed", error_message: message, actor_meta: actorMeta, results: [], result_count: 0 });
      }
      const snapshot = task.input_snapshot || {};
      const limit = Math.min(500, Math.max(1, Number(snapshot.max_results) || 50));
      const results = await readDataset(task.dataset_id, token, limit);
      const actorMeta = {
        ...(task.actor_meta || {}), status, finished_at: run.finishedAt || completedAt,
        usage_total_usd: run.usageTotalUsd ?? null, item_count: results.length,
      };
      const finalStatus = results.length ? "succeeded" : "partial";
      const { error: updateError } = await admin.from("market_trend_tasks").update({
        status: finalStatus, raw_items: results, result_count: results.length, actor_meta: actorMeta,
        error_message: results.length ? null : "Actor 已完成，但没有返回数据。",
        completed_at: completedAt, updated_at: completedAt,
      }).eq("id", task.id);
      if (updateError) throw updateError;
      return reply({ status: finalStatus, results, result_count: results.length, actor_meta: actorMeta });
    }
    return reply({ error: "不支持的操作类型。" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "电商发现任务失败。";
    if (taskId) await admin.from("market_trend_tasks").update({
      status: "failed", error_message: message, completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", taskId);
    return reply({ error: message, task_id: taskId }, 502);
  }
});
