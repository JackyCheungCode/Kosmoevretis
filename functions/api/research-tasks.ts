type Env = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string };
const json = (data: unknown, status = 200) => Response.json(data, { status });
const safeJson = async (response: Response) => response.json().catch(() => ({})) as Promise<any>;

async function authenticate(request: Request, env: Env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\\s+/i, "");
  if (!token) return { error: json({ error: "请登录后管理研究任务。" }, 401) };
  const base = env.SUPABASE_URL?.replace(/\\/$/, "");
  if (!base || !env.SUPABASE_ANON_KEY) return { error: json({ error: "Supabase 服务端配置不可用。" }, 503) };
  const response = await fetch(base + "/auth/v1/user", {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + token }
  });
  if (!response.ok) return { error: json({ error: "登录状态无效或已过期。" }, 401) };
  const user = await safeJson(response);
  return {
    base, user,
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    }
  };
}

function taskUrl(base: string, params: URLSearchParams) {
  return base + "/rest/v1/market_trend_tasks?" + params.toString();
}
const allowedStatuses = new Set(["queued", "running", "succeeded", "partial", "failed", "cancelled"]);
const allowedTypes = new Set(["google_trends", "keyword_research"]);
const allowedSorts = new Set(["created_at", "updated_at", "title", "status", "result_count"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function applyView(params: URLSearchParams, view: string) {
  if (view === "archived") {
    params.set("archived_at", "not.is.null");
    params.set("deleted_at", "is.null");
  } else if (view === "trash") {
    params.set("deleted_at", "not.is.null");
  } else if (view === "all") {
    params.set("deleted_at", "is.null");
  } else {
    params.set("archived_at", "is.null");
    params.set("deleted_at", "is.null");
  }
}

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const auth = await authenticate(request, env);
  if ("error" in auth) return auth.error;
  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId") || "";
  if (!uuidPattern.test(organizationId)) return json({ error: "缺少有效的工作空间 ID。" }, 400);

  const taskId = url.searchParams.get("taskId") || "";
  if (taskId) {
    if (!uuidPattern.test(taskId)) return json({ error: "任务 ID 格式无效。" }, 400);
    const params = new URLSearchParams({
      id: "eq." + taskId,
      organization_id: "eq." + organizationId,
      select: "*",
      limit: "1"
    });
    const response = await fetch(taskUrl(auth.base, params), { headers: auth.headers });
    if (!response.ok) return json({ error: "无法读取任务详情。" }, response.status === 401 ? 401 : 403);
    const rows = await safeJson(response);
    const task = rows?.[0];
    if (!task) return json({ error: "任务不存在或无权访问。" }, 404);
    const executionParams = new URLSearchParams({
      task_id: "eq." + taskId,
      organization_id: "eq." + organizationId,
      select: "*",
      order: "attempt_number.asc"
    });
    const executionResponse = await fetch(auth.base + "/rest/v1/research_task_executions?" + executionParams.toString(), { headers: auth.headers });
    if (!executionResponse.ok) return json({ error: "任务已读取，但执行记录暂时不可用。" }, 502);
    return json({ task, executions: await safeJson(executionResponse) });
  }

  const page = Math.max(1, Math.floor(Number(url.searchParams.get("page")) || 1));
  const pageSize = Math.min(200, Math.max(10, Math.floor(Number(url.searchParams.get("pageSize")) || 50)));
  const view = ["active", "archived", "trash", "all"].includes(url.searchParams.get("view") || "")
    ? (url.searchParams.get("view") as string) : "active";
  const params = new URLSearchParams({
    organization_id: "eq." + organizationId,
    select: "id,organization_id,created_by,actor_id,actor_run_id,dataset_id,status,input_snapshot,result_count,actor_meta,error_message,started_at,completed_at,created_at,updated_at,task_type,title,archived_at,deleted_at,tags,key_value_store_id",
    order: "created_at.desc",
    limit: String(pageSize),
    offset: String((page - 1) * pageSize)
  });
  applyView(params, view);

  const type = url.searchParams.get("taskType") || "";
  if (allowedTypes.has(type)) params.set("task_type", "eq." + type);
  const status = url.searchParams.get("status") || "";
  if (allowedStatuses.has(status)) params.set("status", "eq." + status);
  const search = (url.searchParams.get("search") || "").trim().slice(0, 120);
  if (search) params.set("title", "ilike.*" + search.replace(/[,*()]/g, " ") + "*");
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const dateFilters: string[] = [];
  if (from && !Number.isNaN(Date.parse(from))) dateFilters.push("created_at.gte." + new Date(from).toISOString());
  if (to && !Number.isNaN(Date.parse(to))) dateFilters.push("created_at.lte." + new Date(to).toISOString());
  if (dateFilters.length) params.set("and", "(" + dateFilters.join(",") + ")");

  const sort = allowedSorts.has(url.searchParams.get("sort") || "") ? (url.searchParams.get("sort") as string) : "created_at";
  const direction = url.searchParams.get("direction") === "asc" ? "asc" : "desc";
  params.set("order", sort + "." + direction);

  const response = await fetch(taskUrl(auth.base, params), {
    headers: { ...auth.headers, Prefer: "count=exact" }
  });
  if (!response.ok) return json({ error: "读取研究任务列表失败。" }, response.status === 401 ? 401 : 403);
  const items = await safeJson(response);
  const contentRange = response.headers.get("content-range") || "";
  const total = Number(contentRange.split("/")[1]) || 0;

  const summary = await Promise.all([...allowedStatuses].map(async (itemStatus) => {
    const countParams = new URLSearchParams({
      organization_id: "eq." + organizationId,
      select: "id",
      status: "eq." + itemStatus,
      limit: "1"
    });
    applyView(countParams, view);
    if (allowedTypes.has(type)) countParams.set("task_type", "eq." + type);
    const countResponse = await fetch(taskUrl(auth.base, countParams), {
      method: "HEAD",
      headers: { ...auth.headers, Prefer: "count=exact" }
    });
    const range = countResponse.headers.get("content-range") || "";
    return [itemStatus, Number(range.split("/")[1]) || 0] as const;
  }));

  return json({
    items,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    summary: Object.fromEntries(summary)
  });
};

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const auth = await authenticate(request, env);
  if ("error" in auth) return auth.error;
  let body: any;
  try { body = await request.json(); } catch { return json({ error: "请求 JSON 格式无效。" }, 400); }

  const organizationId = typeof body?.organizationId === "string" ? body.organizationId : "";
  const action = String(body?.action || "");
  const taskIds = Array.isArray(body?.taskIds) ? [...new Set(body.taskIds.filter((id: unknown) => typeof id === "string" && uuidPattern.test(id)))] : [];
  if (!uuidPattern.test(organizationId)) return json({ error: "缺少有效的工作空间 ID。" }, 400);
  if (!["archive", "restore", "trash", "set_tags"].includes(action)) return json({ error: "不支持的批量操作。" }, 400);
  if (!taskIds.length || taskIds.length > 100) return json({ error: "请选择 1–100 个有效任务。" }, 400);

  const filter = new URLSearchParams({
    id: "in.(" + taskIds.join(",") + ")",
    organization_id: "eq." + organizationId,
    select: "id,status"
  });
  if (action === "archive" || action === "trash") {
    filter.set("status", "in.(succeeded,partial,failed,cancelled)");
    filter.set("deleted_at", "is.null");
  }
  const eligibleResponse = await fetch(taskUrl(auth.base, filter), { headers: auth.headers });
  if (!eligibleResponse.ok) return json({ error: "无法确认所选任务的访问权限。" }, 403);
  const eligible = await safeJson(eligibleResponse);
  const eligibleIds = Array.isArray(eligible) ? eligible.map((row: any) => row.id) : [];
  if (!eligibleIds.length) return json({ affected: 0, skipped: taskIds.length, updatedIds: [] });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (action === "archive") patch.archived_at = new Date().toISOString();
  if (action === "restore") { patch.archived_at = null; patch.deleted_at = null; patch.deleted_by = null; }
  if (action === "trash") { patch.deleted_at = new Date().toISOString(); patch.deleted_by = auth.user.id; }
  if (action === "set_tags") {
    const tags = Array.isArray(body.tags)
      ? [...new Set(body.tags.map((tag: unknown) => String(tag).trim()).filter((tag: string) => tag.length > 0 && tag.length <= 40))].slice(0, 20)
      : null;
    if (!tags) return json({ error: "标签格式无效。" }, 400);
    patch.tags = tags;
  }

  const updateParams = new URLSearchParams({
    id: "in.(" + eligibleIds.join(",") + ")",
    organization_id: "eq." + organizationId,
    select: "id"
  });
  const updateResponse = await fetch(taskUrl(auth.base, updateParams), {
    method: "PATCH",
    headers: { ...auth.headers, Prefer: "return=representation" },
    body: JSON.stringify(patch)
  });
  if (!updateResponse.ok) return json({ error: "批量操作失败，请稍后重试。" }, 502);
  const updated = await safeJson(updateResponse);
  const updatedIds = Array.isArray(updated) ? updated.map((row: any) => row.id) : [];
  return json({ affected: updatedIds.length, skipped: taskIds.length - updatedIds.length, updatedIds });
};
