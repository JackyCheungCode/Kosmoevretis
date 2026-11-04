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
const fail = (message: string, status = 400) => reply({ error: message }, status);

async function decrypt(ciphertext: string, iv: string) {
  const secret = Deno.env.get("SETTINGS_ENCRYPTION_KEY");
  if (!secret || secret.length < 32) throw new Error("服务端凭证解密密钥未配置。");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["decrypt"]);
  const raw = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw(iv) }, key, raw(ciphertext));
  return new TextDecoder().decode(clear);
}

const ranges: Record<string, string> = {
  "30d": "today 1-m",
  "90d": "today 3-m",
  "12m": "today 12-m",
  "5y": "today 5-y",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  let taskId: string | null = null;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return fail("请先登录企业工作区。", 401);
    const token = authorization.slice(7);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return fail("登录状态已失效，请重新登录。", 401);
    const user = authData.user;

    const body = await req.json();
    const organizationId = String(body.organization_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(organizationId)) return fail("组织信息无效。");
    const { data: membership, error: membershipError } = await admin
      .from("organization_members").select("role")
      .eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership || membership.role === "viewer") return fail("当前账号没有执行市场采集任务的权限。", 403);

    const action = String(body.action || "collect");
    if (action === "list_history") {
      const { data: rows, error: historyError } = await admin.from("market_trend_tasks")
        .select("id,title,status,result_count,created_at,actor_id,actor_meta,input_snapshot,error_message")
        .eq("organization_id", organizationId).eq("task_type", "google_trends")
        .order("created_at", { ascending: false }).limit(20);
      if (historyError) throw historyError;
      return reply({ history: rows || [] });
    }
    if (action === "get_history") {
      const id = String(body.task_id || "");
      if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("采集记录编号无效。");
      const { data: row, error: historyError } = await admin.from("market_trend_tasks")
        .select("id,title,status,result_count,created_at,actor_id,actor_run_id,dataset_id,actor_meta,input_snapshot,raw_items,error_message")
        .eq("id", id).eq("organization_id", organizationId).eq("task_type", "google_trends").maybeSingle();
      if (historyError) throw historyError;
      if (!row) return fail("找不到该采集记录，或当前账号无权查看。", 404);
      return reply({ history: row });
    }
    if (action !== "collect") return fail("不支持的操作类型。");

    const keywords = Array.isArray(body.keywords)
      ? body.keywords.map((v: unknown) => String(v).trim()).filter(Boolean).slice(0, 5)
      : [];
    if (!keywords.length) return fail("请至少提供一个关键词。");
    const geo = String(body.geo || "").trim().toUpperCase();
    if (geo && !/^[A-Z]{2}$/.test(geo)) return fail("国家/地区代码必须为 ISO 两位代码。");
    const period = String(body.period || "12m");
    if (!ranges[period]) return fail("不支持的趋势时间范围。");

    const { data: provider, error: providerError } = await admin
      .from("platform_provider_connections")
      .select("credential_ciphertext,credential_iv,is_enabled,status")
      .eq("organization_id", organizationId).eq("provider_key", "apify").maybeSingle();
    if (providerError) throw providerError;
    if (!provider || !provider.is_enabled || provider.status !== "verified" || !provider.credential_ciphertext || !provider.credential_iv) {
      return fail("Apify 尚未启用或验证，请先到设置中心完成连接测试。", 400);
    }
    const apifyToken = await decrypt(provider.credential_ciphertext, provider.credential_iv);
    const actorId = "surefetch/google-trends";
    const actorInput = {
      geo,
      category: 0,
      keywords,
      maxItems: 100,
      property: "",
      operation: "keywords",
      timeRange: ranges[period],
    };
    const now = new Date().toISOString();
    const title = "Google Trends：" + keywords.join("、");
    const { data: task, error: insertError } = await admin.from("market_trend_tasks").insert({
      organization_id: organizationId,
      created_by: user.id,
      actor_id: actorId,
      task_type: "google_trends",
      title,
      status: "running",
      input_snapshot: {
        keywords, geo, period, timeRange: ranges[period], actorInput,
        source: "Apify / surefetch/google-trends",
        evidence_type: "observed",
      },
      started_at: now,
    }).select("id").single();
    if (insertError) throw insertError;
    taskId = task.id;

    const runResponse = await fetch(
      "https://api.apify.com/v2/acts/surefetch~google-trends/runs?waitForFinish=120",
      {
        method: "POST",
        headers: { Authorization: "Bearer " + apifyToken, "Content-Type": "application/json" },
        body: JSON.stringify(actorInput),
      },
    );
    const runPayload = await runResponse.json().catch(() => ({}));
    if (!runResponse.ok) {
      throw new Error("Google Trends Actor 启动失败（HTTP " + runResponse.status + "）：" +
        String(runPayload?.error?.message || runPayload?.message || "请检查 Actor 权限和输入参数。"));
    }
    const run = runPayload?.data || {};
    const runId = String(run.id || "");
    const datasetId = String(run.defaultDatasetId || "");
    if (!runId || !datasetId) throw new Error("Apify 未返回有效的运行 ID 或 Dataset ID。");
    if (run.status !== "SUCCEEDED") {
      await admin.from("market_trend_tasks").update({
        actor_run_id: runId, dataset_id: datasetId, status: "failed",
        actor_meta: run, error_message: "Actor 执行状态：" + String(run.status || "UNKNOWN"),
        completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", taskId);
      return reply({ error: "Google Trends 采集未成功完成。", task_id: taskId, actor_status: run.status }, 502);
    }

    const itemsResponse = await fetch(
      "https://api.apify.com/v2/datasets/" + encodeURIComponent(datasetId) + "/items?format=json&clean=true",
      { headers: { Authorization: "Bearer " + apifyToken } },
    );
    if (!itemsResponse.ok) throw new Error("读取 Apify Dataset 失败（HTTP " + itemsResponse.status + "）。");
    const rawItems = await itemsResponse.json();
    if (!Array.isArray(rawItems)) throw new Error("Apify Dataset 返回格式不是数组。");
    const normalized = rawItems.map((item: Record<string, unknown>) => {
      const record = item && typeof item === "object" ? item : {};
      const keyword = String(record.keyword || keywords[0]);
      const series = Array.isArray(record.interestOverTime) ? record.interestOverTime : [];
      const regions = Array.isArray(record.interestByRegion) ? record.interestByRegion : [];
      const related = record.relatedQueries && typeof record.relatedQueries === "object"
        ? record.relatedQueries as Record<string, unknown> : {};
      const topics = record.relatedTopics && typeof record.relatedTopics === "object"
        ? record.relatedTopics as Record<string, unknown> : {};
      return {
        keyword,
        geo: record.geo || geo || "WORLDWIDE",
        time_range: record.timeRange || ranges[period],
        interest_over_time: series,
        interest_by_region: regions,
        related_queries: related,
        related_topics: topics,
        evidence_type: "observed",
        source: "Google Trends via Apify surefetch/google-trends",
      };
    });
    const meta = {
      actorId, runId, runStatus: run.status, startedAt: run.startedAt || null,
      finishedAt: run.finishedAt || null, buildNumber: run.buildNumber || null,
      usageTotalUsd: run.usageTotalUsd ?? null, defaultDatasetId: datasetId,
    };
    const completedAt = new Date().toISOString();
    const { error: updateError } = await admin.from("market_trend_tasks").update({
      actor_run_id: runId,
      dataset_id: datasetId,
      status: rawItems.length ? "succeeded" : "partial",
      raw_items: rawItems,
      result_count: rawItems.length,
      actor_meta: meta,
      error_message: rawItems.length ? null : "Actor 已完成，但未返回结果。",
      completed_at: completedAt,
      updated_at: completedAt,
    }).eq("id", taskId);
    if (updateError) throw updateError;

    const { data: previous } = await admin.from("research_task_executions")
      .select("attempt_number").eq("task_id", taskId).order("attempt_number", { ascending: false }).limit(1);
    const { error: executionError } = await admin.from("research_task_executions").insert({
      task_id: taskId,
      organization_id: organizationId,
      created_by: user.id,
      attempt_number: (previous?.[0]?.attempt_number || 0) + 1,
      actor_id: actorId,
      actor_run_id: runId,
      status: rawItems.length ? "succeeded" : "partial",
      input_snapshot: { keywords, geo, period, actorInput },
      dataset_id: datasetId,
      raw_items: rawItems,
      result_count: rawItems.length,
      actor_meta: meta,
      started_at: now,
      completed_at: completedAt,
    });
    if (executionError) throw executionError;

    await admin.from("audit_events").insert({
      organization_id: organizationId,
      actor_id: user.id,
      action: "market_trend.collection_completed",
      resource_type: "market_trend_task",
      resource_id: taskId,
      metadata: { actor_id: actorId, actor_run_id: runId, result_count: rawItems.length },
    });
    return reply({
      task_id: taskId,
      status: rawItems.length ? "succeeded" : "partial",
      actor_run_id: runId,
      dataset_id: datasetId,
      result_count: rawItems.length,
      results: normalized,
      actor_meta: meta,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "市场趋势采集失败。";
    if (taskId) {
      await admin.from("market_trend_tasks").update({
        status: "failed", error_message: message,
        completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", taskId);
      await admin.from("research_task_executions").insert({
        task_id: taskId,
        organization_id: (await admin.from("market_trend_tasks").select("organization_id,created_by,actor_id,input_snapshot").eq("id", taskId).maybeSingle()).data?.organization_id,
        created_by: (await admin.from("market_trend_tasks").select("created_by").eq("id", taskId).maybeSingle()).data?.created_by,
        attempt_number: 1,
        actor_id: "surefetch/google-trends",
        status: "failed",
        input_snapshot: {},
        raw_items: [],
        kv_records: [],
        result_count: 0,
        actor_meta: {},
        error_message: message,
        completed_at: new Date().toISOString(),
      });
    }
    return fail(message, 502);
  }
});