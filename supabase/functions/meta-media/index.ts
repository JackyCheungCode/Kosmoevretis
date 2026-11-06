import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "meta-channel-media";
const MAX_BYTES = 500 * 1024 * 1024;
const MIME = new Set([
  "image/jpeg","image/png","image/webp","image/gif",
  "video/mp4","video/quicktime",
  "audio/mpeg","audio/mp4","audio/ogg","audio/wav",
  "application/pdf"
]);
const headers = { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff", "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") || "*", "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods":"POST, OPTIONS", "Vary":"Origin" };
const response = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers });
const fail = (message:string,status=400):never => { throw Object.assign(new Error(message),{status}); };

Deno.serve(async (req:Request) => {
  if (req.method === "OPTIONS") return new Response(null,{status:204,headers:{
    "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") || "*",
    "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods":"POST, OPTIONS", "Vary":"Origin"
  }});
  const origin = req.headers.get("Origin") || "";
  const allowed = Deno.env.get("APP_ORIGIN") || "";
  if (allowed && origin && origin !== allowed) return response({error:"Origin not allowed"},403);
  if (req.method !== "POST") return response({error:"Method not allowed"},405);
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) fail("Authentication required",401);
    const admin = createClient(URL,SERVICE,{auth:{persistSession:false}});
    const userClient = createClient(URL,ANON,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false}});
    const {data:userData,error:userError} = await userClient.auth.getUser(authHeader.slice(7));
    if (userError || !userData.user) fail("Invalid session",401);
    const body = await req.json();
    const org = String(body.organization_id || "");
    const connectionId = String(body.connection_id || "");
    if (!org || !connectionId) fail("organization_id and connection_id are required");
    const {data:member,error:memberError} = await admin.from("organization_members")
      .select("role").eq("organization_id",org).eq("user_id",userData.user.id).maybeSingle();
    if (memberError || !member) fail("Organization membership required",403);
    if (!["owner","admin"].includes(String(member.role).toLowerCase())) fail("Organization administrator permission required",403);
    const {data:connection,error:connectionError} = await admin.from("crm_channel_connections")
      .select("id,provider,status").eq("id",connectionId).eq("organization_id",org).eq("status","connected").maybeSingle();
    if (connectionError || !connection) fail("Connected Meta asset not found",404);
    if (!["facebook_pages","whatsapp_business","messenger"].includes(connection.provider)) fail("Unsupported Meta channel");
    const {data:bucket} = await admin.storage.getBucket(BUCKET);
    if (!bucket) {
      const {error} = await admin.storage.createBucket(BUCKET,{public:false,fileSizeLimit:MAX_BYTES,allowedMimeTypes:[...MIME]});
      if (error && !/already exists/i.test(error.message)) throw error;
    }
    const action = String(body.action || "");
    if (action === "create_upload") {
      const name = String(body.file_name || "upload").replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,120);
      const type = String(body.content_type || "").toLowerCase();
      const size = Number(body.file_size);
      if (!MIME.has(type)) fail("File type is not supported");
      if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) fail("File must be between 1 byte and 500 MB");
      const extension = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "bin";
      const random = crypto.randomUUID();
      const path = `${org}/${connectionId}/${random}.${extension}`;
      const {data,error} = await admin.storage.from(BUCKET).createSignedUploadUrl(path,{upsert:false});
      if (error || !data) throw error || new Error("Could not create signed upload URL");
      await admin.from("crm_channel_audit_logs").insert({organization_id:org,actor_id:userData.user.id,connection_id:connectionId,action:"meta.media.upload_prepared",metadata:{path,content_type:type,file_size:size}});
      return response({bucket:BUCKET,path,token:data.token,signed_url:data.signedUrl,expires_in_seconds:7200,maximum_size_bytes:MAX_BYTES});
    }
    if (action === "create_download_url") {
      const path = String(body.path || "");
      if (!path.startsWith(`${org}/${connectionId}/`) || path.includes("..") || path.startsWith("/")) fail("Media path is outside this organization or channel",403);
      const expires = Math.min(Math.max(Number(body.expires_in_seconds)||3600,60),21600);
      const {data,error} = await admin.storage.from(BUCKET).createSignedUrl(path,expires);
      if (error || !data) fail("Uploaded media was not found or could not be signed",404);
      return response({url:data.signedUrl,expires_in_seconds:expires});
    }
    fail("Unsupported action");
  } catch (error) {
    const status = Number((error as {status?:number})?.status) || 400;
    return response({error:error instanceof Error ? error.message : "Media operation failed"},status);
  }
});
