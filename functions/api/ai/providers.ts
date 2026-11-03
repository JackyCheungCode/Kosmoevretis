import { decrypt, encrypt, requireAdmin, safeConfig, type AIEnv } from "../../lib/ai";

const validId = /^[a-z0-9-]{2,40}$/;
export const onRequestGet = async ({ request, env }: { request: Request; env: AIEnv }) => {
  const denied = await requireAdmin(request, env); if (denied) return denied;
  const keys = await env.AI_CONFIG_KV.list({ prefix: "provider:" });
  const configs = await Promise.all(keys.keys.map(async k => safeConfig(JSON.parse(await decrypt((await env.AI_CONFIG_KV.get(k.name))!, env)))));
  return Response.json({ providers: configs });
};
export const onRequestPost = async ({ request, env }: { request: Request; env: AIEnv }) => {
  const denied = await requireAdmin(request, env); if (denied) return denied;
  let body: any; try { body = await request.json(); } catch { return Response.json({ error: "无效 JSON" }, { status: 400 }); }
  const { id, name, baseUrl, model, apiKey, enabled } = body || {};
  if (!validId.test(id || "") || !name?.trim() || !model?.trim() || !/^https:\/\//i.test(baseUrl || "")) return Response.json({ error: "请填写有效服务商 ID、名称、HTTPS API 地址和模型 ID。" }, { status: 400 });
  const key = `provider:${id}`;
  const previous = await env.AI_CONFIG_KV.get(key);
  const old = previous ? JSON.parse(await decrypt(previous, env)) : {};
  const next = { id, name: String(name).slice(0,80), baseUrl: String(baseUrl).replace(/\/$/, ""), model: String(model).slice(0,160), apiKey: typeof apiKey === "string" && apiKey.trim() ? apiKey.trim() : old.apiKey || "", enabled: !!enabled };
  if (!next.apiKey) return Response.json({ error: "首次保存必须填写 API Key。" }, { status: 400 });
  await env.AI_CONFIG_KV.put(key, await encrypt(JSON.stringify(next), env));
  return Response.json({ ok: true, provider: safeConfig(next) });
};
export const onRequestDelete = async ({ request, env }: { request: Request; env: AIEnv }) => {
  const denied = await requireAdmin(request, env); if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!validId.test(id)) return Response.json({ error: "无效服务商 ID" }, { status: 400 });
  await env.AI_CONFIG_KV.delete(`provider:${id}`);
  return Response.json({ ok: true });
};
