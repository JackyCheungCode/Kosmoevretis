import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import ContextDev from "npm:context.dev";

const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods":"POST, OPTIONS" };
const reply = (body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const now=()=>new Date().toISOString();
const enc=new TextEncoder();
async function decrypt(ciphertext:string,iv:string){
 const secret=Deno.env.get("SETTINGS_ENCRYPTION_KEY"); if(!secret||secret.length<32)throw new Error("服务端凭证解密密钥未配置。");
 const digest=await crypto.subtle.digest("SHA-256",enc.encode(secret));
 const key=await crypto.subtle.importKey("raw",digest,"AES-GCM",false,["decrypt"]);
 const raw=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
 return new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:raw(iv)},key,raw(ciphertext)));
}
async function credential(admin:any,org:string,provider:string){
 const {data,error}=await admin.from("platform_provider_connections").select("credential_ciphertext,credential_iv,is_enabled").eq("organization_id",org).eq("provider_key",provider).maybeSingle();
 if(error)throw error;if(!data?.is_enabled||!data.credential_ciphertext||!data.credential_iv)throw new Error((provider==="context_dev"?"Context.dev":"Google PageSpeed")+" API 尚未配置，请先到设置中心保存。");
 return decrypt(data.credential_ciphertext,data.credential_iv);
}
async function authorized(req:Request){
 const auth=req.headers.get("Authorization")||"";if(!auth.startsWith("Bearer "))throw Object.assign(new Error("请先登录企业工作区。"),{status:401});
 const c=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
 const {data,error}=await c.auth.getUser(auth.slice(7));if(error||!data.user)throw Object.assign(new Error("登录状态已失效，请重新登录。"),{status:401});return data.user;
}
async function targetUrl(value:unknown){
 let u:URL;try{u=new URL(String(value||"").trim())}catch{throw new Error("请输入有效的网站首页 URL。")}
 if(!["http:","https:"].includes(u.protocol)||u.username||u.password)throw new Error("只允许输入不包含登录凭证的公开 HTTP/HTTPS 网站地址。");
 if(u.port&&!((u.protocol==="http:"&&u.port==="80")||(u.protocol==="https:"&&u.port==="443")))throw new Error("网站地址不允许使用非标准端口。");
 const h=u.hostname.toLowerCase().replace(/^\[|\]$/g,"");
 if(!h||h==="localhost"||h.endsWith(".localhost")||h.endsWith(".local")||h.endsWith(".internal")||/^127\.|^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\.|^0\./.test(h)||h==="::1"||/^(fc|fd|fe[89ab])/i.test(h)||/^ff/i.test(h))throw new Error("目标地址指向本地、内网或保留网络，不能扫描。");
 if(!/^\d{1,3}(\.\d{1,3}){3}$/.test(h)&&h.includes(".")){
  const dns=await Promise.allSettled([Deno.resolveDns(h,"A"),Deno.resolveDns(h,"AAAA")]);const ips=dns.flatMap(x=>x.status==="fulfilled"?x.value:[]);
  if(!ips.length||ips.some(ip=>/^10\.|^127\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\.|^0\.|^(fc|fd|fe80:)/i.test(String(ip))))throw new Error("域名无法解析或解析到了内网 IP，已阻止扫描。");
 }
 u.hash="";return u.toString().replace(/\/$/,"");
}
function inSite(url:string,root:string){try{return new URL(url).hostname===new URL(root).hostname&&["http:","https:"].includes(new URL(url).protocol)}catch{return false}}
function coreUrls(rows:any[],root:string,limit:number){
 const map=new Map<string,any>();for(const row of rows){const url=typeof row==="string"?row:row?.url;if(!url||!inSite(String(url),root))continue;const u=new URL(String(url));u.hash="";map.set(u.toString(),{url:u.toString(),title:row?.title||"",description:row?.description||""})}
 const priority=(url:string)=>{const p=new URL(url).pathname.toLowerCase();if(p==="/")return 0;if(/product|item/.test(p))return 1;if(/categor|collection|shop|catalog/.test(p))return 2;if(/about|service|solution/.test(p))return 3;if(/blog|article|news|guide/.test(p))return 4;if(/contact|support/.test(p))return 5;return 6};
 return [...map.values()].sort((a,b)=>priority(a.url)-priority(b.url)).slice(0,limit);
}
async function mapSite(key:string,root:string,max:number){
 const client=new ContextDev({apiKey:key});const result:any=await client.web.mapUrls({domain:new URL(root).hostname,includeSubdomains:false,maxLinks:max});
 if(!Array.isArray(result?.urls)||!result.urls.length)throw new Error("Context.dev Map URLs 未发现可分析页面，请确认域名可公开访问及 API 额度。");return result.urls;
}
async function scrape(key:string,url:string){
 const client=new ContextDev({apiKey:key});const r:any=await client.web.scrape({url,formats:{markdown:true,html:true},sharedParams:{mainContentOnly:false}});
 const markdown=r?.markdown?.data??r?.markdown??"",html=r?.html?.data??r?.html??"",m=r?.metadata||r?.meta||{};
 if(!markdown&&!html)throw new Error("Context.dev 未返回页面内容。");
 return {url,title:m.title||"",description:m.description||"",status_code:m.statusCode??m.status_code??null,markdown:String(markdown),html:String(html),fetched_at:now()};
}
function structured(html:string){
 const blocks:any[]=[];for(const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{blocks.push(JSON.parse(m[1].trim()))}catch{blocks.push({_parse_error:true})}}
 const micro=(html.match(/\bitemscope\b/gi)||[]).length,rdfa=(html.match(/\btypeof\s*=/gi)||[]).length,types:string[]=[],nodes:any[]=[];
 const walk=(x:any)=>{if(!x||typeof x!=="object")return;const t=x["@type"];if(Array.isArray(t)){types.push(...t.map(String));nodes.push(x)}else if(t){types.push(String(t));nodes.push(x)}if(Array.isArray(x))x.forEach(walk);else Object.values(x).forEach(walk)};
 blocks.forEach(walk);
 const rules:Record<string,{required:string[],recommended?:string[]}>={Product:{required:["name"],recommended:["image","offers|review|aggregateRating"]},Article:{required:["headline","image","datePublished","author"]},BlogPosting:{required:["headline","image","datePublished","author"]},Organization:{required:["name"],recommended:["url","logo"]},LocalBusiness:{required:["name","address"],recommended:["telephone","openingHours"]},BreadcrumbList:{required:["itemListElement"]},Event:{required:["name","startDate","location"]},Recipe:{required:["name","image","author"]},JobPosting:{required:["title","description","datePosted","hiringOrganization","jobLocation"]},VideoObject:{required:["name","thumbnailUrl","uploadDate"]},FAQPage:{required:["mainEntity"]}};
 const eligibility=nodes.map(node=>{const type=String(Array.isArray(node["@type"])?node["@type"][0]:node["@type"]),rule=rules[type];if(!rule)return {type,recognized:false,precheck:"该类型未配置专用必填字段规则",missing_required:[],missing_recommended:[]};const has=(field:string)=>field.includes("|")?field.split("|").some(k=>node[k]!==undefined&&node[k]!==null&&node[k]!==""):node[field]!==undefined&&node[field]!==null&&node[field]!=="";return {type,recognized:true,missing_required:rule.required.filter(x=>!has(x)),missing_recommended:(rule.recommended||[]).filter(x=>!has(x)),precheck:rule.required.every(has)?"基础必填字段预检通过":"缺少基础必填字段"}});
 return {json_ld_blocks:blocks.length,json_ld_valid:blocks.filter(x=>!x?._parse_error).length,microdata_items:micro,rdfa_items:rdfa,types:[...new Set(types)],eligibility_checks:eligibility,json_ld:blocks};
}
function audit(p:any){
 const h=p.html||"",md=p.markdown||"",title=(h.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||p.title||"").replace(/<[^>]+>/g,"").trim();
 const desc=h.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1]||"",h1=[...h.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(x=>x[1].replace(/<[^>]+>/g,"").trim()).filter(Boolean);
 const canonical=h.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1]||"",robots=h.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)/i)?.[1]||"";
 const imgs=[...h.matchAll(/<img\b([^>]*)>/gi)],missing=imgs.filter(x=>!/\balt\s*=/.test(x[1])).length,links=[...h.matchAll(/<a\b[^>]+href=["']([^"']+)/gi)].map(x=>x[1]);
 const internal=links.filter(x=>x.startsWith("/")||(()=>{try{return new URL(x,p.url).hostname===new URL(p.url).hostname}catch{return false}})()).length;
 const words=md.replace(/[#>*_\-\[\]()]/g," ").split(/\s+/).filter(x=>x.length>1).length,sd=structured(h),issues:any[]=[];
 const add=(severity:string,category:string,titleText:string,evidence:string,action:string)=>issues.push({severity,category,title:titleText,url:p.url,evidence,action});
 if(!title)add("high","技术 SEO","页面缺少 Title","未发现 title 标签","为页面添加唯一且准确描述主题的标题。");
 else if(title.length>60)add("medium","内容 SEO","Title 长度偏长","当前长度 "+title.length+" 字符","将核心主题前置并精简标题。");
 if(!desc)add("medium","技术 SEO","缺少 Meta Description","未发现 description 元数据","为页面编写独立摘要，准确描述页面价值。");
 if(h1.length!==1)add("medium","内容 SEO","H1 层级异常","检测到 "+h1.length+" 个 H1","确保页面有且仅有一个清晰的主标题。");
 if(/noindex/i.test(robots))add("high","索引与抓取","页面设置 noindex","robots="+robots,"确认页面是否应该从搜索索引中排除。");
 if(imgs.length&&missing)add("medium","图片 SEO","图片缺少 Alt 文本",missing+" / "+imgs.length+" 张图片未设置 alt","为有信息价值的图片添加准确替代文本。");
 if(words<120)add("low","内容质量","页面可提取正文较少","约 "+words+" 个词","确认页面是否缺少解释产品、服务或主题的主体内容。");
 if(!internal)add("medium","站内链接","未识别到站内链接","当前采集 HTML 未识别到内部链接","为相关页面建立上下文内链。");
 if(sd.json_ld_blocks&&sd.json_ld_valid<sd.json_ld_blocks)add("high","结构化数据","JSON-LD 存在解析错误","有效 "+sd.json_ld_valid+" / "+sd.json_ld_blocks,"修复 JSON-LD JSON 语法后再校验。");
 if(!sd.json_ld_blocks&&!sd.microdata_items&&!sd.rdfa_items)add("low","结构化数据","未发现结构化数据","未检测到 JSON-LD、Microdata 或 RDFa","根据页面真实内容选择 Schema.org 类型。");
 const eligible=sd.types.map(type=>({type,recognized:["Product","Organization","LocalBusiness","Article","BlogPosting","BreadcrumbList","WebSite","WebPage","Event","Recipe","JobPosting","VideoObject","Review","AggregateRating","FAQPage","HowTo"].includes(type),note:"发现该 Schema 类型；仍需按 Google 对应类型必填属性、内容政策和页面可见内容进一步核验。"}));
 return {url:p.url,title,description:desc,h1,canonical,robots,word_count:words,image_count:imgs.length,images_missing_alt:missing,link_count:links.length,internal_link_count:internal,structured_data:{...sd,eligibility_checks:eligible},issues,fetched_at:p.fetched_at};
}
async function psi(url:string,key:string,strategy:"mobile"|"desktop"){
 const u=new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");u.searchParams.set("url",url);u.searchParams.set("key",key);u.searchParams.set("strategy",strategy);
 for(const c of ["performance","accessibility","best-practices","seo"])u.searchParams.append("category",c);
 const r=await fetch(u,{signal:AbortSignal.timeout(30000)}),d:any=await r.json().catch(()=>({}));if(!r.ok)throw new Error("PageSpeed "+strategy+" 请求失败（HTTP "+r.status+"）。");
 const c=d?.lighthouseResult?.categories||{},a=d?.lighthouseResult?.audits||{};
 return {url,strategy,scores:{performance:c.performance?.score==null?null:Math.round(c.performance.score*100),accessibility:c.accessibility?.score==null?null:Math.round(c.accessibility.score*100),best_practices:c["best-practices"]?.score==null?null:Math.round(c["best-practices"].score*100),seo:c.seo?.score==null?null:Math.round(c.seo.score*100)},metrics:{lcp_ms:a["largest-contentful-paint"]?.numericValue??null,inp_ms:a["interaction-to-next-paint"]?.numericValue??null,cls:a["cumulative-layout-shift"]?.numericValue??null,fcp_ms:a["first-contentful-paint"]?.numericValue??null,tbt_ms:a["total-blocking-time"]?.numericValue??null,speed_index_ms:a["speed-index"]?.numericValue??null},opportunities:Object.values(a).filter((x:any)=>x?.details?.type==="opportunity"&&x.score!==null&&x.score<.9).slice(0,10).map((x:any)=>({id:x.id,title:x.title,description:x.description,display_value:x.displayValue||null})),fetched_at:now()};
}
function report(pages:any[],speeds:any[],root:string,discovered:number){
 const audits=pages.map(p=>p.audit),issues=audits.flatMap(a=>a?.issues||[]);
 for(const s of speeds){if(s.scores?.performance!==null&&s.scores.performance<50)issues.push({severity:"high",category:"性能",title:"PageSpeed 性能评分偏低",url:s.url,evidence:s.strategy+" Performance "+s.scores.performance+"/100",action:"优先处理 LCP、主线程阻塞、图片体积和未使用 JavaScript。"});for(const o of (s.opportunities||[]).slice(0,4))issues.push({severity:"medium",category:"性能",title:o.title,url:s.url,evidence:o.display_value||o.description||o.id,action:"依据 Lighthouse 机会项优化对应资源。"})}
 const avg=(xs:any[])=>{const v=xs.filter(x=>typeof x==="number"&&Number.isFinite(x));return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null};
 const technical=avg(audits.map(a=>a?Math.max(0,100-a.issues.filter((x:any)=>["技术 SEO","索引与抓取"].includes(x.category)).length*15):null));
 const content=avg(audits.map(a=>a?Math.max(0,100-a.issues.filter((x:any)=>["内容 SEO","内容质量","图片 SEO"].includes(x.category)).length*12):null));
 const structuredScore=avg(audits.map(a=>a?(a.structured_data.json_ld_blocks||a.structured_data.microdata_items||a.structured_data.rdfa_items?(a.structured_data.json_ld_valid===a.structured_data.json_ld_blocks?85:45):50):null));
 const perf=avg(speeds.map(s=>s.scores?.performance)),seo=avg(speeds.map(s=>s.scores?.seo));
 const weighted=[[technical,.25],[content,.20],[structuredScore,.15],[perf,.25],[seo,.15]].filter(x=>x[0]!==null),coverage=Math.round(weighted.reduce((a,x)=>a+x[1],0)*100);
 const overall=weighted.length?Math.round(weighted.reduce((a,x)=>a+x[0]*x[1],0)/weighted.reduce((a,x)=>a+x[1],0)):null,unique=new Map<string,any>();
 for(const x of issues)unique.set(x.category+"|"+x.title+"|"+x.url,x);
 return {target:root,discovered_pages:discovered,audited_pages:pages.length,pagespeed_samples:new Set(speeds.map(x=>x.url)).size,coverage_percent:coverage,overall_score:overall,scores:{technical_seo:technical,content,structured_data:structuredScore,performance:perf,search_seo:seo},recommendations:[...unique.values()].sort((a,b)=>({high:0,medium:1,low:2}[a.severity]??3)-({high:0,medium:1,low:2}[b.severity]??3)).slice(0,150),generated_at:now(),methodology:"报告依据 Context.dev 实际发现与采集的页面内容、结构化数据解析结果及 Google PageSpeed Insights 实测结果。结构化数据为规则预检，不等于 Google Rich Results Test 最终资格判定；PageSpeed 仅覆盖所选代表性页面。评分为平台诊断指标，不是 Google 排名分数。"};
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
 try{
  const user=await authorized(req),body=await req.json(),org=String(body.organization_id||"");if(!/^[0-9a-f-]{36}$/i.test(org))return reply({error:"组织信息无效。"},400);
  const {data:member,error:me}=await admin.from("organization_members").select("role").eq("organization_id",org).eq("user_id",user.id).maybeSingle();if(me)throw me;if(!member||member.role==="viewer")return reply({error:"当前账号没有执行网站诊断任务的权限。"},403);
  if(body.action==="test_connections"){
   const key=await credential(admin,org,"context_dev"),client=new ContextDev({apiKey:key}),mapped:any=await client.web.mapUrls({domain:"example.com",includeSubdomains:false,maxLinks:1});
   if(!Array.isArray(mapped?.urls))throw new Error("Context.dev Map URLs 响应格式异常。");
   const k=await credential(admin,org,"google_pagespeed"),u=new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");u.searchParams.set("url","https://example.com/");u.searchParams.set("key",k);u.searchParams.set("strategy","mobile");u.searchParams.set("category","performance");
   const r=await fetch(u,{signal:AbortSignal.timeout(20000)}),d:any=await r.json().catch(()=>({}));if(!r.ok)throw new Error("Google PageSpeed 验证失败（HTTP "+r.status+"）："+String(d?.error?.message||"请检查 API Key 和 API 启用状态。").slice(0,180));
   await admin.from("platform_provider_connections").update({status:"verified",last_tested_at:now(),last_error_code:null,updated_at:now()}).eq("organization_id",org).in("provider_key",["context_dev","google_pagespeed"]);
   return reply({success:true,message:"Context.dev Map URLs 与 Google PageSpeed Insights 均已连通。"});
  }
  if(body.action==="list_history"){const {data,error}=await admin.from("market_trend_tasks").select("id,title,status,result_count,created_at,error_message,actor_meta,input_snapshot").eq("organization_id",org).eq("task_type","seo_audit").is("deleted_at",null).order("created_at",{ascending:false}).limit(30);if(error)throw error;return reply({history:data||[]})}
  if(body.action==="get_history"||body.action==="poll_task"){
   const id=String(body.task_id||""),{data:task,error}=await admin.from("market_trend_tasks").select("id,title,status,actor_run_id,input_snapshot,raw_items,result_count,actor_meta,error_message,created_at").eq("id",id).eq("organization_id",org).eq("task_type","seo_audit").maybeSingle();if(error)throw error;if(!task)return reply({error:"找不到该诊断任务，或当前账号无权查看。"},404);if(body.action==="get_history"||task.status!=="running")return reply({task});
   const meta={...(task.actor_meta||{})} as Record<string,any>;
   if(meta.stage==="scraping"){
    const key=await credential(admin,org,"context_dev"),queue=Array.isArray(meta.scrape_queue)?meta.scrape_queue:[];
    for(let i=0;i<2&&queue.length;i++){const next=queue.shift();try{const p=await scrape(key,next.url);p.audit=audit(p);delete p.html;delete p.markdown;meta.pages.push(p)}catch(e){meta.page_errors.push({url:next.url,error:e instanceof Error?e.message:"页面采集失败"})}}
    meta.scrape_queue=queue;if(!queue.length){const urls=coreUrls(meta.map_urls||[],String(task.input_snapshot.target),Number(task.input_snapshot.pagespeed_limit||5));meta.pagespeed_queue=urls.flatMap(x=>[{url:x.url,strategy:"mobile"},{url:x.url,strategy:"desktop"}]);meta.stage="pagespeed"}
   }
   if(meta.stage==="pagespeed"){
    let key:string|null=null;try{key=await credential(admin,org,"google_pagespeed")}catch{meta.pagespeed_unavailable=true}
    const queue=Array.isArray(meta.pagespeed_queue)?meta.pagespeed_queue:[];
    for(let i=0;i<2&&queue.length&&key;i++){const n=queue.shift();try{meta.pagespeed_results.push(await psi(n.url,key,n.strategy))}catch(e){meta.pagespeed_results.push({url:n.url,strategy:n.strategy,error:e instanceof Error?e.message:"PageSpeed 请求失败"})}}
    if(meta.pagespeed_unavailable)queue.length=0;meta.pagespeed_queue=queue;
    if(!queue.length){
     meta.report=report(meta.pages||[],(meta.pagespeed_results||[]).filter((x:any)=>!x.error),String(task.input_snapshot.target),Number(meta.discovered_count||0));meta.stage="completed";
     const ok=(meta.pages||[]).length&&(meta.pagespeed_results||[]).some((x:any)=>!x.error),status=ok?"succeeded":"partial";
     const {data:updated,error:up}=await admin.from("market_trend_tasks").update({status,raw_items:meta.pages,result_count:meta.pages.length,actor_meta:meta,error_message:meta.pagespeed_unavailable?"PageSpeed 未配置，性能维度未纳入评分。":meta.page_errors.length?"部分页面采集失败，报告按实际覆盖范围生成。":null,completed_at:now(),updated_at:now()}).eq("id",task.id).select("id,title,status,result_count,actor_meta,error_message,input_snapshot,raw_items,created_at").single();if(up)throw up;return reply({task:updated});
    }
   }
   const {error:up}=await admin.from("market_trend_tasks").update({actor_meta:meta,raw_items:meta.pages||[],result_count:(meta.pages||[]).length,updated_at:now()}).eq("id",task.id);if(up)throw up;
   return reply({task:{...task,actor_meta:meta,raw_items:meta.pages||[],result_count:(meta.pages||[]).length},progress:meta.stage==="pagespeed"?"PageSpeed 检测 "+(meta.pagespeed_results||[]).length+" 项":"页面采集中，剩余 "+(meta.scrape_queue||[]).length+" 页"});
  }
  if(body.action==="start"){
   const root=await targetUrl(body.url),max=Math.min(200,Math.max(1,Number(body.max_pages)||80)),speedLimit=Math.min(10,Math.max(1,Number(body.pagespeed_limit)||5)),key=await credential(admin,org,"context_dev");
   const {data:task,error:ins}=await admin.from("market_trend_tasks").insert({organization_id:org,created_by:user.id,actor_id:"context.dev/map-scrape",task_type:"seo_audit",title:"独立站诊断："+root,status:"running",input_snapshot:{target:root,max_pages:max,pagespeed_limit:speedLimit},raw_items:[],result_count:0,actor_meta:{provider:"Context.dev + Google PageSpeed",stage:"mapping",map_urls:[],pages:[],page_errors:[],pagespeed_results:[]},started_at:now()}).select("id").single();if(ins)throw ins;
   try{const mapped=await mapSite(key,root,max),selected=coreUrls(mapped,root,max);if(!selected.length)throw new Error("Map URLs 没有返回当前域名下的可分析页面。");
    const meta={provider:"Context.dev + Google PageSpeed",stage:"scraping",map_urls:mapped,pages:[],page_errors:[],scrape_queue:selected,pagespeed_results:[],discovered_count:mapped.length};
    const {error:up}=await admin.from("market_trend_tasks").update({actor_meta:meta,updated_at:now()}).eq("id",task.id);if(up)throw up;
    return reply({task_id:task.id,status:"running",discovered_pages:mapped.length,selected_pages:selected.length});
   }catch(e){const message=e instanceof Error?e.message:"Context.dev 网站结构发现失败。";await admin.from("market_trend_tasks").update({status:"failed",error_message:message,completed_at:now(),updated_at:now()}).eq("id",task.id);return reply({error:message,task_id:task.id},502)}
  }
  return reply({error:"不支持的操作类型。"},400);
 }catch(e){return reply({error:e instanceof Error?e.message:"网站诊断服务发生未知错误。",status:(e as any)?.status||400},(e as any)?.status||400)}
});