export interface AIEnv {
  AI_CONFIG_KV: { get(key: string): Promise<string | null>; put(key: string, value: string): Promise<void>; delete(key: string): Promise<void>; list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }> };
  AI_ENCRYPTION_KEY: string;
  AI_ADMIN_TOKEN: string;
  AI?: { run(model: string, input: { messages: Array<{ role: "system" | "user" | "assistant"; content: string }>; max_tokens?: number }): Promise<unknown> };
}

export async function requireAdmin(request: Request, env: AIEnv): Promise<Response | null> {
  const expected = env.AI_ADMIN_TOKEN || "";
  const supplied = request.headers.get("X-Kosmo-Admin-Token") || "";
  if (!expected) return Response.json({ error: "管理员访问令牌尚未配置。" }, { status: 503 });
  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(supplied);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] || 0) ^ (b[i] || 0);
  if (diff !== 0) return Response.json({ error: "管理员令牌无效。请在设置页输入平台管理员令牌。" }, { status: 401 });
  return null;
}

export async function encrypt(value: string, env: AIEnv): Promise<string> {
  if (!env.AI_ENCRYPTION_KEY) throw new Error("Encryption key is not configured");
  const raw = Uint8Array.from(atob(env.AI_ENCRYPTION_KEY), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...iv, ...new Uint8Array(data)));
}
export async function decrypt(value: string, env: AIEnv): Promise<string> {
  const bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0));
  const raw = Uint8Array.from(atob(env.AI_ENCRYPTION_KEY), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  return new TextDecoder().decode(data);
}
export const safeConfig = (c: any) => ({ id: c.id, name: c.name, baseUrl: c.baseUrl, model: c.model, enabled: !!c.enabled, hasKey: !!c.apiKey, maskedKey: c.apiKey ? "••••••••" : "" });
