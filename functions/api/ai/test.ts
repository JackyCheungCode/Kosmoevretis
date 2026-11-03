import { requireAdmin, type AIEnv } from "../../lib/ai";

export const onRequestPost = async ({ request, env }: { request: Request; env: AIEnv }) => {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (!env.AI) return Response.json({ error: "Workers AI binding is not configured." }, { status: 503 });
  let body: { model?: string; prompt?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const model = body.model || "@cf/meta/llama-3.1-8b-instruct";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (model !== "@cf/meta/llama-3.1-8b-instruct") return Response.json({ error: "Model is not enabled." }, { status: 400 });
  if (!prompt || prompt.length > 12000) return Response.json({ error: "Prompt must contain 1–12000 characters." }, { status: 400 });
  try {
    const result = await env.AI.run(model, { messages: [
      { role: "system", content: "你是 Kosmoevretis 企业经营分析助手。请使用简体中文回答，明确区分事实、推断和建议；不得编造未提供的数据。" },
      { role: "user", content: prompt }
    ], max_tokens: 1200 });
    return Response.json({ ok: true, provider: "Cloudflare Workers AI", model, result });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Workers AI request failed." }, { status: 502 }); }
};
