import { decrypt, encrypt, requireAdmin, type AIEnv } from "../../lib/ai";

type Env = AIEnv;
const key = "integration:apify";
export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const denied = await requireAdmin(request, env); if (denied) return denied;
  const saved = await env.AI_CONFIG_KV.get(key);
  return Response.json({ hasToken: !!saved });
};
export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const denied = await requireAdmin(request, env); if (denied) return denied;
  let body: any; try { body = await request.json(); } catch { return Response.json({ error: "无效 JSON" }, { status: 400 }); }
  const apiToken = typeof body?.apiToken === "string" ? body.apiToken.trim() : "";
  if (!apiToken || apiToken.length > 4096) return Response.json({ error: "请输入有效的 Apify API Token。" }, { status: 400 });
  await env.AI_CONFIG_KV.put(key, await encrypt(JSON.stringify({ apiToken, updatedAt: new Date().toISOString() }), env));
  return Response.json({ ok: true, hasToken: true });
};
export const onRequestDelete = async ({ request, env }: { request: Request; env: Env }) => {
  const denied = await requireAdmin(request, env); if (denied) return denied;
  await env.AI_CONFIG_KV.delete(key);
  return Response.json({ ok: true, hasToken: false });
};
