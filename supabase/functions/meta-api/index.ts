import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

type Provider = "facebook_pages" | "whatsapp_business" | "messenger";
type Asset = { id: string; name: string; asset_type: "facebook_page" | "whatsapp_business_account"; details?: Record<string, unknown> };
type RuntimeEnv = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
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
function graphBase(versionValue: string) {
  const version = required(versionValue, "Graph API version");
  if (!/^v\d+\.\d+$/.test(version)) throw new Error("Graph API version must look like vNN.N");
  return "https://graph.facebook.com/" + version;
}
async function graphGet(version: string, path: string, token: string) {
  const url = new URL(graphBase(version) + path);
  url.searchParams.set("access_token", token);
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) throw new Error(String(body?.error?.message || "Meta Graph API request failed"));
  return body;
}
async function graphPost(version:string,path:string,token:string,params:Record<string,unknown>={}) {
  const url = new URL(graphBase(version) + path);
  const body = new URLSearchParams(); body.set("access_token",token);
  for (const [key,value] of Object.entries(params)) if (value !== undefined && value !== null) body.set(key,typeof value === "string" ? value : JSON.stringify(value));
  const response = await fetch(url,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json"},body});
  const result = await response.json().catch(()=>({}));
  if (!response.ok || result.error) throw new Error(String(result?.error?.message || "Meta Graph API request failed"));
  return result;
}
async function discoverAssets(version: string, provider: Provider, token: string): Promise<{ assets: Asset[]; pageTokens: Record<string,string> }> {
  const assets: Asset[] = [];
  const pageTokens: Record<string,string> = {};
  if (provider === "facebook_pages" || provider === "messenger") {
    let path = "/me/accounts?fields=id,name,access_token,tasks&limit=100";
    for (let page=0;page<5 && path;page++) {
      const result = await graphGet(version, path, token);
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
    const businesses = await graphGet(version, "/me/businesses?fields=id,name&limit=100", token);
    for (const business of Array.isArray(businesses.data) ? businesses.data.slice(0,50) : []) {
      const wabas = await graphGet(version, "/" + encodeURIComponent(String(business.id)) + "/owned_whatsapp_business_accounts?fields=id,name,phone_numbers{id,display_phone_number,verified_name,quality_rating}&limit=100", token);
      for (const item of Array.isArray(wabas.data) ? wabas.data : []) {
        assets.push({ id: String(item.id), name: String(item.name || "WhatsApp Business Account"), asset_type: "whatsapp_business_account", details: { business_id: String(business.id), phone_numbers: item.phone_numbers?.data || [] } });
      }
    }
  }
  return { assets, pageTokens };
}
const scopes: Record<Provider,string[]> = {
  facebook_pages: ["pages_show_list","pages_read_engagement","pages_manage_metadata","pages_manage_posts","pages_manage_engagement","pages_read_user_content","read_insights"],
  messenger: ["pages_show_list","pages_messaging","pages_manage_metadata","pages_read_engagement"],
  whatsapp_business: ["business_management","whatsapp_business_management","whatsapp_business_messaging"],
};
const validProvider = (value: unknown): value is Provider => ["facebook_pages","whatsapp_business","messenger"].includes(String(value));
async function audit(admin: SupabaseClient, organizationId: string, actorId: string | null, action: string, connectionId: string | null, metadata: Record<string,unknown> = {}) {
  await admin.from("crm_channel_audit_logs").insert({ organization_id: organizationId, actor_id: actorId, connection_id: connectionId, action, metadata });
}
type MetaAppConfig = {
  organization_id: string; app_id: string; app_secret_ciphertext: string; app_secret_iv: string;
  webhook_verify_token_ciphertext: string; webhook_verify_token_iv: string; graph_api_version: string;
};
async function getMetaConfig(admin: SupabaseClient, env: RuntimeEnv, organizationId: string) {
  const { data, error } = await admin.from("crm_meta_app_configs").select("*")
    .eq("organization_id", organizationId).eq("enabled", true).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Meta App 尚未由当前组织管理员配置");
  return { config: data as MetaAppConfig,
    appSecret: await decrypt(env, data.app_secret_ciphertext, data.app_secret_iv),
    verifyToken: await decrypt(env, data.webhook_verify_token_ciphertext, data.webhook_verify_token_iv) };
}
async function appSignatureMatches(raw: Uint8Array, signature: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, raw));
  const hex = Array.from(digest).map(x => x.toString(16).padStart(2,"0")).join("");
  return constantTimeEqual(signature, hex);
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
    const meta = await getMetaConfig(admin, env, row.organization_id);
    const callback = new URL("/functions/v1/meta-api?action=oauth_callback", required(env.SUPABASE_URL,"SUPABASE_URL")).toString();
    const tokenUrl = new URL(graphBase(meta.config.graph_api_version) + "/oauth/access_token");
    tokenUrl.searchParams.set("client_id", meta.config.app_id);
    tokenUrl.searchParams.set("client_secret", meta.appSecret);
    tokenUrl.searchParams.set("redirect_uri", callback);
    tokenUrl.searchParams.set("code", code);
    const tokenResponse = await fetch(tokenUrl);
    const tokenBody = await tokenResponse.json().catch(()=>({}));
    if (!tokenResponse.ok || !tokenBody.access_token) throw new Error(String(tokenBody?.error?.message || "Meta token exchange failed"));
    let accessToken = String(tokenBody.access_token);
    let expiresIn = Number(tokenBody.expires_in || 0);
    try {
      const longUrl = new URL(graphBase(meta.config.graph_api_version) + "/oauth/access_token");
      longUrl.searchParams.set("grant_type","fb_exchange_token");
      longUrl.searchParams.set("client_id", meta.config.app_id);
      longUrl.searchParams.set("client_secret", meta.appSecret);
      longUrl.searchParams.set("fb_exchange_token", accessToken);
      const longResponse = await fetch(longUrl);
      const longBody = await longResponse.json().catch(()=>({}));
      if (longResponse.ok && longBody.access_token) { accessToken = String(longBody.access_token); expiresIn = Number(longBody.expires_in || expiresIn); }
    } catch { /* Keep the short-lived token; UI will surface the expiry metadata. */ }
    let grantedScopes: string[] = [];
    try {
      const permissionResult = await graphGet(meta.config.graph_api_version, "/me/permissions", accessToken);
      grantedScopes = (Array.isArray(permissionResult.data) ? permissionResult.data : [])
        .filter((item: {permission?:string;status?:string}) => item.status === "granted" && typeof item.permission === "string")
        .map((item: {permission:string}) => item.permission);
    } catch { /* Keep the actual-grant list empty if Meta does not return permission metadata. */ }
    const discovered = await discoverAssets(meta.config.graph_api_version, row.provider as Provider, accessToken);
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
      granted_scopes: grantedScopes,
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

function webhookTime(value:unknown){const n=Number(value||0);return new Date(n>0?(n<1e12?n*1000:n):Date.now()).toISOString();}
async function normalizeWebhookEntry(admin:SupabaseClient,connection:{id:string;organization_id:string;provider:string},object:string,entry:Record<string,any>){
  const org=connection.organization_id,connectionId=connection.id;
  if(object==="whatsapp_business_account"&&connection.provider==="whatsapp_business"){
    for(const change of Array.isArray(entry.changes)?entry.changes:[]){
      const value=change?.value||{};
      for(const msg of Array.isArray(value.messages)?value.messages:[]){
        const sender=String(msg.from||"");const providerId=String(msg.id||"");if(!sender||!providerId)continue;
        const contact=(Array.isArray(value.contacts)?value.contacts:[]).find((x:any)=>String(x.wa_id||"")===sender);
        const type=String(msg.type||"text");const interactiveText=String(msg.interactive?.button_reply?.title||msg.interactive?.list_reply?.title||msg.button?.text||msg.location?.name||"");const text=String(msg.text?.body||msg.caption||interactiveText||"");
        const media=msg[type]&&typeof msg[type]==="object"?[{type,id:msg[type].id||null,mime_type:msg[type].mime_type||null,filename:msg[type].filename||null,caption:msg[type].caption||null}]:[];
        const received=webhookTime(msg.timestamp);
        const {data:conversation,error:conversationError}=await admin.from("crm_channel_conversations").upsert({organization_id:org,connection_id:connectionId,channel:"whatsapp_business",external_conversation_id:sender,external_contact_id:sender,participant_summary:{id:sender,name:contact?.profile?.name||sender,phone:sender},status:"open",last_message_at:received,updated_at:received},{onConflict:"connection_id,external_conversation_id"}).select("id").single();
        if(conversationError||!conversation)throw conversationError||new Error("Unable to create WhatsApp conversation");
        const {error:messageError}=await admin.from("crm_channel_messages").upsert({organization_id:org,conversation_id:conversation.id,connection_id:connectionId,provider_message_id:providerId,direction:"inbound",sender_external_id:sender,body_text:text||("[WhatsApp "+type+" message]"),attachment_metadata:media,delivery_status:"received",provider_metadata:{type,context:msg.context||null,interactive:msg.interactive||null},received_at:received},{onConflict:"connection_id,provider_message_id",ignoreDuplicates:true});
        if(messageError)throw messageError;
      }
      for(const status of Array.isArray(value.statuses)?value.statuses:[]){
        const state=String(status.status||"");const mapped=["sent","delivered","read","failed"].includes(state)?state:null;
        if(mapped&&status.id)await admin.from("crm_channel_messages").update({delivery_status:mapped,provider_metadata:{status,updated_by_webhook:true}}).eq("connection_id",connectionId).eq("provider_message_id",String(status.id));
      }
    }
  }
  if(object==="page"&&connection.provider==="messenger"){
    for(const event of Array.isArray(entry.messaging)?entry.messaging:[]){
      const sender=String(event?.sender?.id||"");const recipient=String(event?.recipient?.id||"");const page=String(event?.recipient?.id||entry.id||"");const message=event?.message||{};const postback=event?.postback||null;
      if(Array.isArray(event?.delivery?.mids)){for(const mid of event.delivery.mids)await admin.from("crm_channel_messages").update({delivery_status:"delivered",provider_metadata:{messenger_delivery:event.delivery}}).eq("connection_id",connectionId).eq("provider_message_id",String(mid));continue;}
      if(event?.read?.watermark&&recipient){const {data:readConversation}=await admin.from("crm_channel_conversations").select("id").eq("connection_id",connectionId).eq("external_conversation_id",recipient).maybeSingle();if(readConversation)await admin.from("crm_channel_messages").update({delivery_status:"read",provider_metadata:{messenger_read:event.read}}).eq("connection_id",connectionId).eq("conversation_id",readConversation.id).eq("direction","outbound").lte("created_at",webhookTime(event.read.watermark));continue;}
      const messageId=String(message.mid||(postback?"postback:"+String(event.timestamp||"")+":"+sender+":"+String(postback.payload||postback.title||""):""));if(!sender||!messageId||message.is_echo)continue;
      const received=webhookTime(event.timestamp);const attachments=Array.isArray(message.attachments)?message.attachments:[];
      const {data:conversation,error:conversationError}=await admin.from("crm_channel_conversations").upsert({organization_id:org,connection_id:connectionId,channel:"messenger",external_conversation_id:sender,external_contact_id:sender,participant_summary:{id:sender,name:sender},status:"open",last_message_at:received,updated_at:received},{onConflict:"connection_id,external_conversation_id"}).select("id").single();
      if(conversationError||!conversation)throw conversationError||new Error("Unable to create Messenger conversation");
      const {error:messageError}=await admin.from("crm_channel_messages").upsert({organization_id:org,conversation_id:conversation.id,connection_id:connectionId,provider_message_id:messageId,direction:"inbound",sender_external_id:sender,body_text:String(message.text||message.quick_reply?.payload||(postback?"[按钮点击] "+String(postback.title||postback.payload||""):(attachments.length?"[Messenger attachment]":"[Messenger event]"))),attachment_metadata:attachments,delivery_status:"received",provider_metadata:{page_id:page,quick_reply:message.quick_reply||null,postback},received_at:received},{onConflict:"connection_id,provider_message_id",ignoreDuplicates:true});
      if(messageError)throw messageError;
    }
  }
  if(object==="page"&&connection.provider==="facebook_pages"){
    for(const change of Array.isArray(entry.changes)?entry.changes:[]){
      const value=change?.value||{};if(String(value.item||"")==="post"&&String(value.verb||"")==="add"){const externalPostId=String(value.post_id||value.id||"");if(externalPostId)await admin.from("crm_channel_posts").update({status:"published",published_at:webhookTime(value.created_time),provider_response:{webhook:value},updated_at:new Date().toISOString()}).eq("connection_id",connectionId).eq("external_post_id",externalPostId);continue;}if(String(value.item||"")!=="comment"||!value.comment_id||!value.post_id)continue;
      await admin.from("crm_channel_post_comments").upsert({organization_id:org,connection_id:connectionId,external_post_id:String(value.post_id),external_comment_id:String(value.comment_id),author_external_id:value.from?.id||null,author_name:value.from?.name||null,message_text:String(value.message||""),provider_created_at:webhookTime(value.created_time),provider_metadata:value},{onConflict:"connection_id,external_comment_id"});
    }
  }
}

async function handleWebhook(req: Request, env: RuntimeEnv) {
  const { admin } = clients(env);
  const { data: configs, error: configError } = await admin.from("crm_meta_app_configs").select("*").eq("enabled", true).limit(500);
  if (configError) throw configError;
  if (req.method === "GET") {
    const url = new URL(req.url), mode = url.searchParams.get("hub.mode") || "", token = url.searchParams.get("hub.verify_token") || "", challenge = url.searchParams.get("hub.challenge") || "";
    if (mode !== "subscribe" || !challenge) return new Response("Forbidden",{status:403});
    for (const row of configs || []) {
      const expected = await decrypt(env,row.webhook_verify_token_ciphertext,row.webhook_verify_token_iv);
      if (await constantTimeEqual(token,expected)) return new Response(challenge,{status:200,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}});
    }
    return new Response("Forbidden",{status:403});
  }
  if (req.method !== "POST") return new Response("Method not allowed",{status:405});
  const raw = new Uint8Array(await req.arrayBuffer());
  if (raw.byteLength > 1_000_000) return new Response("Payload too large",{status:413});
  const match = /^sha256=([a-f0-9]{64})$/i.exec(req.headers.get("X-Hub-Signature-256") || "");
  if (!match) return new Response("Invalid signature",{status:401});
  let matchedConfig: MetaAppConfig | null = null;
  for (const row of configs || []) {
    const secret = await decrypt(env,row.app_secret_ciphertext,row.app_secret_iv);
    if (await appSignatureMatches(raw,match[1].toLowerCase(),secret)) { matchedConfig = row as MetaAppConfig; break; }
  }
  if (!matchedConfig) return new Response("Invalid signature",{status:401});
  let payload: Record<string,unknown>;
  try { payload = JSON.parse(new TextDecoder().decode(raw)); } catch { return new Response("Invalid JSON",{status:400}); }
  const object = String(payload.object || "");
  const provider = object === "whatsapp_business_account" ? "whatsapp_business" : object === "page" ? "page" : "";
  if (!provider || !Array.isArray(payload.entry)) return new Response("EVENT_RECEIVED",{status:200});
  for (const entry of payload.entry.slice(0,100)) {
    const assetId = String(entry?.id || ""); if (!assetId) continue;
    const providers: Provider[] = provider === "whatsapp_business" ? ["whatsapp_business"] : ["facebook_pages","messenger"];
    const { data: connections, error: lookupError } = await admin.from("crm_channel_connections").select("id,organization_id,provider")
      .eq("organization_id",matchedConfig.organization_id).eq("external_asset_id",assetId).eq("status","connected").in("provider",providers);
    if (lookupError) throw lookupError;
    for (const connection of connections || []) {
      const digest=await sha256(encoder.encode(JSON.stringify(entry))), dedupeKey=await sha256(String(connection.id)+":"+object+":"+digest);
      const {data:stored,error}=await admin.from("crm_channel_webhook_events").insert({organization_id:connection.organization_id,connection_id:connection.id,provider:connection.provider,dedupe_key:dedupeKey,provider_event_id:assetId+":"+digest,payload:{object,entry}}).select("id").maybeSingle();
      if(error&&error.code!=="23505") throw error;
      let eventId=stored?.id||null;
      if(!eventId&&error?.code==="23505"){
        const {data:existingEvent}=await admin.from("crm_channel_webhook_events").select("id,processing_status").eq("dedupe_key",dedupeKey).maybeSingle();
        if(existingEvent?.processing_status==="retry")eventId=existingEvent.id;
      }
      if(eventId){
        try{
          await normalizeWebhookEntry(admin,connection,object,entry);
          const {error:processedError}=await admin.from("crm_channel_webhook_events").update({processing_status:"processed",processed_at:new Date().toISOString(),last_error_code:null,last_error_message:null}).eq("id",eventId);
          if(processedError)throw processedError;
        }catch(processingError){
          await admin.from("crm_channel_webhook_events").update({processing_status:"retry",retry_count:1,last_error_code:"normalization_failed",last_error_message:(processingError instanceof Error?processingError.message:"Webhook normalization failed").slice(0,500)}).eq("id",eventId);
          throw processingError;
        }
      }
    }
  }
  return new Response("EVENT_RECEIVED",{status:200,headers:{"Content-Type":"text/plain; charset=utf-8"}});
}
Deno.serve(async (req: Request) => {
  const env = Object.fromEntries(["SUPABASE_URL","SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","SETTINGS_ENCRYPTION_KEY","APP_ORIGIN"].map(key => [key,Deno.env.get(key) || ""])) as unknown as RuntimeEnv;
  const url = new URL(req.url);
  if (req.method === "OPTIONS") return new Response("ok",{status:200,headers:{"Access-Control-Allow-Origin":env.APP_ORIGIN || "null","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Vary":"Origin"}});
  try {
    if (url.pathname.endsWith("/webhook")) return await handleWebhook(req,env);
    if (url.searchParams.get("action") === "oauth_callback" && req.method === "GET") return await handleOAuthCallback(req,env);
    if (req.method !== "POST") return json({error:"Method not allowed"},405);
    const body = await req.json();
    const organizationId = required(body.organization_id,"organization_id");
    const { admin,user } = await authenticate(env,req,organizationId,body.action !== "list_connections");
    switch (body.action) {
      case "config_get": {
        const {data,error}=await admin.from("crm_meta_app_configs").select("app_id,graph_api_version,enabled,validation_status,validation_message,last_validated_at,updated_at").eq("organization_id",organizationId).maybeSingle();
        if(error) throw error;
        return json({config:data?{...data,has_app_secret:true,has_webhook_verify_token:true}:null,
          oauth_redirect_uri:new URL("/functions/v1/meta-api?action=oauth_callback",required(env.SUPABASE_URL,"SUPABASE_URL")).toString(),
          webhook_url:new URL("/functions/v1/meta-api/webhook",required(env.SUPABASE_URL,"SUPABASE_URL")).toString()});
      }
      case "config_save": {
        const appId=required(body.app_id,"app_id"), graphVersion=required(body.graph_api_version,"graph_api_version"); graphBase(graphVersion);
        const {data:existing,error:existingError}=await admin.from("crm_meta_app_configs").select("*").eq("organization_id",organizationId).maybeSingle();
        if(existingError) throw existingError;
        const appSecret=typeof body.app_secret==="string"&&body.app_secret.trim()?body.app_secret.trim():existing?await decrypt(env,existing.app_secret_ciphertext,existing.app_secret_iv):"";
        const verifyToken=typeof body.webhook_verify_token==="string"&&body.webhook_verify_token.trim()?body.webhook_verify_token.trim():existing?await decrypt(env,existing.webhook_verify_token_ciphertext,existing.webhook_verify_token_iv):"";
        required(appSecret,"app_secret"); required(verifyToken,"webhook_verify_token");
        const secret=await encrypt(env,appSecret), verify=await encrypt(env,verifyToken);
        const {error}=await admin.from("crm_meta_app_configs").upsert({organization_id:organizationId,app_id:appId,
          app_secret_ciphertext:secret.ciphertext,app_secret_iv:secret.iv,webhook_verify_token_ciphertext:verify.ciphertext,webhook_verify_token_iv:verify.iv,
          graph_api_version:graphVersion,enabled:true,validation_status:"not_tested",validation_message:null,updated_by:user.id,updated_at:new Date().toISOString(),created_by:existing?.created_by||user.id},{onConflict:"organization_id"});
        if(error) throw error;
        await audit(admin,organizationId,user.id,"meta.app_config.saved",null,{app_id:appId,graph_api_version:graphVersion});
        return json({success:true,has_app_secret:true,has_webhook_verify_token:true});
      }
      case "config_test": {
        const meta=await getMetaConfig(admin,env,organizationId), testUrl=new URL(graphBase(meta.config.graph_api_version)+"/oauth/access_token");
        testUrl.searchParams.set("client_id",meta.config.app_id); testUrl.searchParams.set("client_secret",meta.appSecret); testUrl.searchParams.set("grant_type","client_credentials");
        const response=await fetch(testUrl), result=await response.json().catch(()=>({})), valid=Boolean(response.ok&&result.access_token);
        const message=valid?"Meta App 凭证验证成功":String(result?.error?.message||"Meta App 凭证验证失败").slice(0,240);
        const {error}=await admin.from("crm_meta_app_configs").update({validation_status:valid?"valid":"invalid",validation_message:message,last_validated_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("organization_id",organizationId);
        if(error) throw error;
        await audit(admin,organizationId,user.id,"meta.app_config.tested",null,{valid});
        return json({valid,message});
      }
      case "start_oauth": {
        if (!validProvider(body.provider)) return json({error:"Unsupported Meta provider"},400);
        const meta=await getMetaConfig(admin,env,organizationId);
        required(env.APP_ORIGIN,"APP_ORIGIN");
        const redirectUri=new URL("/functions/v1/meta-api?action=oauth_callback",required(env.SUPABASE_URL,"SUPABASE_URL")).toString();
        graphBase(meta.config.graph_api_version);
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
        const authUrl = new URL("https://www.facebook.com/" + meta.config.graph_api_version + "/dialog/oauth");
        authUrl.searchParams.set("client_id",meta.config.app_id);
        authUrl.searchParams.set("redirect_uri",redirectUri);
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
        const provider=oauth.provider as Provider;
        if((provider==="whatsapp_business") !== (asset.asset_type==="whatsapp_business_account")) return json({error:"Asset type does not match channel"},400);
        const {data:claim,error:claimError}=await admin.from("crm_channel_oauth_states").update({status:"processing"})
          .eq("id",oauth.id).eq("status","assets_ready").select("id").maybeSingle();
        if(claimError||!claim) return json({error:"OAuth state is already being completed"},409);
        let token=await decrypt(env,oauth.access_token_ciphertext,oauth.access_token_iv);
        if(asset.asset_type==="facebook_page"){
          const tokens=JSON.parse(await decrypt(env,oauth.asset_tokens_ciphertext,oauth.asset_tokens_iv)) as Record<string,string>;
          token=required(tokens[asset.id],"Page access token");
        }
        const encrypted=await encrypt(env,token);
        const {data:connection,error:connectionError}=await admin.from("crm_channel_connections").upsert({
          organization_id:organizationId,provider,external_asset_id:asset.id,display_name:asset.name,status:"pending",
          scopes:oauth.granted_scopes || [],token_expires_at:oauth.token_expires_at,
          provider_metadata:{asset_type:asset.asset_type,...(asset.details||{})},created_by:user.id,updated_at:new Date().toISOString(),
        },{onConflict:"organization_id,provider,external_asset_id"}).select("id").single();
        if(connectionError||!connection) throw connectionError||new Error("Unable to save Meta connection");
        const {error:credentialError}=await admin.from("crm_channel_credentials").upsert({
          connection_id:connection.id,access_token_ciphertext:encrypted.ciphertext,access_token_iv:encrypted.iv,updated_at:new Date().toISOString(),
        },{onConflict:"connection_id"});
        if(credentialError) throw credentialError;
        const {error:activateError}=await admin.from("crm_channel_connections").update({status:"connected",updated_at:new Date().toISOString()})
          .eq("id",connection.id).eq("organization_id",organizationId);
        if(activateError) throw activateError;
        let webhookSubscription: Record<string,unknown> = { status: "pending" };
        try {
          const fields = provider === "messenger" ? "messages,messaging_postbacks,messaging_optins" : provider === "facebook_pages" ? "feed" : null;
          const result = await graphPost(meta.config.graph_api_version, "/" + encodeURIComponent(asset.id) + "/subscribed_apps", token, fields ? { subscribed_fields: fields } : {});
          webhookSubscription = { status: "subscribed", subscribed_fields: fields, response: result };
        } catch (subscriptionError) {
          webhookSubscription = { status: "failed", message: (subscriptionError instanceof Error ? subscriptionError.message : "Webhook subscription failed").slice(0,240) };
        }
        await admin.from("crm_channel_connections").update({ provider_metadata: { asset_type: asset.asset_type, ...(asset.details || {}), webhook_subscription: webhookSubscription }, updated_at: new Date().toISOString() }).eq("id",connection.id).eq("organization_id",organizationId);
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
    if (error instanceof Response) return new Response(error.body,{status:error.status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info"}});
    const message=error instanceof Error?error.message:"Unexpected Meta integration error";
    return json({error:message},url.pathname.endsWith("/webhook") ? 500 : 400);
  }
});
