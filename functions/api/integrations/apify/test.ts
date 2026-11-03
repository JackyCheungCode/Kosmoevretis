import { decrypt, requireAdmin, type AIEnv } from "../../../lib/ai";

type Env = AIEnv;
const actorSlug = "habit.zhou~keyword-suggest-multi";
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

  // Resolve the public Store listing first. Its immutable Actor ID avoids ambiguity
  // between the Store slug and API resource identifier.
  const storeUrl = new URL("https://api.apify.com/v2/store");
  storeUrl.searchParams.set("search", "keyword-suggest-multi");
  storeUrl.searchParams.set("username", "habit.zhou");
  storeUrl.searchParams.set("limit", "20");
  const storeResponse = await fetch(storeUrl.toString(), { headers });
  const store = await safe(storeResponse);
  const storeItems = Array.isArray(store?.data?.items) ? store.data.items : [];
  const listedActor = storeItems.find((item: any) =>
    String(item?.username || "").toLowerCase() === "habit.zhou" &&
    String(item?.name || "").toLowerCase() === "keyword-suggest-multi"
  );

  if (!storeResponse.ok || !listedActor?.id) {
    return json({
      ok: false,
      stage: "store_lookup",
      account: { username: account.data.username || null, id: account.data.id },
      actorSlug,
      httpStatus: storeResponse.status,
      storeMatches: storeItems.slice(0, 5).map((item: any) => ({
        id: item.id || null, username: item.username || null, name: item.name || null, isPublic: item.isPublic ?? null
      })),
      error: "Apify 账号验证成功，但 Store 公开目录未能解析到指定 Actor（" + actorSlug + "）。Store API HTTP " + storeResponse.status + "。请核对 Actor 是否仍公开发布、是否改名或已下架。"
    }, 502);
  }

  const actorResponse = await fetch(
    "https://api.apify.com/v2/actors/" + encodeURIComponent(listedActor.id),
    { headers }
  );
  const actor = await safe(actorResponse);
  if (!actorResponse.ok || !actor?.data?.id) {
    return json({
      ok: false,
      stage: "actor_by_store_id",
      account: { username: account.data.username || null, id: account.data.id },
      actorSlug,
      storeActor: {
        id: listedActor.id,
        username: listedActor.username || null,
        name: listedActor.name || null,
        isPublic: listedActor.isPublic ?? null
      },
      httpStatus: actorResponse.status,
      apifyType: actor?.error?.type || null,
      error: "Store 已找到该 Actor，但通过其固定 Actor ID 读取详情失败（HTTP " + actorResponse.status + "）：" + (actor?.error?.message || "未知错误。")
    }, 502);
  }

  return json({
    ok: true,
    account: { username: account.data.username || null, id: account.data.id },
    actor: {
      id: actor.data.id,
      name: actor.data.name || null,
      username: actor.data.username || null,
      isPublic: actor.data.isPublic ?? null
    },
    resolution: "store_immutable_id"
  });
};
