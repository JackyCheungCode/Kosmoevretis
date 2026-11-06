interface WorkersAI {
  run(model: string, input: {
    messages: Array<{ role: "system" | "user"; content: string }>;
    max_tokens?: number;
    temperature?: number;
  }): Promise<unknown>;
}
interface Env {
  AI: WorkersAI;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}
interface PagesContext { request: Request; env: Env }
const defaultModel = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const allowedModels = new Set([
  defaultModel,
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/openai/gpt-oss-120b",
  "@cf/openai/gpt-oss-20b",
  "@cf/moonshotai/kimi-k2.6",
  "@cf/zai-org/glm-5.3",
]);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});
const uuidPattern = /^[0-9a-f-]{36}$/i;
const allowedTabs = new Set(["overview","bestsellers","search","social","consumer","competitors","categories","markets"]);
const evidenceByTab: Record<string, string[]> = {
  overview: ["search_trend","product_listing","social_post","review","article","other"],
  bestsellers: ["product_listing"],
  search: ["search_trend","article"],
  social: ["social_post"],
  consumer: ["social_post","review"],
  competitors: ["product_listing","social_post","article"],
  categories: ["product_listing"],
  markets: ["search_trend","product_listing","social_post","review","article","other"],
};
async function rest<T>(env: Env, token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(env.SUPABASE_URL + path, {
    ...init,
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      authorization: "Bearer " + token,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error((body as any)?.message || (body as any)?.error_description || "Supabase 数据请求失败。");
  return body as T;
}
export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return json({ error: "请先登录企业工作区。" }, 401);
  try {
    const authUser = await rest<{ id: string }>(env, token, "/auth/v1/user");
    const payload = await request.json() as Record<string, unknown>;
    const taskId = String(payload.task_id || "");
    const organizationId = String(payload.organization_id || "");
    if (!uuidPattern.test(taskId) || !uuidPattern.test(organizationId)) return json({ error: "分析任务或组织编号无效。" }, 400);
    const model = typeof payload.model === "string" ? payload.model : defaultModel;
    if (!allowedModels.has(model)) return json({ error: "所选模型不在当前可用模型列表中。" }, 400);
    const mode = typeof payload.mode === "string" ? payload.mode : "all";
    if (!["all","single","custom"].includes(mode)) return json({ error: "不支持的分析模式。" }, 400);
    const tab = typeof payload.tab === "string" && allowedTabs.has(payload.tab) ? payload.tab : "overview";
    const tabs = Array.isArray(payload.tabs) ? payload.tabs.filter((value): value is string => typeof value === "string" && allowedTabs.has(value)).slice(0,8) : [];
    if (mode === "custom" && !tabs.length) return json({ error: "请至少选择一个情报维度。" }, 400);
    const question = typeof payload.question === "string" ? payload.question.slice(0,1200) : "";
    const context = typeof payload.context === "string" ? payload.context.slice(0,1600) : "";

    const taskQuery = new URLSearchParams({
      select: "id,title,status,result_count,input_snapshot,actor_meta,created_at",
      id: "eq." + taskId, organization_id: "eq." + organizationId, task_type: "eq.global_intelligence", limit: "1",
    });
    const tasks = await rest<Array<Record<string, any>>>(env, token, "/rest/v1/market_trend_tasks?" + taskQuery.toString());
    const task = tasks[0];
    if (!task) return json({ error: "找不到该任务，或当前账号无权查看。" }, 404);
    if (!["succeeded","partial"].includes(String(task.status))) return json({ error: "采集任务尚未完成，暂不能生成 AI 报告。" }, 409);

    const evidenceQuery = new URLSearchParams({
      select: "id,source_slug,channel,evidence_kind,evidence_type,title,content_text,source_url,market_code,language,currency,price,rank_value,rating,review_count,metrics,collected_at",
      task_id: "eq." + taskId, organization_id: "eq." + organizationId,
      order: "collected_at.desc", limit: "500",
    });
    const evidence = await rest<Array<Record<string, any>>>(env, token, "/rest/v1/market_intelligence_evidence?" + evidenceQuery.toString());
    if (!evidence.length) return json({ error: "当前任务没有可用于分析的真实证据。" }, 400);

    const scopeTabs = mode === "single" ? [tab] : mode === "custom" ? tabs : Array.from(allowedTabs);
    const allowedKinds = new Set(scopeTabs.flatMap(key => evidenceByTab[key] || []));
    const scoped = evidence.filter(row => allowedKinds.has(String(row.evidence_kind))).slice(0, 300).map(row => ({
      source: row.source_slug, channel: row.channel, kind: row.evidence_kind,
      evidence_type: row.evidence_type, title: row.title, content: row.content_text,
      url: row.source_url, market: row.market_code, language: row.language,
      currency: row.currency, price: row.price, platform_rank: row.rank_value,
      rating: row.rating, review_count: row.review_count, metrics: row.metrics,
      collected_at: row.collected_at,
    }));
    if (!scoped.length) return json({ error: "当前分析范围没有对应的数据源证据，请切换分析维度。" }, 400);
    const evidenceText = JSON.stringify(scoped);
    if (evidenceText.length > 26000) return json({ error: "证据数据量过大，请缩小分析范围或减少数据源。" }, 413);

    const sourceSlugs = [...new Set(scoped.map(row => row.source))];
    const system = [
      "你是 Kosmoevretis 全球 3C 市场情报分析师，使用简体中文。",
      "只能依据提供的真实采集证据作答；不得编造销量、市场规模、品牌份额、价格、来源或样本。",
      "每个事实性判断尽量指出来源平台、市场和采集时间；引用数据时保留原始来源 URL（若有）。",
      "严格区分 observed（来源直接观测）、estimated（第三方估算）、inferred（AI 推断）。",
      "电商列表、平台排名或 BSR 不是销量；Google Trends 0–100 是相对兴趣指数，不是绝对搜索量；播放、点赞、评论不等于购买需求。",
      "搜索趋势、社媒互动和商品排名只能作为市场信号。不要将相关性表述为因果关系。",
      "先给执行摘要，再列证据与跨市场差异、机会假设、风险、置信度和下一步验证动作。",
      "如果证据不足、样本偏差明显或某渠道没有数据，明确说明，不要推测成零需求。",
    ].join("\n");
    const scope = mode === "single" ? "仅分析维度：" + tab : mode === "custom" ? "组合分析维度：" + tabs.join(", ") : "综合分析本次全部可用证据。";
    const user = [
      "任务名称：" + String(task.title || "全球市场情报"),
      "任务上下文：" + (context || JSON.stringify(task.input_snapshot || {})).slice(0, 2200),
      "分析范围：" + scope,
      "用户研究问题：" + (question || "识别最值得进一步验证的全球 3C 市场机会。"),
      "实际采集证据 JSON：", evidenceText,
    ].join("\n\n");
    const result = await env.AI.run(model, {
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      max_tokens: 2400, temperature: 0.2,
    });
    const answer = typeof (result as any)?.response === "string" ? (result as any).response : "";
    if (!answer) return json({ error: "模型未返回可展示内容，请稍后重试。" }, 502);

    let reportId: string | null = null;
    try {
      const saved = await rest<Array<{ id: string }>>(env, token, "/rest/v1/market_intelligence_ai_reports", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          task_id: taskId, organization_id: organizationId, created_by: authUser.id,
          analysis_mode: mode, tab_key: mode === "single" ? tab : scopeTabs.join(","),
          model_key: model, question, answer, evidence_count: scoped.length, source_slugs: sourceSlugs,
        }),
      });
      reportId = saved[0]?.id || null;
    } catch { /* The generated answer remains useful if report persistence is temporarily unavailable. */ }
    return json({ answer, provider: "cloudflare-workers-ai", model, report_id: reportId, evidence_count: scoped.length, source_slugs: sourceSlugs, evidence_type: "observed" });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "AI 分析服务暂不可用。" }, 500);
  }
}
