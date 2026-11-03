import { decrypt, requireAdmin, type AIEnv } from "../../_lib/ai";

export const onRequestPost = async ({ request, env }: { request: Request; env: AIEnv }) => {
  const denied = await requireAdmin(request, env); if (denied) return denied;
  let body: any; try { body = await request.json(); } catch { return Response.json({ error: "无效 JSON" }, { status: 400 }); }
  const id = String(body?.id || "");
  if (id === "cloudflare") {
    if (!env.AI) return Response.json({ error: "Workers AI 绑定未配置。" }, { status: 503 });
    try {
      const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { messages: [{ role: "user", content: "请只回复：Kosmoevretis Workers AI 连接测试成功。" }], max_tokens: 100 });
      return Response.json({ ok: true, provider: "Cloudflare Workers AI", model: "@cf/meta/llama-3.1-8b-instruct", result });
    } catch (e) { return Response.json({ error: e instanceof Error ? e.message : "Workers AI 调用失败" }, { status: 502 }); }
  }
  const raw = await env.AI_CONFIG_KV.get(`provider:${id}`);
  if (!raw) return Response.json({ error: "尚未保存该服务商配置。" }, { status: 404 });
  const config = JSON.parse(await decrypt(raw, env));
  if (!config.apiKey) return Response.json({ error: "缺少 API Key。" }, { status: 400 });
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.model, messages: [{ role: "user", content: "请只回复：Kosmoevretis AI 连接测试成功。" }], max_tokens: 80 })
    });
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) return Response.json({ error: data.error?.message || data.message || `服务商返回 HTTP ${response.status}` }, { status: 502 });
    return Response.json({ ok: true, provider: config.name, model: config.model, result: data.choices?.[0]?.message?.content || data });
  } catch (e) { return Response.json({ error: e instanceof Error ? e.message : "连接失败" }, { status: 502 }); }
};
