import { decrypt, requireAdmin, type AIEnv } from "../../lib/ai";

export const onRequestPost = async ({ request, env }: { request: Request; env: AIEnv }) => {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "无效 JSON" }, { status: 400 }); }
  const id = String(body?.provider || "");
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > 30000) return Response.json({ error: "请输入 1–30000 字符的分析内容。" }, { status: 400 });

  if (id === "cloudflare") {
    if (!env.AI) return Response.json({ error: "Workers AI 绑定未配置。" }, { status: 503 });
    try {
      const result = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
        messages: [
          { role: "system", content: "你是 Kosmoevretis 企业经营分析助手。使用简体中文，区分事实、推断和建议，不得编造数据。" },
          { role: "user", content: prompt }
        ],
        max_tokens: 1800
      });
      return Response.json({ ok: true, provider: "Cloudflare Workers AI", result });
    } catch (e) {
      return Response.json({ error: e instanceof Error ? e.message : "模型调用失败" }, { status: 502 });
    }
  }

  const raw = await env.AI_CONFIG_KV.get(`provider:${id}`);
  if (!raw) return Response.json({ error: "服务商尚未配置。" }, { status: 404 });
  const cfg = JSON.parse(await decrypt(raw, env));
  if (!cfg.enabled) return Response.json({ error: "该服务商配置当前未启用。" }, { status: 409 });

  try {
    let response: Response;
    if (id === "anthropic") {
      response = await fetch(`${cfg.baseUrl}/messages`, {
        method: "POST",
        headers: { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({
          model: cfg.model,
          max_tokens: 1800,
          system: "你是 Kosmoevretis 企业经营分析助手。使用简体中文，区分事实、推断和建议，不得编造数据。",
          messages: [{ role: "user", content: prompt }]
        })
      });
    } else {
      response = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: cfg.model,
          max_tokens: 1800,
          messages: [
            { role: "system", content: "你是 Kosmoevretis 企业经营分析助手。使用简体中文，区分事实、推断和建议，不得编造数据。" },
            { role: "user", content: prompt }
          ]
        })
      });
    }
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) return Response.json({ error: data.error?.message || data.message || `服务商返回 HTTP ${response.status}` }, { status: 502 });
    const result = id === "anthropic"
      ? data.content?.map((x: any) => x.text || "").join("\\n")
      : data.choices?.[0]?.message?.content;
    return Response.json({ ok: true, provider: cfg.name, model: cfg.model, result: result ?? data });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "模型调用失败" }, { status: 502 });
  }
};
