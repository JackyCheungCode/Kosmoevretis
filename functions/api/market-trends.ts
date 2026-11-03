import { decrypt, type AIEnv } from "../lib/ai";
type Env = AIEnv & { SUPABASE_URL: string; SUPABASE_ANON_KEY: string; APIFY_API_TOKEN?: string; APIFY_ACTOR_ID?: string };
const json = (data: unknown, status = 200) => Response.json(data, { status });
const safeJson = async (response: Response) => response.json().catch(() => ({})) as Promise<any>;
const actorDefault = "surefetch/google-trends";
async function getApifyToken(env: Env): Promise<string> {
  const saved = await env.AI_CONFIG_KV?.get("integration:apify");
  if (saved) {
    const config = JSON.parse(await decrypt(saved, env));
    if (typeof config.apiToken === "string" && config.apiToken) return config.apiToken;
  }
  return env.APIFY_API_TOKEN || "";
}
const apifyToken = (request: Request, env: Env) => request.headers.get("X-Apify-Token")?.trim() || env.APIFY_API_TOKEN || "";

async function authenticate(request: Request, env: Env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: json({ error: "Sign in to use Market Trends." }, 401) };
  const base = env.SUPABASE_URL?.replace(/\/$/, "");
  if (!base || !env.SUPABASE_ANON_KEY) return { error: json({ error: "Supabase server configuration is unavailable." }, 503) };
  const response = await fetch(base + "/auth/v1/user", { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + token } });
  if (!response.ok) return { error: json({ error: "Your session is invalid or has expired." }, 401) };
  const user = await safeJson(response);
  return { token, user, base, headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + token, "Content-Type": "application/json" } };
}
function actorInput(body: any) {
  const isTrending = body.mode === "trendingNow";
  const keywords = Array.isArray(body.keywords) ? body.keywords : [];
  const compareTerms = !!body.compareTerms;
  return {
    operation: isTrending ? "trending" : "keywords",
    keywords: isTrending ? [] : keywords,
    geo: body.geo || "",
    timeRange: body.timeRange || "today 12-m",
    category: Number.isInteger(body.category) ? body.category : 0,
    property: body.property || "web",
    maxItems: Math.min(5000, Math.max(1, Number(body.maxItems) || 1000))
  };
}
async function supabasePatch(base: string, headers: Record<string, string>, id: string, patch: Record<string, unknown>) {
  const response = await fetch(base + "/rest/v1/market_trend_tasks?id=eq." + encodeURIComponent(id), {
    method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify(patch)
  });
  if (!response.ok) throw new Error("Unable to update research task in Supabase: " + (await response.text()).slice(0, 400));
}
export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const auth = await authenticate(request, env);
  if ("error" in auth) return auth.error;
  const token = apifyToken(request, env);
  if (!token) return json({ error: "请先前往「设置 → Apify 数据服务」填写 Apify API Token。" }, 503);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON request." }, 400); }
  const organizationId = typeof body?.organizationId === "string" ? body.organizationId : "";
  const keywords = Array.isArray(body?.keywords) ? body.keywords.map((v: unknown) => String(v)).filter((v: string) => v.trim().length > 0) : [];
  const isTrending = body?.mode === "trendingNow";
  const customInput = body?.actorInput && typeof body.actorInput === "object" && !Array.isArray(body.actorInput);
  if (!organizationId || (!isTrending && !keywords.length && !customInput)) return json({ error: "A workspace and at least one keyword or a complete Actor input JSON object are required." }, 400);
  if (body?.compareTerms && keywords.length > 5) return json({ error: "A comparison group can contain at most five keywords." }, 400);
  const actorId = (env.APIFY_ACTOR_ID || actorDefault).replace("/", "~");
  const input = customInput ? body.actorInput : actorInput({ ...body, keywords });
  const taskInsert = await fetch(auth.base + "/rest/v1/market_trend_tasks", {
    method: "POST",
    headers: { ...auth.headers, Prefer: "return=representation" },
    body: JSON.stringify([{
      organization_id: organizationId, created_by: auth.user.id, actor_id: env.APIFY_ACTOR_ID || actorDefault,
      status: "queued", input_snapshot: { ...body, keywords, actorInput: input }, raw_items: []
    }])
  });
  if (!taskInsert.ok) return json({ error: "Could not create the research task. Check workspace permissions." }, 403);
  const inserted = await safeJson(taskInsert);
  const task = inserted?.[0];
  if (!task?.id) return json({ error: "Research task was created without an ID." }, 500);

  const runResponse = await fetch("https://api.apify.com/v2/acts/" + actorId + "/runs", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const runPayload = await safeJson(runResponse);
  if (!runResponse.ok || !runPayload?.data?.id) {
    const message = runPayload?.error?.message || runPayload?.message || "Apify rejected the Actor input (HTTP " + runResponse.status + ").";
    await supabasePatch(auth.base, auth.headers, task.id, { status: "failed", error_message: String(message).slice(0, 1200), completed_at: new Date().toISOString() });
    return json({ error: String(message).slice(0, 1200), taskId: task.id }, 502);
  }
  await supabasePatch(auth.base, auth.headers, task.id, {
    actor_run_id: runPayload.data.id, dataset_id: runPayload.data.defaultDatasetId || null,
    status: runPayload.data.status === "READY" ? "queued" : "running",
    started_at: runPayload.data.startedAt || new Date().toISOString(),
    actor_meta: { actorId: env.APIFY_ACTOR_ID || actorDefault, buildNumber: runPayload.data.buildNumber || null }
  });
  return json({ taskId: task.id, runId: runPayload.data.id, status: runPayload.data.status }, 202);
};

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const auth = await authenticate(request, env);
  if (auth.error) return auth.error;
  const taskId = new URL(request.url).searchParams.get("taskId") || "";
  if (!taskId) return json({ error: "taskId is required." }, 400);
  const taskResponse = await fetch(auth.base + "/rest/v1/market_trend_tasks?id=eq." + encodeURIComponent(taskId) + "&select=*", { headers: auth.headers });
  if (!taskResponse.ok) return json({ error: "Unable to read research task." }, 403);
  const rows = await safeJson(taskResponse);
  const task = rows?.[0];
  if (!task) return json({ error: "Research task not found." }, 404);
  if (!task.actor_run_id || !["queued", "running"].includes(task.status)) return json({ task });
  const token = apifyToken(request, env);
  if (!token) return json({ error: "请在「设置 → Apify 数据服务」填写 Apify API Token 后刷新任务。" }, 503);
  const runResponse = await fetch("https://api.apify.com/v2/actor-runs/" + encodeURIComponent(task.actor_run_id), {
    headers: { Authorization: "Bearer " + token }
  });
  const runPayload = await safeJson(runResponse);
  if (!runResponse.ok || !runPayload?.data) return json({ task, error: "Unable to read Apify run status." }, 502);
  const run = runPayload.data;
  const state = String(run.status || "RUNNING");
  if (["READY", "RUNNING"].includes(state)) {
    const status = state === "READY" ? "queued" : "running";
    if (task.status !== status) await supabasePatch(auth.base, auth.headers, task.id, { status });
    return json({ task: { ...task, status } });
  }
  const datasetId = run.defaultDatasetId || task.dataset_id;
  const terminalSuccess = state === "SUCCEEDED";
  let items: any[] = Array.isArray(task.raw_items) ? task.raw_items : [];
  let kvRecords: any[] = Array.isArray(task.kv_records) ? task.kv_records : [];
  let fetchError = "";
  if (datasetId && !items.length) {
    try {
      const maxItems = Math.min(5000, Math.max(1, Number(task.input_snapshot?.maxItems) || 1000));
      for (let offset = 0; offset < maxItems; offset += 1000) {
        const limit = Math.min(1000, maxItems - offset);
        const url = "https://api.apify.com/v2/datasets/" + encodeURIComponent(datasetId) + "/items?format=json&clean=true&offset=" + offset + "&limit=" + limit;
        const dataResponse = await fetch(url, { headers: { Authorization: "Bearer " + token } });
        if (!dataResponse.ok) throw new Error("Dataset download failed with HTTP " + dataResponse.status);
        const page = await safeJson(dataResponse);
        if (!Array.isArray(page)) throw new Error("Apify returned an unexpected dataset format.");
        items = items.concat(page);
        if (page.length < limit) break;
      }
    } catch (error) { fetchError = error instanceof Error ? error.message : "Dataset download failed."; }
  }
  const keyValueStoreId = run.defaultKeyValueStoreId || task.key_value_store_id;
  if (keyValueStoreId && !kvRecords.length) {
    try {
      let keys: any[] = [];
      for (let offset = 0; offset < 5000; offset += 1000) {
        const keyUrl = "https://api.apify.com/v2/key-value-stores/" + encodeURIComponent(keyValueStoreId) + "/keys?limit=1000&offset=" + offset;
        const keyResponse = await fetch(keyUrl, { headers: { Authorization: "Bearer " + token } });
        if (!keyResponse.ok) throw new Error("Key-value store listing failed with HTTP " + keyResponse.status);
        const keyPayload = await safeJson(keyResponse);
        const page = keyPayload?.data?.items || keyPayload?.items || [];
        if (!Array.isArray(page)) throw new Error("Apify returned an unexpected key list.");
        keys = keys.concat(page);
        if (page.length < 1000) break;
      }
      for (const keyInfo of keys) {
        const key = String(keyInfo.key || "");
        if (!key) continue;
        const recordUrl = "https://api.apify.com/v2/key-value-stores/" + encodeURIComponent(keyValueStoreId) + "/records/" + encodeURIComponent(key);
        const recordResponse = await fetch(recordUrl, { headers: { Authorization: "Bearer " + token } });
        if (!recordResponse.ok) {
          kvRecords.push({ key, error: "Record download failed with HTTP " + recordResponse.status, metadata: keyInfo });
          continue;
        }
        const contentType = recordResponse.headers.get("content-type") || "application/octet-stream";
        const buffer = await recordResponse.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        if (contentType.includes("json") || contentType.startsWith("text/")) {
          const text = new TextDecoder().decode(bytes);
          let value: any = text;
          if (contentType.includes("json")) { try { value = JSON.parse(text); } catch { value = text; } }
          kvRecords.push({ key, contentType, size: bytes.length, value });
        } else if (bytes.length <= 512000) {
          let binary = "";
          for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
          kvRecords.push({ key, contentType, size: bytes.length, base64: btoa(binary) });
        } else {
          kvRecords.push({ key, contentType, size: bytes.length, contentOmitted: true, recordUrl });
        }
      }
    } catch (error) {
      fetchError = (fetchError ? fetchError + "; " : "") + (error instanceof Error ? error.message : "Key-value store download failed.");
    }
  }
  const finalStatus = terminalSuccess ? (fetchError ? "partial" : "succeeded") : (items.length ? "partial" : "failed");
  const patch = {
    dataset_id: datasetId || null, key_value_store_id: keyValueStoreId || null, status: finalStatus, raw_items: items, kv_records: kvRecords,
    result_count: items.length, error_message: fetchError || (!terminalSuccess ? String(run.statusMessage || "Actor ended with status " + state).slice(0, 1200) : null),
    actor_meta: { ...(task.actor_meta || {}), runStatus: state, usageTotalUsd: run.usageTotalUsd ?? null, stats: run.stats || {}, finishedAt: run.finishedAt || null },
    completed_at: run.finishedAt || new Date().toISOString()
  };
  await supabasePatch(auth.base, auth.headers, task.id, patch);
  return json({ task: { ...task, ...patch } });
};
