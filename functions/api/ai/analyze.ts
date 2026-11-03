import { decrypt, type AIEnv } from "../../lib/ai";
type Env = AIEnv & { SUPABASE_URL:string; SUPABASE_ANON_KEY:string };
const json=(data:unknown,status=200)=>Response.json(data,{status});
export const onRequestPost=async({request,env}:{request:Request;env:Env})=>{
 const token=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token)return json({error:"需要登录后才能启动分析。"},401);
 const base=env.SUPABASE_URL?.replace(/\/$/,"");if(!base||!env.SUPABASE_ANON_KEY)return json({error:"Supabase 服务端环境变量未配置。"},503);
 const headers={apikey:env.SUPABASE_ANON_KEY,Authorization:"Bearer "+token,"Content-Type":"application/json"};
 const auth=await fetch(base+"/auth/v1/user",{headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:"Bearer "+token}});
 if(!auth.ok)return json({error:"登录会话无效或已过期。"},401);
 const user=await auth.json() as {id:string};
 let body:any;try{body=await request.json();}catch{return json({error:"请求内容无效。"},400);}
 const {profileId,organizationId,objective}=body||{};
 if(typeof profileId!=="string"||typeof organizationId!=="string")return json({error:"缺少企业档案或工作空间。"},400);
 const profileRes=await fetch(base+"/rest/v1/enterprise_profiles?id=eq."+encodeURIComponent(profileId)+"&organization_id=eq."+encodeURIComponent(organizationId)+"&select=id,display_name,legal_name,website,country,industry,profile,version",{headers});
 if(!profileRes.ok)return json({error:"无法读取企业档案。"},403);
 const profiles=await profileRes.json() as any[];if(!profiles.length)return json({error:"企业档案不存在或无权访问。"},404);
 const profile=profiles[0];
 const configs=await env.AI_CONFIG_KV.list({prefix:"provider:"});
 let provider:any=null;
 for(const item of configs.keys){const raw=await env.AI_CONFIG_KV.get(item.name);if(!raw)continue;const cfg=JSON.parse(await decrypt(raw,env));if(cfg.enabled&&cfg.apiKey){provider=cfg;break;}}
 if(!provider)return json({error:"没有已启用且配置 API Key 的模型服务商。请先在平台设置中配置模型。"},503);
 const insert=await fetch(base+"/rest/v1/ai_analysis_runs",{method:"POST",headers:{...headers,Prefer:"return=representation"},body:JSON.stringify([{organization_id:organizationId,profile_id:profileId,requested_by:user.id,status:"running",provider_id:provider.id,model_id:provider.model,input_snapshot:{profile,objective:typeof objective==="string"?objective:"综合企业分析"},started_at:new Date().toISOString()}])});
 if(!insert.ok)return json({error:"创建分析任务失败。"},403);
 const rows=await insert.json() as any[];const run=rows[0];
 try{
  const response=await fetch(provider.baseUrl+"/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+provider.apiKey,"Content-Type":"application/json"},body:JSON.stringify({model:provider.model,temperature:0.2,max_tokens:3000,messages:[{role:"system",content:"你是严谨的全球商业情报分析师。仅依据输入企业档案进行分析；明确区分已知事实、推断和信息缺口；不得编造外部数据、客户、财务或市场份额。输出中文，结构化覆盖企业概况、核心优势、风险、市场机会、待验证问题和可执行建议。"},{"role":"user",content:JSON.stringify({objective:objective||"综合企业分析",enterprise:profile})}]})});
  const result=await response.json() as any;if(!response.ok)throw new Error(result?.error?.message||"模型服务调用失败");
  const output=result?.choices?.[0]?.message?.content;if(typeof output!=="string"||!output.trim())throw new Error("模型未返回有效分析内容");
  const saved=await fetch(base+"/rest/v1/ai_analysis_runs?id=eq."+encodeURIComponent(run.id),{method:"PATCH",headers:{...headers,Prefer:"return=minimal"},body:JSON.stringify({status:"completed",result:{text:output,usage:result.usage||null,profile_version:profile.version},completed_at:new Date().toISOString()})});
  if(!saved.ok)throw new Error("分析成功，但保存结果失败");
  return json({runId:run.id,status:"completed",model:provider.model,result:output});
 }catch(error){
  const message=error instanceof Error?error.message:"模型分析失败";
  await fetch(base+"/rest/v1/ai_analysis_runs?id=eq."+encodeURIComponent(run.id),{method:"PATCH",headers:{...headers,Prefer:"return=minimal"},body:JSON.stringify({status:"failed",error_code:"MODEL_CALL_FAILED",error_message:message.slice(0,500),completed_at:new Date().toISOString()})});
  return json({runId:run.id,status:"failed",error:message},502);
 }
};
