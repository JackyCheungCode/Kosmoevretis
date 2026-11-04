interface WorkersAI {
  run(
    model: string,
    input: {
      messages: Array<{ role: "system" | "user"; content: string }>;
      max_tokens?: number;
      temperature?: number;
    }
  ): Promise<unknown>;
}
interface Env {
  AI: WorkersAI;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}
interface PagesContext {
  request: Request;
  env: Env;
}
const allowedTabs = new Set(["overview","bestsellers","search","social","consumer","competitors","categories","markets"]);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return json({ error: "请先登录企业工作区。" }, 401);
  try {
    const authResponse = await fetch(env.SUPABASE_URL + "/auth/v1/user", {
      headers: { apikey: env.SUPABASE_ANON_KEY, authorization: "Bearer " + token }
    });
    if (!authResponse.ok) return json({ error: "登录状态已失效，请重新登录。" }, 401);
    const payload = await request.json() as Record<string, unknown>;
    const mode = typeof payload.mode === "string" ? payload.mode : "all";
    if (!["all","single","custom"].includes(mode)) return json({ error: "不支持的分析模式。" }, 400);
    const dataset = payload.dataset;
    if (!dataset || typeof dataset !== "object") return json({ error: "缺少情报数据集。" }, 400);
    const tab = typeof payload.tab === "string" && allowedTabs.has(payload.tab) ? payload.tab : "overview";
    const tabs = Array.isArray(payload.tabs) ? payload.tabs.filter((x): x is string => typeof x === "string" && allowedTabs.has(x)).slice(0,8) : [];
    if (mode === "custom" && tabs.length === 0) return json({ error: "请至少选择一个情报 Tab。" }, 400);
    const question = typeof payload.question === "string" ? payload.question.slice(0,1200) : "";
    const context = typeof payload.context === "string" ? payload.context.slice(0,1600) : "";
    const datasetText = JSON.stringify(dataset);
    if (datasetText.length > 18000) return json({ error: "分析数据量过大，请缩小分析范围。" }, 413);
    const scope = mode === "single" ? "仅分析 Tab：" + tab : mode === "custom" ? "分析用户选中的 Tab：" + tabs.join(", ") : "综合分析全部情报结果。";
    const system = [
      "你是 Kosmoevretis 全球 3C 市场情报分析师，使用中文回答。",
      "严格基于用户提供的情报数据与分析上下文，不得编造数据、来源、销量或市场规模。",
      "数据集中的所有数值都是 DEMO 模拟数据，所有结论必须明确注明是演示数据推演，不可作为真实市场结论。",
      "必须区分来源直接观测、平台信号、第三方估算和 AI 推断；不能把搜索指数、排名、互动量或评论样本称为真实销量。",
      "先给结论，再列证据、市场差异、机会、风险和可执行验证步骤。说明相关性不等于因果关系。",
      "如果数据不足或某项数据缺失，明确说明不足，不要推测成零需求。"
    ].join("\n");
    const user = [
      scope,
      "分析上下文：" + (context || "未提供额外上下文"),
      "用户追问：" + (question || "请根据所选范围给出深入的市场解读与行动建议。"),
      "情报数据 JSON：",
      datasetText
    ].join("\n\n");
    const result = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      max_tokens: 1800,
      temperature: 0.2
    });
    const output = result as { response?: unknown };
    const answer = typeof output?.response === "string" ? output.response : "";
    if (!answer) return json({ error: "模型未返回可展示内容，请稍后重试。" }, 502);
    return json({ answer, model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", evidence_type: "demo" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 分析服务暂不可用。";
    return json({ error: message }, 500);
  }
}
