import { decrypt, requireAdmin, type AIEnv } from "../../../lib/ai";

type Env = AIEnv;
const actorId = "habit.zhou~keyword-suggest-multi";
const json = (data: unknown, status = 200) => Response.json(data, { status });
const safe = async (r: Response) => r.json().catch(() => ({})) as Promise<any>;

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const saved = await env.AI_CONFIG_KV.get("integration:apify");
  if (!saved) return json({ error: "尚未保存 Apify API Token。" }, 400);

  let apiToken = "";
  try {
    const config = JSON.parse(await decrypt(saved, env));
    apiToken = typeof config.apiToken === "string" ? config.apiToken : "";
  } catch {
    return json({ error: "已保存的 Apify 凭证无法解密，请检查 Preview 环境加密配置。" }, 500);
  }
  if (!apiToken) return json({ error: "已保存的 Apify Token 为空，请重新保存。" }, 400);

  const headers = { Authorization: "Bearer " + apiToken, Accept: "application/json" };
  const accountResponse = await fetch("https://api.apify.com/v2/users/me", { headers });
  const account = await safe(accountResponse);
  if (!accountResponse.ok || !account?.data?.id) {
    return json({
      ok: false,
      stage: "account",
      httpStatus: accountResponse.status,
      apifyType: account?.error?.type || null,
      error: "Apify 账号验证失败（HTTP " + accountResponse.status + "）：" + (account?.error?.message || "Apify 未返回有效账号信息。")
    }, 502);
  }

  const actorResponse = await fetch("https://api.apify.com/v2/actors/" + actorId, { headers });
  const actor = await safe(actorResponse);
  if (!actorResponse.ok || !actor?.data?.id) {
    return json({
      ok: false,
      stage: "actor",
      account: { username: account.data.username || null, id: account.data.id },
      actorId,
      httpStatus: actorResponse.status,
      apifyType: actor?.error?.type || null,
      error: actorResponse.status === 404
        ? "Apify 账号验证成功（" + (account.data.username || "账号已识别") + "），但该账号无法通过 API 读取 Actor " + actorId + "（HTTP 404）。这不是 Token 保存失败；需要确认 Actor 的准确标识、公开状态或该账号是否被授权。"
        : "Apify 账号验证成功，但读取 Actor 失败（HTTP " + actorResponse.status + "）：" + (actor?.error?.message || "未知错误。")
    }, 502);
  }

  return json({
    ok: true,
    account: { username: account.data.username || null, id: account.data.id },
    actor: { id: actor.data.id, name: actor.data.name || null, username: actor.data.username || null }
  });
};
