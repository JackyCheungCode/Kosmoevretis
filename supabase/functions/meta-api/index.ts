import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

type Provider = "facebook_pages" | "whatsapp_business" | "messenger";
type Asset = { id: string; name: string; asset_type: "facebook_page" | "whatsapp_business_account"; details?: Record<string, unknown> };
type RuntimeEnv = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  META_APP_ID: string;
  META_APP_SECRET: string;
  META_OAUTH_REDIRECT_URI: string;
  META_WEBHOOK_VERIFY_TOKEN: string;
  META_GRAPH_API_VERSION: string;
  SETTINGS_ENCRYPTION_KEY: string;
  APP_ORIGIN: string;
};
const encoder = new TextEncoder();
const json = (body: unknown, status = 200, headers: Record<string,string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", ...headers } });
const required = (value: unknown, name: string) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(name + " is not configured");
  return value.trim();
};
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const fromBase64 = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
async function sha256(value: string | Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", typeof value === "string" ? encoder.encode(value) : value);
  return base64url(new Uint8Array(digest));
}
async function constantTimeEqual(a: string, b: string) {
  const left = encoder.encode(a), right = encoder.encode(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i=0;i<length;i++) diff |= (left[i] || 0) ^ (right[i] || 0);
  return diff === 0;
}
async function encryptionKey(env: RuntimeEnv) {
  const secret = required(env.SETTINGS_ENCRYPTION_KEY, "SETTINGS_ENCRYPTION_KEY");
  if (secret.length < 32) throw new Error("SETTINGS_ENCRYPTION_KEY must contain at least 32 characters");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt","decrypt"]);
}
async function encrypt(env: RuntimeEnv, value: string) {
  const key = await encryptionKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(value));
  return { ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))), iv: btoa(String.fromCharCode(...iv)) };
}
async function decrypt(env: RuntimeEnv, ciphertext: string, iv: string) {
  const key = await encryptionKey(env);
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, key, fromBase64(ciphertext));
  return new TextDecoder().decode(clear);
}
function clients(env: RuntimeEnv, authorization?: string) {
  const admin = createClient(required(env.SUPABASE_URL,"SUPABASE_URL"), required(env.SUPABASE_SERVICE_ROLE_KEY,"SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const user = authorization ? createClient(required(env.SUPABASE_URL,"SUPABASE_URL"), required(env.SUPABASE_ANON_KEY,"SUPABASE_ANON_KEY"), { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } }) : null;
  return { admin, user };
}
async function authenticate(env: RuntimeEnv, req: Request, organizationId: string, requireAdmin = true) {
  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 });
  const { admin, user } = clients(env, authorization);
  const { data, error } = await user!.auth.getUser(authorization.slice(7));
  if (error || !data.user) throw new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
  const { data: membership, error: membershipError } = await admin.from("organization_members")
    .select("role").eq("organization_id", organizationId).eq("user_id", data.user.id).maybeSingle();
  if (membershipError || !membership) throw new Response(JSON.stringify({ error: "Organization membership required" }), { status: 403 });
  if (requireAdmin && !["owner","admin"].includes(String(membership.role).toLowerCase())) {
    throw new Response(JSON.stringify({ error: "Organization administrator permission required" }), { status: 403 });
  }
  return { admin, user: data.user, role: membership.role };
}
function graphBase(env: RuntimeEnv) {
  const version = required(env.META_GRAPH_API_VERSION, "META_GRAPH_API_VERSION");
  if (!/^v\d+\.\d+$/.test(version)) throw new Error("META_GRAPH_API_VERSION must look like vNN.N");
  return "https://graph.facebook.com/" + version;
}
async function graphGet(env: RuntimeEnv, path: string, token: string) {
  const url = new URL(graphBase(env) + path);
  url.searchParams.set("access_token", token);
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) throw new Error(String(body?.error?.message || "Meta Graph API request failed"));
  return body;
}
async function discoverAssets(env: RuntimeEnv, provider: Provider, token: string): Promise<{ assets: Asset[]; pageTokens: Record<string,string> }> {
  const assets: Asset[] = [];
  const pageTokens: Record<string,string> = {};
  if (provider === "facebook_pages" || provider === "messenger") {
    let path = "/me/accounts?fields=id,name,access_token,tasks&limit=100";
    for (let page=0;page<5 && path;page++) {
      const result = await graphGet(env, path, token);
      for (const item of Array.isArray(result.data) ? result.data : []) {
        if (!item.id || !item.access_token) continue;
        const id = String(item.id);
        assets.push({ id, name: String(item.name || id), asset_type: "facebook_page", details: { tasks: Array.isArray(item.tasks) ? item.tasks : [] } });
        pageTokens[id] = String(item.access_token);
      }
      const next = result.paging?.next;
      if (!next) break;
      const nextUrl = new URL(next);
      if (nextUrl.hostname !== "graph.facebook.com" || !nextUrl.pathname.startsWith("/")) break;
      path = nextUrl.pathname + nextUrl.search;
    }
  } else {
    const businesses = await graphGet(env, "/me/businesses?fields=id,name&limit=100", token);
    for (const business of Array.isArray(businesses.data) ? businesses.data.slice(0,50) : []) {
      const wabas = await graphGet(env, "/" + encodeURIComponent(String(business.id)) + "/owned_whatsapp_business_accounts?fields=id,name,phone_numbers{id,display_phone_number,verified_name,quality_rating}&limit=100", token);
      for (const item of Array.isArray(wabas.data) ? wabas.data : []) {
        assets.push({ id: String(item.id), name: String(item.name || "WhatsApp Business Account"), asset_type: "whatsapp_business_account", details: { business_id: String(business.id), phone_numbers: item.phone_numbers?.data || [] } });
      }
    }
  }
  return { assets, pageTokens };
}
const scopes: Record<Provider,string[]> = {
  facebook_pages: ["pages_show_list","pages_read_engagement","pages_manage_metadata"],
  messenger: ["pages_show_list","pages_messaging","pages_manage_metadata"],
  whatsapp_business: ["business_management","whatsapp_business_management","whatsapp_business_messaging"],
};
const validProvider = (value: unknown): value is Provider => ["facebook_pages","whatsapp_business","messenger"].includes(String(value));
async function audit(admin: SupabaseClient, organizationId: string, actorId: string | null, action: string, connectionId: string | null, metadata: Record<string,unknown> = {}) {
  await admin.from("crm_channel_audit_logs").insert({ organization_id: organizationId, actor_id: actorId, connection_id: connectionId, action, metadata });
}
async function handleOAuthCallback(req: Request, env: RuntimeEnv) {
  const url = new URL(req.url);
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (error) return Response.redirect(new URL("/meta-channels?meta_error=" + encodeURIComponent(error.slice(0,180)), required(env.APP_ORIGIN,"APP_ORIGIN")), 302);
  const code = required(url.searchParams.get("code"), "OAuth code");
  const state = required(url.searchParams.get("state"), "OAuth state");
  const stateHash = await sha256(state);
  const { admin } = clients(env);
  const now = new Date().toISOString();
  const { data: row, error: lookupError } = await admin.from("crm_channel_oauth_states").select("*")
    .eq("state_hash", stateHash).eq("status","pending").gt("expires_at",now).maybeSingle();
  if (lookupError || !row) return json({ error: "OAuth state is invalid, expired, or already used" }, 400);
  const { data: claimed, error: claimError } = await admin.from("crm_channel_oauth_states").update({ status: "processing" })
    .eq("id",row.id).eq("status","pending").select("id").maybeSingle();
  if (claimError || !claimed) return json({ error: "OAuth state has already been consumed" }, 409);
  try {
    const callback = required(env.META_OAUTH_REDIRECT_URI,"META_OAUTH_REDIRECT_URI");
    const tokenUrl = new URL(graphBase(env) + "/oauth/access_token");
    tokenUrl.searchParams.set("client_id", required(env.META_APP_ID,"META_APP_ID"));
    tokenUrl.searchParams.set("client_secret", required(env.META_APP_SECRET,"META_APP_SECRET"));
    tokenUrl.searchParams.set("redirect_uri", callback);
    tokenUrl.searchParams.set("code", code);
    const tokenResponse = await fetch(tokenUrl);
    const tokenBody = await tokenResponse.json().catch(()=>({}));
    if (!tokenResponse.ok || !tokenBody.access_token) throw new Error(String(tokenBody?.error?.message || "Meta token exchange failed"));
    let accessToken = String(tokenBody.access_token);
    let expiresIn = Number(tokenBody.expires_in || 0);
    try {
      const longUrl = new URL(graphBase(env) + "/oauth/access_token");
      longUrl.searchParams.set("grant_type","fb_exchange_token");
      longUrl.searchParams.set("client_id", required(env.META_APP_ID,"META_APP_ID"));
      longUrl.searchParams.set("client_secret", required(env.META_APP_SECRET,"META_APP_SECRET"));
      longUrl.searchParams.set("fb_exchange_token", accessToken);
      const longResponse = await fetch(longUrl);
      const longBody = await longResponse.json().catch(()=>({}));
      if (longResponse.ok && longBody.access_token) { accessToken = String(longBody.access_token); expiresIn = Number(longBody.expires_in || expiresIn); }
    } catch { /* Keep the short-lived token; UI will surface the expiry metadata. */ }
    const discovered = await discoverAssets(env, row.provider as Provider, accessToken);
    const encryptedUserToken = await encrypt(env, accessToken);
    const encryptedPageTokens = await encrypt(env, JSON.stringify(discovered.pageTokens));
    const expiry = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
    const { error: saveError } = await admin.from("crm_channel_oauth_states").update({
      status: "assets_ready",
      access_token_ciphertext: encryptedUserToken.ciphertext,
      access_token_iv: encryptedUserToken.iv,
      asset_tokens_ciphertext: encryptedPageTokens.ciphertext,
      asset_tokens_iv: encryptedPageTokens.iv,
      token_expires_at: expiry,
      discovered_assets: discovered.assets,
    }).eq("id",row.id);
    if (saveError) throw saveError;
    await audit(admin,row.organization_id,row.user_id,"meta.oauth.assets_discovered",null,{ provider: row.provider, asset_count: discovered.assets.length });
    const target = new URL("/meta-channels/connect", required(env.APP_ORIGIN,"APP_ORIGIN"));
    target.searchParams.set("state",state);
    return Response.redirect(target,302);
  } catch (err) {
    await admin.from("crm_channel_oauth_states").update({ status: "failed" }).eq("id",row.id);
    const message = err instanceof Error ? err.message : "Meta OAuth callback failed";
    const target = new URL("/meta-channels", required(env.APP_ORIGIN,"APP_ORIGIN"));
    target.searchParams.set("meta_error",message.slice(0,180));
    return Response.redirect(target,302);
  }
}
async function handleWebhook(req: Request, env: RuntimeEnv) {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode") || "";
    const token = url.searchParams.get("hub.verify_token") || "";
    const challenge = url.searchParams.get("hub.challenge") || "";
    const expected = required(env.META_WEBHOOK_VERIFY_TOKEN,"META_WEBHOOK_VERIFY_TOKEN");
    if (mode !== "subscribe" || !challenge || !(await constantTimeEqual(token,expected))) return new Response("Forbidden",{status:403});
    return new Response(challenge,{status:200,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}});
  }
  if (req.method !== "POST") return new Response("Method not allowed",{status:405});
  const raw = new Uint8Array(await req.arrayBuffer());
  if (raw.byteLength > 1_000_000) return new Response("Payload too large",{status:413});
  const signature = req.headers.get("X-Hub-Signature-256") || "";
  const match = /^sha256=([a-f0-9]{64})$/i.exec(signature);
  if (!match) return new Response("Invalid signature",{status:401});
  const key = await crypto.subtle.importKey("raw",encoder.encode(required(env.META_APP_SECRET,"META_APP_SECRET")),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC",key,raw));
  const expectedHex = Array.from(expected).map(x=>x.toString(16).padStart(2,"0")).join("");
  if (!(await constantTimeEqual(match[1].toLowerCase(),expectedHex))) return new Response("Invalid signature",{status:401});
  let payload: Record<string,unknown>;
  try { payload = JSON.parse(new TextDecoder().decode(raw)); } catch { return new Response("Invalid JSON",{status:400}); }
  const object = String(payload.object || "");
  const provider = object === "whatsapp_business_account" ? "whatsapp_business" : object === "page" ? "page" : "";
  if (!provider || !Array.isArray(payload.entry)) return new Response("Unsupported event",{status:200});
  const { admin } = clients(env);
  const entries = payload.entry.slice(0,100);
  for (const entry of entries) {
    const assetId = String(entry?.id || "");
    if (!assetId) continue;
    const providers: Provider[] = provider === "whatsapp_business" ? ["whatsapp_business"] : ["facebook_pages","messenger"];
    const { data: connections } = await admin.from("crm_channel_connections").select("id,organization_id,provider")
      .eq("external_asset_id",assetId).eq("status","connected").in("provider",providers);
    for (const connection of connections || []) {
      const digest = await sha256(encoder.encode(JSON.stringify(entry)));
      const dedupeKey = await sha256(String(connection.id) + ":" + object + ":" + digest);
      const { error } = await admin.from("crm_channel_webhook_events").insert({
        organization_id: connection.organization_id, connection_id: connection.id, provider: connection.provider,
        dedupe_key: dedupeKey, provider_event_id: assetId + ":" + digest, payload: { object, entry },
      });
      if (error && error.code !== "23505") throw error;
    }
  }
  return new Response("EVENT_RECEIVED",{status:200,headers:{"Content-Type":"text/plain; charset=utf-8"}});
}
Deno.serve(async (req: Request) => {
  const env = Object.fromEntries(["SUPABASE_URL","SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","META_APP_ID","META_APP_SECRET","META_OAUTH_REDIRECT_URI","META_WEBHOOK_VERIFY_TOKEN","META_GRAPH_API_VERSION","SETTINGS_ENCRYPTION_KEY","APP_ORIGIN"].map(key => [key,Deno.env.get(key) || ""])) as unknown as RuntimeEnv;
  const url = new URL(req.url);
  if (req.method === "OPTIONS") return new Response("ok",{status:200,headers:{"Access-Control-Allow-Origin":env.APP_ORIGIN || "null","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Vary":"Origin"}});
  try {
    if (url.pathname.endsWith("/webhook")) return await handleWebhook(req,env);
    if (url.searchParams.get("action") === "oauth_callback" && req.method === "GET") return await handleOAuthCallback(req,env);
    if (req.method !== "POST") return json({error:"Method not allowed"},405);
    const body = await req.json();
    const organizationId = required(body.organization_id,"organization_id");
    const { admin,user } = await authenticate(env,req,organizationId,true);
    switch (body.action) {
      case "start_oauth": {
        if (!validProvider(body.provider)) return json({error:"Unsupported Meta provider"},400);
        required(env.META_APP_ID,"META_APP_ID");
        required(env.META_APP_SECRET,"META_APP_SECRET");
        required(env.META_OAUTH_REDIRECT_URI,"META_OAUTH_REDIRECT_URI");
        required(env.APP_ORIGIN,"APP_ORIGIN");
        graphBase(env);
        await encryptionKey(env);
        const stateBytes = crypto.getRandomValues(new Uint8Array(32));
        const state = base64url(stateBytes);
        const stateHash = await sha256(state);
        const expiry = new Date(Date.now()+10*60*1000).toISOString();
        const { error } = await admin.from("crm_channel_oauth_states").insert({
          state_hash:stateHash,organization_id:organizationId,user_id:user.id,provider:body.provider,
          requested_scopes:scopes[body.provider],expires_at:expiry,
        });
        if (error) throw error;
        const authUrl = new URL("https://www.facebook.com/" + graphBase(env).split("/").pop() + "/dialog/oauth");
        authUrl.searchParams.set("client_id",required(env.META_APP_ID,"META_APP_ID"));
        authUrl.searchParams.set("redirect_uri",required(env.META_OAUTH_REDIRECT_URI,"META_OAUTH_REDIRECT_URI"));
        authUrl.searchParams.set("state",state);
        authUrl.searchParams.set("response_type","code");
        authUrl.searchParams.set("scope",scopes[body.provider].join(","));
        await audit(admin,organizationId,user.id,"meta.oauth.started",null,{provider:body.provider});
        return json({authorization_url:authUrl.toString(),expires_at:expiry});
      }
      case "list_connections": {
        const {data,error}=await admin.from("crm_channel_connections")
          .select("id,provider,external_asset_id,display_name,status,scopes,token_expires_at,last_validated_at,provider_metadata,created_at,updated_at")
          .eq("organization_id",organizationId).order("created_at",{ascending:false});
        if(error) throw error;
        return json({connections:data||[]});
      }
      case "list_oauth_assets": {
        const state=required(body.state,"state");
        const stateHash=await sha256(state);
        const {data,error}=await admin.from("crm_channel_oauth_states").select("provider,discovered_assets,expires_at")
          .eq("state_hash",stateHash).eq("organization_id",organizationId).eq("user_id",user.id).eq("status","assets_ready").gt("expires_at",new Date().toISOString()).maybeSingle();
        if(error||!data) return json({error:"OAuth asset selection has expired or is unavailable"},404);
        return json({provider:data.provider,assets:data.discovered_assets||[],expires_at:data.expires_at});
      }
      case "complete_connection": {
        const state=required(body.state,"state"), assetId=required(body.asset_id,"asset_id");
        const stateHash=await sha256(state);
        const {data:oauth,error:oauthError}=await admin.from("crm_channel_oauth_states").select("*")
          .eq("state_hash",stateHash).eq("organization_id",organizationId).eq("user_id",user.id).eq("status","assets_ready").gt("expires_at",new Date().toISOString()).maybeSingle();
        if(oauthError||!oauth) return json({error:"OAuth state expired or already consumed"},409);
        const asset=(oauth.discovered_assets as Asset[]).find(item=>item.id===assetId);
        if(!asset) return json({error:"Selected asset was not authorized by Meta"},403);
        const {data:claim,error:claimError}=await admin.from("crm_channel_oauth_states").update({status:"processing"})
          .eq("id",oauth.id).eq("status","assets_ready").select("id").maybeSingle();
        if(claimError||!claim) return json({error:"OAuth state is already being completed"},409);
        const provider=oauth.provider as Provider;
        if((provider==="whatsapp_business") !== (asset.asset_type==="whatsapp_business_account")) return json({error:"Asset type does not match channel"},400);
        let token=await decrypt(env,oauth.access_token_ciphertext,oauth.access_token_iv);
        if(asset.asset_type==="facebook_page"){
          const tokens=JSON.parse(await decrypt(env,oauth.asset_tokens_ciphertext,oauth.asset_tokens_iv)) as Record<string,string>;
          token=required(tokens[asset.id],"Page access token");
        }
        const encrypted=await encrypt(env,token);
        const {data:connection,error:connectionError}=await admin.from("crm_channel_connections").upsert({
          organization_id:organizationId,provider,external_asset_id:asset.id,display_name:asset.name,status:"connected",
          scopes:oauth.requested_scopes,token_expires_at:oauth.token_expires_at,
          provider_metadata:{asset_type:asset.asset_type,...(asset.details||{})},created_by:user.id,updated_at:new Date().toISOString(),
        },{onConflict:"organization_id,provider,external_asset_id"}).select("id").single();
        if(connectionError||!connection) throw connectionError||new Error("Unable to save Meta connection");
        const {error:credentialError}=await admin.from("crm_channel_credentials").upsert({
          connection_id:connection.id,access_token_ciphertext:encrypted.ciphertext,access_token_iv:encrypted.iv,updated_at:new Date().toISOString(),
        },{onConflict:"connection_id"});
        if(credentialError) throw credentialError;
        const {error:consumeError}=await admin.from("crm_channel_oauth_states").update({status:"consumed",consumed_at:new Date().toISOString(),access_token_ciphertext:null,access_token_iv:null,asset_tokens_ciphertext:null,asset_tokens_iv:null})
          .eq("id",oauth.id).eq("status","processing");
        if(consumeError) throw consumeError;
        await audit(admin,organizationId,user.id,"meta.connection.created",connection.id,{provider,asset_id:asset.id});
        return json({success:true,connection_id:connection.id});
      }
      case "disconnect_connection": {
        const connectionId=required(body.connection_id,"connection_id");
        const {data:connection,error}=await admin.from("crm_channel_connections").update({status:"disconnected",updated_at:new Date().toISOString()})
          .eq("id",connectionId).eq("organization_id",organizationId).select("id,provider").maybeSingle();
        if(error||!connection) return json({error:"Meta connection not found"},404);
        await admin.from("crm_channel_credentials").delete().eq("connection_id",connectionId);
        await audit(admin,organizationId,user.id,"meta.connection.disconnected",connectionId,{provider:connection.provider});
        return json({success:true});
      }
      default: return json({error:"Unsupported action"},400);
    }
  } catch (error) {
    if (error instanceof Response) return new Response(error.body,{status:error.status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
    const message=error instanceof Error?error.message:"Unexpected Meta integration error";
    return json({error:message},url.pathname.endsWith("/webhook") ? 500 : 400);
  }
});
