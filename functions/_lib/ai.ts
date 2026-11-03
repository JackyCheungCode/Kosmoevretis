export interface AIEnv {
  AI_CONFIG_KV: { get(key: string): Promise<string | null>; put(key: string, value: string): Promise<void>; delete(key: string): Promise<void>; list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }> };
  AI_ENCRYPTION_KEY: string;
  CF_ACCESS_TEAM_DOMAIN: string;
  CF_ACCESS_AUD: string;
  AI?: { run(model: string, input: { messages: Array<{ role: "system" | "user" | "assistant"; content: string }>; max_tokens?: number }): Promise<unknown> };
}

const b64url = (value: string) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=")), c => c.charCodeAt(0));
export async function requireAdmin(request: Request, env: AIEnv): Promise<Response | null> {
  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD) return Response.json({ error: "Cloudflare Access 尚未配置，管理接口已锁定。" }, { status: 503 });
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return Response.json({ error: "需要 Cloudflare Access 管理员身份验证。" }, { status: 401 });
  try {
    const [head, body, signature] = token.split(".");
    const header = JSON.parse(new TextDecoder().decode(b64url(head)));
    const claims = JSON.parse(new TextDecoder().decode(b64url(body)));
    const issuer = "https://" + env.CF_ACCESS_TEAM_DOMAIN.replace("https://", "").replace("http://", "").replace(/\/$/, "");
    if (header.alg !== "RS256" || claims.iss !== issuer || !(claims.aud || []).includes(env.CF_ACCESS_AUD) || claims.exp * 1000 < Date.now()) throw new Error("invalid claims");
    const jwks = await fetch(`${issuer}/cdn-cgi/access/certs`).then(r => r.json()) as { keys: JsonWebKey[] };
    const jwk = jwks.keys.find(k => k.kid === header.kid);
    if (!jwk) throw new Error("unknown signing key");
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64url(signature), new TextEncoder().encode(`${head}.${body}`));
    if (!valid) throw new Error("invalid signature");
    return null;
  } catch {
    return Response.json({ error: "Cloudflare Access 身份验证失败。" }, { status: 403 });
  }
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
export const safeConfig = (c: any) => ({ id: c.id, name: c.name, baseUrl: c.baseUrl, model: c.model, enabled: !!c.enabled, hasKey: !!c.apiKey, maskedKey: c.apiKey ? "••••••••" + c.apiKey.slice(-4) : "" });
