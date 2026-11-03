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

  // Public Actors can be resolved directly by their canonical slug. Do not
  // depend on Store search ranking or authenticated/personalized search results.
  const directResponse = await fetch(
    "https://api.apify.com/v2/actors/" + encodeURIComponent(actorSlug),
    { headers: { Accept: "application/json" } }
  );
  const directActor = await safe(directResponse);
  let resolvedActorId = actorSlug;
  let storeDiagnostics: any = null;

  if (!directResponse.ok || !directActor?.data?.id) {
    // Store listing is public and does not require authentication. Filter only
    // by owner, then match the Actor name locally to avoid search-index misses.
    const storeUrl = new URL("https://api.apify.com/v2/store");
    storeUrl.searchParams.set("username", "habit.zhou");
    storeUrl.searchParams.set("limit", "1000");
    const storeResponse = await fetch(storeUrl.toString(), { headers: { Accept: "application/json" } });
    const store = await safe(storeResponse);
    const storeItems = Array.isArray(store?.data?.items) ? store.data.items : [];
    const listedActor = storeItems.find((item: any) =>
      String(item?.username || "").toLowerCase() === "habit.zhou" &&
      String(item?.name || "").toLowerCase() === "keyword-suggest-multi"
    );
    storeDiagnostics = {
      httpStatus: storeResponse.status,
      total: store?.data?.total ?? null,
      returned: storeItems.length,
      matched: Boolean(listedActor?.id)
    };
    if (listedActor?.id) resolvedActorId = String(listedActor.id);
    else {
      return json({
        ok: false,
        stage: "actor_resolution",
        account: { username: account.data.username || null, id: account.data.id },
        actorSlug,
        directLookup: { httpStatus: directResponse.status, apifyType: directActor?.error?.type || null },
        storeLookup: storeDiagnostics,
        error: "Apify 账号验证成功，但直接读取 Actor 和按开发者筛选 Store 目录均未解析到该 Actor。请确认 Actor 的实际 API 归属或 Apify 平台侧访问状态。"
      }, 502);
    }
  }

  const actorResponse = resolvedActorId === actorSlug && directActor?.data?.id
    ? directResponse
    : await fetch(
        "https://api.apify.com/v2/actors/" + encodeURIComponent(resolvedActorId),
        { headers }
      );
  const actor = resolvedActorId === actorSlug && directActor?.data?.id
    ? directActor
    : await safe(actorResponse);
  if (!actorResponse.ok || !actor?.data?.id) {
    return json({
      ok: false,
      stage: "actor_detail",
      account: { username: account.data.username || null, id: account.data.id },
      actorSlug,
      resolvedActorId,
      storeLookup: storeDiagnostics,
      httpStatus: actorResponse.status,
      apifyType: actor?.error?.type || null,
      error: "已解析 Actor 标识，但读取 Actor 详情失败（HTTP " + actorResponse.status + "）：" + (actor?.error?.message || "未知错误。")
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
