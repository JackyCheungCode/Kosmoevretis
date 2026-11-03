import { decrypt, type AIEnv } from "../../lib/ai";

type Env = AIEnv & { SUPABASE_URL: string; SUPABASE_ANON_KEY: string };
type Dimension = { id: string; title: string; description?: string };
type Assignment = { provider?: string; model?: string };
const dimensionCatalog: Dimension[] = [
  { id: "foundation", title: "企业基础认知", description: "企业定位、发展阶段、核心业务、经营范围与关键背景" },
  { id: "business-model", title: "商业模式分析", description: "价值创造、收入来源、成本结构、渠道与盈利逻辑" },
  { id: "product", title: "产品与服务能力", description: "产品组合、服务交付、差异化能力与价值主张" },
  { id: "market", title: "市场环境分析", description: "行业趋势、市场规模、区域环境与外部驱动因素" },
  { id: "customer", title: "客户与需求分析", description: "客户细分、购买动机、痛点需求与客户价值" },
  { id: "competitor", title: "竞争格局分析", description: "竞争者、替代方案、市场定位与竞争优势" },
  { id: "organization", title: "组织与人才分析", description: "组织架构、关键岗位、人才能力与治理机制" },
  { id: "operations", title: "运营与资源分析", description: "运营流程、供应链、技术设施与资源配置效率" },
  { id: "finance", title: "财务与经营健康度", description: "收入成本、现金流、盈利能力、财务韧性与经营指标" },
  { id: "risk", title: "风险分析", description: "战略、市场、运营、财务、合规及外部依赖风险" },
  { id: "swot", title: "SWOT 与战略分析", description: "优势、劣势、机会、威胁及战略匹配" },
  { id: "planning", title: "发展目标与规划分析", description: "阶段目标、战略路径、关键举措、里程碑与资源需求" }
];

const json = (data: unknown, status = 200) => Response.json(data, { status });
const safeJson = async (response: Response) => response.json().catch(() => ({})) as Promise<any>;

async function callProvider(providerId: string, requestedModel: string, prompt: string, env: Env) {
  if (providerId === "cloudflare") {
    if (!env.AI) throw new Error("Cloudflare Workers AI Binding 尚未启用。");
    const model = requestedModel.startsWith("@cf/") ? requestedModel : "@cf/zai-org/glm-4.7-flash";
    const result: any = await env.AI.run(model, { messages: [
      { role: "system", content: "你是 Kosmoevretis 的全球商业智能分析师。只根据给定企业档案进行分析，明确区分事实、推断与信息缺口；不得编造客户、财务、市场规模或市场份额。使用简体中文，输出可执行建议。" },
      { role: "user", content: prompt }
    ], max_tokens: 2600 });
    const output = typeof result === "string" ? result : result?.response || result?.output || result?.result;
    if (typeof output !== "string" || !output.trim()) throw new Error("Workers AI 未返回有效文本。");
    return { output, modelId: model };
  }

  const raw = await env.AI_CONFIG_KV.get("provider:" + providerId);
  if (!raw) throw new Error("服务商 " + providerId + " 尚未在 AI 服务中心配置 API 凭证。");
  const cfg = JSON.parse(await decrypt(raw, env));
  if (!cfg.enabled || !cfg.apiKey) throw new Error("服务商 " + providerId + " 未启用或缺少 API Key。");
  const modelId = String(cfg.model || requestedModel || "");
  if (!modelId) throw new Error("服务商 " + providerId + " 未配置模型 ID。");
  const system = "你是 Kosmoevretis 的全球商业智能分析师。只根据给定企业档案进行分析，明确区分事实、推断与信息缺口；不得编造数据。使用简体中文，给出可执行建议。";
  let response: Response;
  if (providerId === "anthropic") {
    response = await fetch(cfg.baseUrl.replace(/\/$/, "") + "/messages", {
      method: "POST",
      headers: { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelId, max_tokens: 2600, system, messages: [{ role: "user", content: prompt }] })
    });
  } else {
    response = await fetch(cfg.baseUrl.replace(/\/$/, "") + "/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + cfg.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelId, temperature: 0.2, max_tokens: 2600, messages: [{ role: "system", content: system }, { role: "user", content: prompt }] })
    });
  }
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.error?.message || payload?.message || "模型服务返回 HTTP " + response.status);
  const output = providerId === "anthropic" ? (payload.content || []).map((part: any) => part.text || "").join("\n") : payload.choices?.[0]?.message?.content;
  if (typeof output !== "string" || !output.trim()) throw new Error("服务商未返回有效分析文本。");
  return { output, modelId };
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "需要登录后才能启动分析。" }, 401);
  const base = env.SUPABASE_URL?.replace(/\/$/, "");
  if (!base || !env.SUPABASE_ANON_KEY) return json({ error: "Supabase 服务端环境变量未配置。" }, 503);
  const headers = { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + token, "Content-Type": "application/json" };
  const auth = await fetch(base + "/auth/v1/user", { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + token } });
  if (!auth.ok) return json({ error: "登录会话无效或已过期。" }, 401);
  const user = await safeJson(auth);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: "请求内容无效。" }, 400); }
  const profileId = body?.profileId;
  const organizationId = body?.organizationId;
  if (typeof profileId !== "string" || typeof organizationId !== "string") return json({ error: "缺少企业档案或工作空间。" }, 400);

  const profileResponse = await fetch(base + "/rest/v1/enterprise_profiles?id=eq." + encodeURIComponent(profileId) + "&organization_id=eq." + encodeURIComponent(organizationId) + "&select=*", { headers });
  if (!profileResponse.ok) return json({ error: "无法读取企业档案或当前用户无权访问。" }, 403);
  const profiles = await safeJson(profileResponse);
  if (!Array.isArray(profiles) || !profiles.length) return json({ error: "企业档案不存在或无权访问。" }, 404);
  const profile = profiles[0];

  const requested = Array.isArray(body?.dimensions) ? body.dimensions : dimensionCatalog;
  const dimensions = requested.map((item: any) => dimensionCatalog.find((known) => known.id === item?.id)).filter(Boolean) as Dimension[];
  if (!dimensions.length || dimensions.length > 12) return json({ error: "请选择 1 至 12 个有效分析维度。" }, 400);
  const assignments: Record<string, Assignment> = body?.assignments && typeof body.assignments === "object" ? body.assignments : {};
  const objective = typeof body?.objective === "string" ? body.objective.slice(0, 4000) : "综合企业分析";
  const inputSnapshot = {
    profile,
    profile_version: profile.version,
    objective,
    dimensions,
    assignments: Object.fromEntries(dimensions.map((dimension) => [dimension.id, assignments[dimension.id] || { provider: "cloudflare", model: "@cf/zai-org/glm-4.7-flash" }])),
    requested_at: new Date().toISOString()
  };

  const insert = await fetch(base + "/rest/v1/ai_analysis_runs", {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify([{ organization_id: organizationId, profile_id: profileId, requested_by: user.id, status: "running", provider_id: "multi", model_id: "multi", input_snapshot: inputSnapshot, started_at: new Date().toISOString() }])
  });
  if (!insert.ok) return json({ error: "创建分析任务失败，请检查工作空间权限。" }, 403);
  const inserted = await safeJson(insert);
  const run = inserted?.[0];
  if (!run?.id) return json({ error: "分析任务已提交但未返回任务编号。" }, 500);

  const dimensionResults: any[] = [];
  for (const dimension of dimensions) {
    const assignment = assignments[dimension.id] || { provider: "cloudflare", model: "@cf/zai-org/glm-4.7-flash" };
    const providerId = String(assignment.provider || "cloudflare");
    const requestedModel = String(assignment.model || "");
    const prompt = [
      "企业档案快照：",
      JSON.stringify(profile),
      "",
      "分析目标：" + objective,
      "本次维度：" + dimension.title + "（" + dimension.id + "）",
      "维度说明：" + (dimension.description || dimension.title),
      "请只输出该维度的分析报告，包含：核心判断、已知事实、合理推断、信息缺口与待验证问题、风险/机会、可执行建议。每项判断都应说明依据；缺少数据时明确写明，不得虚构。"
    ].join("\n");
    try {
      const called = await callProvider(providerId, requestedModel, prompt, env);
      dimensionResults.push({ id: dimension.id, title: dimension.title, status: "succeeded", provider_id: providerId, model_id: called.modelId, output: called.output });
    } catch (error) {
      dimensionResults.push({ id: dimension.id, title: dimension.title, status: "failed", provider_id: providerId, model_id: requestedModel || null, error: error instanceof Error ? error.message.slice(0, 500) : "模型调用失败" });
    }
    const successes = dimensionResults.filter((item) => item.status === "succeeded").length;
    const progressStatus = successes === dimensions.length ? "succeeded" : successes > 0 ? "partial" : "running";
    await fetch(base + "/rest/v1/ai_analysis_runs?id=eq." + encodeURIComponent(run.id), {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ status: progressStatus, result: { dimensions: dimensionResults, summary: "已执行 " + dimensionResults.length + " / " + dimensions.length + " 个分析维度。" } })
    });
  }

  const successCount = dimensionResults.filter((item) => item.status === "succeeded").length;
  const status = successCount === dimensions.length ? "succeeded" : successCount > 0 ? "partial" : "failed";
  const update = await fetch(base + "/rest/v1/ai_analysis_runs?id=eq." + encodeURIComponent(run.id), {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({
      status,
      result: { dimensions: dimensionResults, summary: "完成 " + successCount + " / " + dimensions.length + " 个分析维度。" },
      error_message: successCount === 0 ? "所有维度均未能完成，请检查对应 Provider 配置。" : null,
      completed_at: new Date().toISOString()
    })
  });
  if (!update.ok) return json({ runId: run.id, status: "failed", dimensions: dimensionResults, error: "分析结果生成后，写入数据库失败。" }, 500);
  return json({ runId: run.id, status, dimensions: dimensionResults, completed: successCount, total: dimensions.length }, status === "failed" ? 502 : 200);
};
