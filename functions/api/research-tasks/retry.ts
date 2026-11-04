import { decrypt, type AIEnv } from "../../lib/ai";
type Env = AIEnv & { SUPABASE_URL: string; SUPABASE_ANON_KEY: string; APIFY_API_TOKEN?: string };
const json = (data: unknown, status = 200) => Response.json(data, { status });
const safe = async (r: Response) => r.json().catch(() => ({})) as Promise<any>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const bearer = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!bearer) return json({ error: "请登录后重试任务。" }, 401);
  const base = env.SUPABASE_URL?.replace(/\/$/, "");
  if (!base || !env.SUPABASE_ANON_KEY) return json({ error: "Supabase 服务端配置不可用。" }, 503);
  const headers = { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + bearer, "Content-Type": "application/json" };
  const userResponse = await fetch(base + "/auth/v1/user", { headers });
  if (!userResponse.ok) return json({ error: "登录状态无效或已过期。" }, 401);
  const user = await safe(userResponse);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: "请求 JSON 格式无效。" }, 400); }
  const taskId = String(body?.taskId || ""), organizationId = String(body?.organizationId || "");
  if (!uuid.test(taskId) || !uuid.test(organizationId)) return json({ error: "任务或工作空间 ID 无效。" }, 400);

  const taskResponse = await fetch(base + "/rest/v1/market_trend_tasks?id=eq." + taskId + "&organization_id=eq." + organizationId + "&select=*", { headers });
  if (!taskResponse.ok) return json({ error: "无法读取研究任务。" }, 403);
  const task = (await safe(taskResponse))?.[0];
  if (!task) return json({ error: "任务不存在或无权访问。" }, 404);
  if (task.deleted_at) return json({ error: "回收站任务请先恢复后再重试。" }, 409);
  if (["queued", "running"].includes(task.status)) return json({ error: "任务仍在运行，不能重复启动。" }, 409);
  if (task.created_by !== user.id) return json({ error: "只能重试自己创建的任务；请联系工作空间管理员。" }, 403);
  const input = task.input_snapshot?.actorInput;
  if (!input || typeof input !== "object" || Array.isArray(input)) return json({ error: "缺少原始 Actor 输入快照，无法安全重试。" }, 409);

  let apiToken = env.APIFY_API_TOKEN || "";
  const saved = await env.AI_CONFIG_KV?.get("integration:apify");
  if (saved) {
    try { const config = JSON.parse(await decrypt(saved, env)); if (config.apiToken) apiToken = config.apiToken; }
    catch { return json({ error: "无法解密 Apify 配置，请检查系统设置。" }, 503); }
  }
  if (!apiToken) return json({ error: "请先在设置中配置 Apify API Token。" }, 503);

  const latestResponse = await fetch(base + "/rest/v1/research_task_executions?task_id=eq." + taskId + "&organization_id=eq." + organizationId + "&select=attempt_number&order=attempt_number.desc&limit=1", { headers });
  if (!latestResponse.ok) return json({ error: "无法读取执行历史。" }, 502);
  const latest = (await safe(latestResponse))?.[0];
  const attempt = Number(latest?.attempt_number || 0) + 1;
  const executionResponse = await fetch(base + "/rest/v1/research_task_executions", {
    method: "POST", headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify([{ task_id: taskId, organization_id: organizationId, created_by: user.id, attempt_number: attempt, actor_id: task.actor_id, status: "queued", input_snapshot: task.input_snapshot }])
  });
  if (!executionResponse.ok) return json({ error: "创建新执行记录失败，可能有另一个重试请求正在处理。" }, 409);
  const execution = (await safe(executionResponse))?.[0];
  if (!execution?.id) return json({ error: "未能创建执行记录，Actor 未启动。" }, 500);

  let actorApiId = task.actor_meta?.actorApiId || "";
  if (!actorApiId) {
    const actorSlug = task.actor_id.replace("/", "~");
    const directResponse = await fetch("https://api.apify.com/v2/actors/" + encodeURIComponent(actorSlug), { headers: { Authorization: "Bearer " + apiToken, Accept: "application/json" } });
    const directPayload = await safe(directResponse);
    actorApiId = directResponse.ok && directPayload?.data?.id ? String(directPayload.data.id) : actorSlug;
    if (!directResponse.ok && task.actor_id === "habit.zhou/keyword-suggest-multi") {
      const storeUrl = new URL("https://api.apify.com/v2/store");
      storeUrl.searchParams.set("username", "habit.zhou");
      storeUrl.searchParams.set("limit", "1000");
      const storeResponse = await fetch(storeUrl.toString(), { headers: { Authorization: "Bearer " + apiToken, Accept: "application/json" } });
      const storePayload = await safe(storeResponse);
      const storeItems = Array.isArray(storePayload?.data?.items) ? storePayload.data.items : [];
      const match = storeItems.find((item: any) => String(item?.username || "").toLowerCase() === "habit.zhou" && String(item?.name || "").toLowerCase() === "keyword-suggest-multi");
      if (match?.id) actorApiId = String(match.id);
    }
  }
  const runResponse = await fetch("https://api.apify.com/v2/acts/" + encodeURIComponent(actorApiId) + "/runs", {
    method: "POST", headers: { Authorization: "Bearer " + apiToken, "Content-Type": "application/json" }, body: JSON.stringify(input)
  });
  const runPayload = await safe(runResponse);
  if (!runResponse.ok || !runPayload?.data?.id) {
    const message = String(runPayload?.error?.message || runPayload?.message || "Apify Actor 启动失败（HTTP " + runResponse.status + "）。").slice(0, 1200);
    const failed = { status: "failed", error_message: message, completed_at: new Date().toISOString() };
    await Promise.all([
      fetch(base + "/rest/v1/market_trend_tasks?id=eq." + taskId, { method: "PATCH", headers, body: JSON.stringify(failed) }),
      fetch(base + "/rest/v1/research_task_executions?id=eq." + execution.id, { method: "PATCH", headers, body: JSON.stringify(failed) })
    ]);
    return json({ error: message, taskId, attempt }, 502);
  }

  const run = runPayload.data;
  const started = {
    actor_run_id: run.id, dataset_id: run.defaultDatasetId || null, key_value_store_id: run.defaultKeyValueStoreId || null,
    status: run.status === "READY" ? "queued" : "running", started_at: run.startedAt || new Date().toISOString(),
    actor_meta: { ...(task.actor_meta || {}), actorApiId, attempt, buildNumber: run.buildNumber || null }
  };
  const [taskUpdate, executionUpdate] = await Promise.all([
    fetch(base + "/rest/v1/market_trend_tasks?id=eq." + taskId, { method: "PATCH", headers, body: JSON.stringify({ ...started, raw_items: [], kv_records: [], result_count: 0, error_message: null, completed_at: null, updated_at: new Date().toISOString() }) }),
    fetch(base + "/rest/v1/research_task_executions?id=eq." + execution.id, { method: "PATCH", headers, body: JSON.stringify(started) })
  ]);
  if (!taskUpdate.ok || !executionUpdate.ok) return json({ error: "Actor 已启动，但数据库状态同步失败，请刷新任务详情。", taskId, runId: run.id }, 502);
  return json({ taskId, executionId: execution.id, attempt, runId: run.id, status: run.status }, 202);
};
