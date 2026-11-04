import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
async function decrypt(ciphertext:string,iv:string){
 const secret=Deno.env.get("SETTINGS_ENCRYPTION_KEY");if(!secret||secret.length<32)throw new Error("服务端凭证解密密钥未配置。");
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(secret));const key=await crypto.subtle.importKey("raw",digest,"AES-GCM",false,["decrypt"]);
 const raw=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));return new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:raw(iv)},key,raw(ciphertext)));
}
const cleanList=(v:unknown,max=30)=>Array.isArray(v)?[...new Set(v.map(x=>String(x).trim()).filter(Boolean))].slice(0,max):[];
const validUrl=(value:string)=>{try{const u=new URL(value);return ["instagram.com","www.instagram.com"].includes(u.hostname.toLowerCase())&&["http:","https:"].includes(u.protocol);}catch{return false;}};
const profileUrl=(v:string)=>{const s=v.trim().replace(/^@/,"");return /^https?:\/\//i.test(s)?s:"https://www.instagram.com/"+s.replace(/^\/+|\/+$/g,"")+"/";};
async function runActor(actorId:string,input:Record<string,unknown>,token:string){
 const response=await fetch("https://api.apify.com/v2/acts/"+actorId.replace("/","~")+"/runs?waitForFinish=120",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(input)});
 const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error("Apify Actor 启动失败（HTTP "+response.status+"）："+String(payload?.error?.message||payload?.message||"请检查 Actor 权限和参数。"));
 const run=payload?.data||{};if(!run.id||!run.defaultDatasetId)throw new Error("Apify 未返回有效运行编号或 Dataset。");if(run.status!=="SUCCEEDED")throw new Error("Instagram Actor 未在等待窗口内成功完成，当前状态："+String(run.status||"UNKNOWN")+"。请在 Apify 控制台检查任务状态。");
 let runLog="";try{const r=await fetch("https://api.apify.com/v2/actor-runs/"+encodeURIComponent(run.id)+"/log",{headers:{Authorization:"Bearer "+token,Accept:"text/plain"}});runLog=r.ok?(await r.text()).slice(-30000):"[日志读取失败 HTTP "+r.status+"]";}catch(e){runLog="[日志读取失败："+(e instanceof Error?e.message:"未知错误")+"]";}
 const dataset=await fetch("https://api.apify.com/v2/datasets/"+encodeURIComponent(run.defaultDatasetId)+"/items?format=json&clean=true&limit="+encodeURIComponent(String(input.resultsLimit||100)),{headers:{Authorization:"Bearer "+token}});
 if(!dataset.ok)throw new Error("读取 Instagram Actor Dataset 失败（HTTP "+dataset.status+"）。");const items=await dataset.json();if(!Array.isArray(items))throw new Error("Actor Dataset 不是数组。");
 return {items,meta:{actor_id:actorId,run_id:run.id,dataset_id:run.defaultDatasetId,status:run.status,started_at:run.startedAt||null,finished_at:run.finishedAt||null,usage_total_usd:run.usageTotalUsd??null,run_log:runLog}};
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});let taskId:string|null=null;
 try{
  const auth=req.headers.get("Authorization")||"";if(!auth.startsWith("Bearer "))return reply({error:"请先登录企业工作区。"},401);
  const userClient=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const {data:authData,error:authError}=await userClient.auth.getUser(auth.slice(7));if(authError||!authData.user)return reply({error:"登录状态已失效，请重新登录。"},401);
  const user=authData.user,body=await req.json(),org=String(body.organization_id||"");if(!/^[0-9a-f-]{36}$/i.test(org))return reply({error:"组织信息无效。"},400);
  const {data:membership,error:membershipError}=await admin.from("organization_members").select("role").eq("organization_id",org).eq("user_id",user.id).maybeSingle();
  if(membershipError)throw membershipError;if(!membership||membership.role==="viewer")return reply({error:"当前账号没有执行社交情报任务的权限。"},403);
  if(body.action==="list_history"){const {data,error}=await admin.from("market_trend_tasks").select("id,title,status,result_count,created_at,actor_id,actor_meta,input_snapshot,error_message").eq("organization_id",org).eq("task_type","instagram_discovery").is("deleted_at",null).order("created_at",{ascending:false}).limit(30);if(error)throw error;return reply({history:data||[]});}
  if(body.action==="get_history"){const {data,error}=await admin.from("market_trend_tasks").select("id,title,status,result_count,created_at,actor_id,actor_run_id,dataset_id,actor_meta,input_snapshot,raw_items,error_message").eq("id",String(body.task_id||"")).eq("organization_id",org).eq("task_type","instagram_discovery").maybeSingle();if(error)throw error;if(!data)return reply({error:"找不到该采集记录，或当前账号无权查看。"},404);return reply({history:data});}
  if(body.action!=="collect")return reply({error:"不支持的操作类型。"},400);
  const type=String(body.discovery_type||""),allowed=["profiles","posts","reels","comments","hashtags","creators","places","brand"];if(!allowed.includes(type))return reply({error:"不支持的 Instagram 发现类型。"},400);
  const sources=cleanList(body.sources),keywords=cleanList(body.keywords),limit=Math.min(200,Math.max(1,Number(body.max_results)||30));
  if(type==="hashtags"?!keywords.length:!sources.length)return reply({error:"请提供有效的账号、内容、标签或地点输入。"},400);
  if(type==="comments"&&sources.some(x=>!/^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\//i.test(x)))return reply({error:"评论洞察仅接受帖子或 Reels URL。"},400);
  if(type==="places"&&sources.some(x=>!validUrl(x)))return reply({error:"地点发现仅接受 Instagram 地点 URL。"},400);
  const normalized=sources.map(x=>type==="profiles"||type==="creators"?profileUrl(x):x);if(normalized.some(x=>!validUrl(x)))return reply({error:"输入包含无效的 Instagram URL 或用户名。"},400);
  const {data:provider,error:providerError}=await admin.from("platform_provider_connections").select("credential_ciphertext,credential_iv,is_enabled,status").eq("organization_id",org).eq("provider_key","apify").maybeSingle();
  if(providerError)throw providerError;if(!provider?.is_enabled||provider.status!=="verified"||!provider.credential_ciphertext||!provider.credential_iv)return reply({error:"Apify 尚未启用或验证，请先到设置中心完成连接测试。"},400);
  const token=await decrypt(provider.credential_ciphertext,provider.credential_iv),actor="instagram-data-api/instagram-scraper";
  const resultsType=type==="profiles"||type==="creators"?"details":type==="comments"?"comments":type==="reels"?"reels":"posts";
  const input:Record<string,unknown>={resultsType,resultsLimit:limit,addParentData:true};
  if(type==="hashtags"){input.search=keywords.join(", ");input.searchType="hashtag";input.searchLimit=limit;}else input.directUrls=normalized;
  if(["posts","reels","hashtags","brand"].includes(type)&&body.only_newer_than)input.onlyPostsNewerThan=String(body.only_newer_than).slice(0,40);
  const title="Instagram "+type+"："+(type==="hashtags"?keywords.join("、"):normalized.slice(0,3).join("、"));
  const {data:task,error:insertError}=await admin.from("market_trend_tasks").insert({organization_id:org,created_by:user.id,actor_id:actor,task_type:"instagram_discovery",title,status:"running",input_snapshot:{discovery_type:type,sources,keywords,max_results:limit,only_newer_than:body.only_newer_than||null,actor_id:actor,results_type:resultsType},started_at:new Date().toISOString()}).select("id").single();
  if(insertError)throw insertError;taskId=task.id;
  const run=await runActor(actor,input,token),results=run.items.map((item:Record<string,unknown>)=>({...item,discovery_type:type,source_actor:actor})),completed=new Date().toISOString(),actorMeta={actors:[run.meta],input};
  const {error:updateError}=await admin.from("market_trend_tasks").update({actor_id:actor,actor_run_id:run.meta.run_id,dataset_id:run.meta.dataset_id,status:results.length?"succeeded":"partial",raw_items:results,result_count:results.length,actor_meta:actorMeta,error_message:results.length?null:"Actor 已完成，但没有返回公开结果。",completed_at:completed,updated_at:completed}).eq("id",taskId);
  if(updateError)throw updateError;return reply({task_id:taskId,status:results.length?"succeeded":"partial",result_count:results.length,results,actor_meta:actorMeta});
 }catch(error){const message=error instanceof Error?error.message:"Instagram 发现任务失败。";if(taskId)await admin.from("market_trend_tasks").update({status:"failed",error_message:message,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",taskId);return reply({error:message,task_id:taskId},502);}
});
