import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button, InlineNotification, NumberInput, Tag, TextInput } from "@carbon/react";
import CarbonSelect from "./components/CarbonSelect";
import { supabase } from "./lib/supabase";
import "./facebook-discovery.css";

type SearchType = "people" | "pages" | "posts" | "videos" | "places" | "events" | "top" | "groups";
type Result = Record<string, any>;
type HistoryRow = { id:string; title:string; status:string; result_count:number; created_at:string; actor_id:string; error_message?:string|null; input_snapshot?:Record<string,any> };
const modes:{id:SearchType;label:string;description:string}[] = [
 {id:"people",label:"People",description:"公开个人资料"},
 {id:"pages",label:"Pages",description:"公共主页 / 企业主页"},
 {id:"posts",label:"Posts",description:"公开帖子"},
 {id:"videos",label:"Videos & Reels",description:"视频和 Reels"},
 {id:"places",label:"Places",description:"地点及商家"},
 {id:"events",label:"Events",description:"公开活动"},
 {id:"top",label:"Top",description:"混合搜索结果"},
 {id:"groups",label:"Groups",description:"公开群组与群组内容"},
];
const asText=(value:unknown)=>value==null?"":typeof value==="string"?value:String(value);
const first=(row:Result,keys:string[])=>{for(const key of keys){const v=row?.[key];if(v!==undefined&&v!==null&&v!=="")return v;}return null;};
const urlOf=(row:Result)=>asText(first(row,["url","postUrl","post_url","groupUrl","group_url","eventUrl","event_url"]));
const titleOf=(row:Result,type:SearchType)=>asText(first(row,["name","title","pageName","groupName","authorName","author_name"]))||({people:"公开个人资料",pages:"公共主页",posts:"公开帖子",videos:"视频 / Reels",places:"地点 / 商家",events:"公开活动",groups:"公开群组",top:"混合搜索结果"} as Record<string,string>)[type]||"Facebook 结果";
const displayDate=(value:unknown)=>{if(!value)return "";const d=new Date(String(value));return Number.isNaN(d.getTime())?asText(value):d.toLocaleString();};
function ResultCard({row,type}:{row:Result;type:SearchType}) {
 const title=titleOf(row,type); const url=urlOf(row);
 const image=asText(first(row,["profilePicture","profile_picture","thumbnail","image","picture","coverPhoto"]));
 const text=asText(first(row,["text","caption","description","about","message"]));
 const author=asText(first(row,["authorName","author_name","uploader","ownerName"]));
 const subtitle=asText(first(row,["subtitle","locationDescriptor","location","category","memberCount","members"]));
 const date=displayDate(first(row,["creationTime","createdAt","timestamp","date","eventDate"]));
 const website=asText(first(row,["website","websiteUrl","website_url"]));
 const kind=asText(first(row,["rowType","type","contentType","discovery_type"]))||type;
 return <article className="fb-result-card">
  <div className="fb-result-visual">{image?<img src={image} alt="" loading="lazy"/>:<span>{type==="people"?"P":type==="groups"?"G":type==="videos"?"▶":type==="events"?"E":type==="places"?"⌖":type==="pages"?"▣":"“"}</span>}</div>
  <div className="fb-result-body">
   <div className="fb-result-head"><div><strong>{title}</strong><div className="fb-result-meta">{subtitle}{author? (subtitle?" · ":"")+author:""}{date?(subtitle||author?" · ":"")+date:""}</div></div><Tag type="blue">{kind}</Tag></div>
   {text&&<p className="fb-result-text">{text}</p>}
   {website&&<div className="fb-result-link">网站：<a href={website} target="_blank" rel="noreferrer">{website}</a></div>}
   <div className="fb-result-foot">{url&&<a href={url} target="_blank" rel="noreferrer">打开 Facebook 来源 ↗</a>}{first(row,["isVerified","verified"])===true&&<Tag type="green">已验证</Tag>}{first(row,["memberCount","membersCount","member_count"])!=null&&<span>成员：{asText(first(row,["memberCount","membersCount","member_count"]))}</span>}</div>
  </div>
 </article>;
}
export default function FacebookDiscovery() {
 const [session,setSession]=useState<any>(null); const [ready,setReady]=useState(false);
 const [organizationId,setOrganizationId]=useState(""); const [organizationName,setOrganizationName]=useState("");
 const [type,setType]=useState<SearchType>("people"); const [terms,setTerms]=useState("");
 const [maxResults,setMaxResults]=useState(50); const [locationUid,setLocationUid]=useState("");
 const [dateFrom,setDateFrom]=useState(""); const [dateTo,setDateTo]=useState("");
 const [groupLimit,setGroupLimit]=useState(5);
 const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [notice,setNotice]=useState("");
 const [results,setResults]=useState<Result[]>([]); const [meta,setMeta]=useState<any>(null); const [history,setHistory]=useState<HistoryRow[]>([]);
 const [historyId,setHistoryId]=useState("");
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [authError,setAuthError]=useState("");
 useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setSession(data.session);setReady(true);}});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setReady(true);});return()=>{alive=false;subscription.unsubscribe();};},[]);
 useEffect(()=>{if(!session?.user){setOrganizationId("");return;} (async()=>{const {data:m,error:me}=await supabase.from("organization_members").select("organization_id").eq("user_id",session.user.id).limit(1).maybeSingle();if(me)throw me;if(!m)throw new Error("当前账号尚未加入企业工作区。");const {data:o,error:oe}=await supabase.from("organizations").select("id,name").eq("id",m.organization_id).single();if(oe)throw oe;setOrganizationId(o.id);setOrganizationName(o.name);})().catch(e=>setError(e instanceof Error?e.message:"无法读取企业工作区。"));},[session]);
 const loadHistory=async(org:string)=>{const {data,error:invokeError}=await supabase.functions.invoke("facebook-discovery",{body:{action:"list_history",organization_id:org}});if(invokeError)throw invokeError;if(data?.error)throw new Error(data.error);setHistory(data.history||[]);};
 useEffect(()=>{if(organizationId)void loadHistory(organizationId).catch(e=>setError(e instanceof Error?e.message:"无法读取发现记录。"));},[organizationId]);
 const termList=useMemo(()=>terms.split(/[\n,，;；]+/).map(x=>x.trim()).filter(Boolean),[terms]);
 const run=async()=>{setError("");setNotice("");setHistoryId("");if(!termList.length){setError("请至少输入一个关键词。");return;}if(!organizationId){setError("当前账号没有可用的企业工作区。");return;}setBusy(true);setResults([]);setMeta(null);try{const {data,error:invokeError}=await supabase.functions.invoke("facebook-discovery",{body:{action:"collect",organization_id:organizationId,search_terms:termList,search_type:type,max_results:maxResults,location_uid:locationUid.trim(),only_posts_newer_than:dateFrom||undefined,only_posts_older_than:dateTo||undefined,group_limit:groupLimit}});if(invokeError)throw invokeError;if(data?.error)throw new Error(data.error);setResults(data.results||[]);setMeta(data.actor_meta||null);setNotice((data.status==="partial"?"采集已完成，但没有返回结果。":"采集完成。")+" 返回 "+(data.result_count||0)+" 条记录。");await loadHistory(organizationId);}catch(e){setError(e instanceof Error?e.message:"Facebook 采集失败，请检查 Apify 配置和 Actor 权限。");}finally{setBusy(false);}};
 const openHistory=async(row:HistoryRow)=>{setError("");setNotice("");setHistoryId(row.id);setBusy(true);try{const {data,error:invokeError}=await supabase.functions.invoke("facebook-discovery",{body:{action:"get_history",organization_id:organizationId,task_id:row.id}});if(invokeError)throw invokeError;if(data?.error)throw new Error(data.error);const h=data.history;setResults(Array.isArray(h.raw_items)?h.raw_items:[]);setMeta(h.actor_meta||null);const snapshot=h.input_snapshot||{};setType(snapshot.search_type||"people");setTerms((snapshot.search_terms||[]).join("\n"));setNotice("已载入历史采集结果。");}catch(e){setError(e instanceof Error?e.message:"无法读取历史记录。");}finally{setBusy(false);}};
 const login=async(e:FormEvent)=>{e.preventDefault();setAuthError("");const {error:loginError}=await supabase.auth.signInWithPassword({email,password});if(loginError)setAuthError(loginError.message);};
 if(!ready)return <div className="fb-boot">正在连接客户发现工作台…</div>;
 if(!session)return <form className="fb-login" onSubmit={login}><h2>登录企业工作区</h2><TextInput id="fb-login-email" labelText="邮箱" value={email} onChange={e=>setEmail(e.target.value)}/><TextInput id="fb-login-password" type="password" labelText="密码" value={password} onChange={e=>setPassword(e.target.value)}/>{authError&&<InlineNotification kind="error" title="登录失败" subtitle={authError} hideCloseButton/>}<Button type="submit">登录</Button></form>;
 return <section className="facebook-discovery">
  <div className="fb-channel-heading"><div><span className="eyebrow">01 / FACEBOOK DISCOVERY</span><h2>Facebook 公开信息发现</h2><p>按对象类型检索公开个人资料、企业主页、帖子、视频、地点、活动及群组。采集结果保留来源 Actor 与原始字段。</p></div><Tag type="green">{organizationName||"企业工作区"}</Tag></div>
  <section className="fb-config-panel">
   <div className="fb-section-head"><div><span className="eyebrow">DISCOVERY OBJECT</span><h3>选择发现对象</h3></div><span>一个渠道，多种公开对象</span></div>
   <div className="fb-type-grid">{modes.map(m=><button type="button" key={m.id} className={type===m.id?"fb-type-option selected":"fb-type-option"} onClick={()=>{setType(m.id);setResults([]);setMeta(null);setError("");setNotice("");}}><strong>{m.label}</strong><span>{m.description}</span></button>)}</div>
   <div className="fb-form-grid">
    <div className="fb-field fb-keywords"><TextInput id="fb-search-terms" labelText="搜索关键词" placeholder={"例如：wireless earbuds manufacturer\n支持多个关键词，使用换行或逗号分隔"} value={terms} onChange={e=>setTerms(e.target.value)}/><small>{termList.length} 个关键词 · 每个关键词独立搜索</small></div>
    <div className="fb-field"><label>每次最多返回结果</label><NumberInput id="fb-max-results" label="每次最多返回结果" hideLabel min={1} max={200} value={maxResults} onChange={(_e,{value})=>setMaxResults(Number(value)||50)}/></div>
    {["people","pages","places","events"].includes(type)&&<div className="fb-field"><TextInput id="fb-location-uid" labelText="城市 / 地点 ID（可选）" placeholder="Facebook Place UID" value={locationUid} onChange={e=>setLocationUid(e.target.value)}/><small>填写 Facebook 城市 Place UID；不是城市名称。</small></div>}
    {type==="posts"&&<><div className="fb-field"><TextInput id="fb-date-from" labelText="帖子开始日期（可选）" placeholder="YYYY-MM-DD" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></div><div className="fb-field"><TextInput id="fb-date-to" labelText="帖子结束日期（可选）" placeholder="YYYY-MM-DD" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></div></>}
    {type==="groups"&&<div className="fb-field"><NumberInput id="fb-group-limit" label="最多深入采集群组数" min={1} max={10} value={groupLimit} onChange={(_e,{value})=>setGroupLimit(Number(value)||5)}/><small>先发现公开群组，再对最多 {groupLimit} 个群组抓取帖子。</small></div>}
   </div>
   {type==="groups"&&<InlineNotification kind="info" lowContrast title="群组双阶段采集" subtitle="calm_builder 负责发现公开群组；Apify 官方 facebook-groups-scraper 负责采集群组公开帖子。私密群组不会被抓取。" hideCloseButton/>}
   {type==="top"&&<InlineNotification kind="info" lowContrast title="混合搜索" subtitle="Top 类型由 calm_builder/facebook-search-scraper 执行，返回 Facebook 混合搜索对象。" hideCloseButton/>}
   <div className="fb-submit-row"><span>使用已在设置中心验证的 Apify Token；密钥只在服务端解密和调用。</span><Button onClick={run} disabled={busy||!termList.length}>{busy?"正在采集…":"开始 Facebook 发现"}</Button></div>
   {error&&<InlineNotification kind="error" title="采集未完成" subtitle={error} onCloseButtonClick={()=>setError("")}/>}
   {notice&&<InlineNotification kind="success" title="任务状态" subtitle={notice} onCloseButtonClick={()=>setNotice("")}/>}
  </section>
  <section className="fb-results-section">
   <div className="fb-section-head"><div><span className="eyebrow">02 / DISCOVERY RESULTS</span><h3>发现结果</h3><p>数据来自 Facebook 公开可见信息，具体字段取决于 Facebook 返回内容和 Actor 能力。</p></div><strong className="fb-result-count">{results.length.toLocaleString()} 条</strong></div>
   {busy&&<div className="fb-empty">正在执行 Actor 并读取 Dataset…</div>}
   {!busy&&!results.length&&<div className="fb-empty"><strong>等待开始发现</strong><span>选择对象类型并输入关键词，采集结果会显示在这里。</span></div>}
   {!busy&&results.length>0&&<div className="fb-result-list">{results.map((row,i)=><ResultCard key={String(row.id||row.url||row.postUrl||i)+"-"+i} row={row} type={row.discovery_type==="group_post"?"groups":row.discovery_type==="group"?"groups":type}/>)}</div>}
   {meta?.actors?.length>0&&<div className="fb-actor-meta"><strong>采集执行信息</strong>{meta.actors.map((actor:any)=><div key={actor.run_id}><span>{actor.actor_id}</span><small>Run：{actor.run_id} · Dataset：{actor.dataset_id}</small></div>)}</div>}
  </section>
  <section className="fb-history-section"><div className="fb-section-head"><div><span className="eyebrow">03 / TASK HISTORY</span><h3>历史发现任务</h3></div><Button kind="ghost" size="sm" onClick={()=>loadHistory(organizationId)}>刷新记录</Button></div>
   {!history.length?<div className="fb-history-empty">暂无历史发现记录</div>:<div className="fb-history-list">{history.map(row=><button type="button" key={row.id} className={historyId===row.id?"fb-history-row selected":"fb-history-row"} onClick={()=>openHistory(row)}><span><strong>{row.title}</strong><small>{new Date(row.created_at).toLocaleString()}</small></span><span><Tag type={row.status==="succeeded"?"green":row.status==="failed"?"red":"warm-gray"}>{row.status}</Tag><small>{row.result_count||0} 条</small></span></button>)}</div>}
  </section>
 </section>;
}
