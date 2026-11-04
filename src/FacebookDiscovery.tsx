import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Button, InlineNotification, NumberInput, Tag, TextInput,
  Tabs, TabList, Tab, TabPanels, TabPanel, Table, TableHead, TableRow, TableHeader, TableBody, TableCell,
  TableContainer,
} from "@carbon/react";
import {
  User, Building, Chat, Video, Map, Calendar, Search, UserMultiple,
} from "@carbon/icons-react";
import { supabase } from "./lib/supabase";
import { PageHeader } from "./design-system";
import { CollectionModeGrid } from "./design-system/components/CollectionModeGrid";
import "./facebook-discovery.css";

type SearchType = "people" | "pages" | "posts" | "videos" | "places" | "events" | "top" | "groups";
type Result = Record<string, any>;
type HistoryRow = { id:string; title:string; status:string; result_count:number; created_at:string; actor_id:string; error_message?:string|null; input_snapshot?:Record<string,any> };
type LogEntry = { id:number; time:string; level:"info"|"success"|"warning"|"error"; message:string };
type Mode = { id:SearchType; label:string; description:string; icon:typeof User };
const modes:Mode[] = [
 {id:"people",label:"个人",description:"公开个人资料",icon:User},
 {id:"pages",label:"主页",description:"公共主页 / 企业主页",icon:Building},
 {id:"posts",label:"帖子",description:"公开帖子",icon:Chat},
 {id:"videos",label:"视频",description:"视频和 Reels",icon:Video},
 {id:"places",label:"地点",description:"地点及商家",icon:Map},
 {id:"events",label:"活动",description:"公开活动",icon:Calendar},
 {id:"top",label:"综合",description:"混合搜索结果",icon:Search},
 {id:"groups",label:"群组",description:"公开群组与群组内容",icon:UserMultiple},
];
const columns:Record<SearchType,{key:string;header:string}[]> = {
 people:[{key:"name",header:"姓名"},{key:"profileUrl",header:"个人主页"},{key:"location",header:"所在地"},{key:"friends",header:"好友数"},{key:"bio",header:"简介"},{key:"source_actor",header:"数据来源"}],
 pages:[{key:"name",header:"主页名称"},{key:"pageUrl",header:"主页链接"},{key:"category",header:"类别"},{key:"followers",header:"关注者"},{key:"website",header:"网站"},{key:"source_actor",header:"数据来源"}],
 posts:[{key:"text",header:"帖子内容"},{key:"authorName",header:"发布者"},{key:"url",header:"帖子链接"},{key:"creationTime",header:"发布时间"},{key:"likes",header:"赞"},{key:"comments",header:"评论"}],
 videos:[{key:"title",header:"视频标题"},{key:"ownerName",header:"发布者"},{key:"url",header:"视频链接"},{key:"viewCount",header:"播放量"},{key:"creationTime",header:"发布时间"},{key:"source_actor",header:"数据来源"}],
 places:[{key:"name",header:"地点 / 商家"},{key:"category",header:"类别"},{key:"address",header:"地址"},{key:"phone",header:"电话"},{key:"website",header:"网站"},{key:"url",header:"Facebook 链接"}],
 events:[{key:"name",header:"活动名称"},{key:"eventDate",header:"活动时间"},{key:"location",header:"活动地点"},{key:"attending",header:"参加人数"},{key:"url",header:"活动链接"},{key:"source_actor",header:"数据来源"}],
 top:[{key:"name",header:"名称"},{key:"type",header:"对象类型"},{key:"text",header:"内容摘要"},{key:"url",header:"来源链接"},{key:"category",header:"类别"},{key:"source_actor",header:"数据来源"}],
 groups:[{key:"name",header:"群组 / 内容"},{key:"description",header:"简介 / 内容"},{key:"privacy",header:"公开状态"},{key:"memberCount",header:"成员数"},{key:"url",header:"群组 / 帖子链接"},{key:"discovery_type",header:"记录类型"}],
};
const aliases:Record<string,string[]> = {
 name:["name","title","pageName","page_name","groupName","group_name","authorName","author_name","eventName","event_name"],
 profileUrl:["profileUrl","profile_url","url","facebookUrl"],pageUrl:["pageUrl","page_url","url"],
 location:["location","locationName","location_name","city","address"],friends:["friends","friendsCount","friendCount","friend_count"],
 bio:["bio","about","description"],followers:["followers","followersCount","fanCount","likes"],
 category:["category","categoryName","category_name","type"],website:["website","websiteUrl","website_url"],
 text:["text","message","caption","description","postText"],authorName:["authorName","author_name","ownerName","owner_name","userName"],
 url:["url","postUrl","post_url","groupUrl","group_url","eventUrl","event_url","videoUrl","video_url"],
 creationTime:["creationTime","createdAt","created_at","timestamp","date"],likes:["likes","likesCount","reactionsCount"],
 comments:["comments","commentsCount"],title:["title","name","videoTitle"],ownerName:["ownerName","owner_name","authorName"],
 viewCount:["viewCount","views","videoViewCount"],address:["address","fullAddress","location"],phone:["phone","phoneNumber"],
 eventDate:["eventDate","startTime","startDate","date"],attending:["attending","attendingCount","interestedCount"],
 type:["type","rowType","contentType","discovery_type"],privacy:["privacy","groupPrivacy","visibility"],
 memberCount:["memberCount","membersCount","member_count","members"],discovery_type:["discovery_type"],
 source_actor:["source_actor"],
};
const pick=(row:Result,key:string)=>{for(const candidate of aliases[key]||[key]){const value=row?.[candidate];if(value!==undefined&&value!==null&&value!=="")return value;}return null;};
const showValue=(value:unknown)=>{if(value==null)return "—";if(typeof value==="object")return JSON.stringify(value);return String(value);};
const cleanUrl=(row:Result)=>String(pick(row,"url")||pick(row,"profileUrl")||pick(row,"pageUrl")||"");
const statusLabel=(status:string)=>status==="succeeded"?"已完成":status==="failed"?"失败":status==="partial"?"部分完成":status==="running"?"执行中":status;
function ResultTable({rows,type}:{rows:Result[];type:SearchType}) {
 const headers=columns[type];
 if(!rows.length)return <div className="fb-tab-empty">该对象类型暂无结果。可切换发现对象并执行采集，结果会归档到对应 Tab。</div>;
 return <TableContainer className="fb-carbon-table" title={modes.find(x=>x.id===type)?.label+"发现结果"}>
  <Table size="lg" useZebraStyles>
   <TableHead><TableRow>{headers.map(h=><TableHeader key={h.key}>{h.header}</TableHeader>)}</TableRow></TableHead>
   <TableBody>{rows.map((row,index)=><TableRow key={String(row.id||cleanUrl(row)||index)+"-"+index}>{headers.map(h=>{
    const value=pick(row,h.key);
    const isLink=["url","profileUrl","pageUrl"].includes(h.key);
    return <TableCell key={h.key}>{isLink&&value?<a href={String(value)} target="_blank" rel="noreferrer" className="fb-table-link">{showValue(value)}</a>:<span title={showValue(value)}>{showValue(value)}</span>}</TableCell>;
   })}</TableRow>)}</TableBody>
  </Table>
 </TableContainer>;
}
export default function FacebookDiscovery() {
 const [session,setSession]=useState<any>(null); const [ready,setReady]=useState(false);
 const [organizationId,setOrganizationId]=useState(""); const [organizationName,setOrganizationName]=useState("");
 const [type,setType]=useState<SearchType>("people"); const [terms,setTerms]=useState("");
 const [maxResults,setMaxResults]=useState(50); const [locationUid,setLocationUid]=useState("");
 const [dateFrom,setDateFrom]=useState(""); const [dateTo,setDateTo]=useState(""); const [groupLimit,setGroupLimit]=useState(5);
 const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [notice,setNotice]=useState("");
 const [results,setResults]=useState<Result[]>([]); const [meta,setMeta]=useState<any>(null); const [history,setHistory]=useState<HistoryRow[]>([]);
 const [historyId,setHistoryId]=useState(""); const [activeTab,setActiveTab]=useState(0); const [logs,setLogs]=useState<LogEntry[]>([]);
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [authError,setAuthError]=useState("");
 const addLog=(message:string,level:LogEntry["level"]="info")=>setLogs(old=>[...old,{id:Date.now()+Math.random(),time:new Date().toLocaleTimeString(),level,message}].slice(-100));
 const clearLogs=()=>setLogs([]);
 useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setSession(data.session);setReady(true);}});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setReady(true);});return()=>{alive=false;subscription.unsubscribe();};},[]);
 useEffect(()=>{if(!session?.user){setOrganizationId("");return;} (async()=>{const {data:m,error:me}=await supabase.from("organization_members").select("organization_id").eq("user_id",session.user.id).limit(1).maybeSingle();if(me)throw me;if(!m)throw new Error("当前账号尚未加入企业工作区。");const {data:o,error:oe}=await supabase.from("organizations").select("id,name").eq("id",m.organization_id).single();if(oe)throw oe;setOrganizationId(o.id);setOrganizationName(o.name);})().catch(e=>setError(e instanceof Error?e.message:"无法读取企业工作区。"));},[session]);
 const loadHistory=async(org:string)=>{const {data,error:invokeError}=await supabase.functions.invoke("facebook-discovery",{body:{action:"list_history",organization_id:org}});if(invokeError)throw invokeError;if(data?.error)throw new Error(data.error);setHistory(data.history||[]);};
 useEffect(()=>{if(organizationId)void loadHistory(organizationId).catch(e=>setError(e instanceof Error?e.message:"无法读取发现记录。"));},[organizationId]);
 const termList=useMemo(()=>terms.split(/[\n,，;；]+/).map(x=>x.trim()).filter(Boolean),[terms]);
 const visibleResults=useMemo(()=>{const selectedType=modes[activeTab]?.id||"people";return results.filter(row=>{const t=String(row.discovery_type||type);return selectedType==="groups"?(t==="group"||t==="group_post"):t===selectedType;});},[results,type,activeTab]);
 const countByType=(id:SearchType)=>results.filter(row=>{const t=String(row.discovery_type||type);return id==="groups"?(t==="group"||t==="group_post"):t===id;}).length;
 const run=async()=>{
  setError("");setNotice("");setHistoryId("");if(!termList.length){setError("请至少输入一个关键词。");return;}if(!organizationId){setError("当前账号没有可用的企业工作区。");return;}
  setBusy(true);setResults([]);setMeta(null);setActiveTab(modes.findIndex(x=>x.id===type));clearLogs();
  addLog("已创建发现请求，准备提交服务端。");addLog("正在校验企业权限与 Apify 连接状态。");
  if(type==="groups")addLog("群组流程：先发现公开群组，再采集群组公开内容。");
  addLog("正在启动 "+(type==="top"||type==="groups"?"calm_builder":"memo23")+" Actor。");
  addLog("服务端正在等待 Actor 执行并读取 Dataset；此处显示任务阶段日志，不代表 Apify 内部实时日志。");
  try{
   const {data,error:invokeError}=await supabase.functions.invoke("facebook-discovery",{body:{action:"collect",organization_id:organizationId,search_terms:termList,search_type:type,max_results:maxResults,location_uid:locationUid.trim(),only_posts_newer_than:dateFrom||undefined,only_posts_older_than:dateTo||undefined,group_limit:groupLimit}});
   if(invokeError)throw invokeError;if(data?.error)throw new Error(data.error);
   setResults(data.results||[]);setMeta(data.actor_meta||null);
   addLog("Actor 执行已返回，Dataset 数据读取完成。","success");
   if(data.actor_meta?.actors?.length)for(const actor of data.actor_meta.actors){
    addLog("完成 "+actor.actor_id+" · "+actor.status+" · Dataset "+actor.dataset_id,"success");
    if(actor.run_log){
     addLog("以下为 Apify Run 原始日志："+actor.actor_id,"info");
     String(actor.run_log).split(/\\r?\\n/).filter(Boolean).slice(-80).forEach((line:string)=>addLog(line,"info"));
    }else addLog("该 Actor 暂无可显示的 Run 日志。","warning");
   }
   addLog("结果已写入任务历史，共 "+(data.result_count||0)+" 条。","success");
   setNotice((data.status==="partial"?"采集已完成，但没有返回结果。":"采集完成。")+" 返回 "+(data.result_count||0)+" 条记录。");
   await loadHistory(organizationId);
  }catch(e){const message=e instanceof Error?e.message:"Facebook 采集失败，请检查 Apify 配置和 Actor 权限。";setError(message);addLog("任务失败："+message,"error");}
  finally{setBusy(false);}
 };
 const openHistory=async(row:HistoryRow)=>{setError("");setNotice("");setHistoryId(row.id);setBusy(true);clearLogs();addLog("正在读取历史任务 "+row.id);try{const {data,error:invokeError}=await supabase.functions.invoke("facebook-discovery",{body:{action:"get_history",organization_id:organizationId,task_id:row.id}});if(invokeError)throw invokeError;if(data?.error)throw new Error(data.error);const h=data.history;setResults(Array.isArray(h.raw_items)?h.raw_items:[]);setMeta(h.actor_meta||null);const snapshot=h.input_snapshot||{};const nextType=snapshot.search_type||"people";setType(nextType);setActiveTab(modes.findIndex(x=>x.id===nextType));setTerms((snapshot.search_terms||[]).join("\n"));addLog("历史任务数据已载入。","success");setNotice("已载入历史采集结果。");}catch(e){const message=e instanceof Error?e.message:"无法读取历史记录。";setError(message);addLog(message,"error");}finally{setBusy(false);}};
 const login=async(e:FormEvent)=>{e.preventDefault();setAuthError("");const {error:loginError}=await supabase.auth.signInWithPassword({email,password});if(loginError)setAuthError(loginError.message);};
 if(!ready)return <div className="fb-boot">正在连接客户发现工作台…</div>;
 if(!session)return <form className="fb-login" onSubmit={login}><h2>登录企业工作区</h2><TextInput id="fb-login-email" labelText="邮箱" value={email} onChange={e=>setEmail(e.target.value)}/><TextInput id="fb-login-password" type="password" labelText="密码" value={password} onChange={e=>setPassword(e.target.value)}/>{authError&&<InlineNotification kind="error" title="登录失败" subtitle={authError} hideCloseButton/>}<Button type="submit">登录</Button></form>;
 return <section className="facebook-discovery">
  <PageHeader title="Facebook 公开信息发现" description="按对象类型检索公开个人资料、企业主页、帖子、视频、地点、活动及群组。采集结果保留来源 Actor 与原始字段。" actions={<Tag type="green">{organizationName||"企业工作区"}</Tag>} />
  <section className="fb-config-panel">
   <div className="fb-section-head"><div><span className="eyebrow">DISCOVERY OBJECT</span><h3>选择发现对象</h3></div><span>一个渠道，多种公开对象</span></div>
   <CollectionModeGrid ariaLabel="选择 Facebook 发现对象" options={modes} selectedId={type} onSelect={id=>{if(type!==id){setType(id as SearchType);setResults([]);setMeta(null);setError("");setNotice("");}}} />
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
  <section className="fb-logs-section">
   <div className="fb-section-head"><div><span className="eyebrow">02 / LIVE ACTIVITY</span><h3>任务日志</h3><p>同时展示页面任务事件与 Apify Actor Run 返回的原始执行日志。</p></div><div className="fb-log-actions"><Tag type={busy?"blue":"gray"}>{busy?"执行中":"空闲"}</Tag><Button kind="ghost" size="sm" onClick={clearLogs}>清空日志</Button></div></div>
   <div className="fb-log-console" aria-live="polite">{logs.length?logs.map(log=><div className={"fb-log-line "+log.level} key={log.id}><time>{log.time}</time><span className="fb-log-dot"/><span>{log.message}</span></div>):<div className="fb-log-placeholder">等待任务事件。启动发现后，日志将在此处追加。</div>}</div>
  </section>
  <section className="fb-results-section">
   <div className="fb-section-head"><div><span className="eyebrow">03 / DISCOVERY RESULTS</span><h3>发现结果</h3><p>按对象类型分 Tab 展示；各 Tab 已预设对应字段列，实际单元格根据 Actor 返回数据填充。</p></div><strong className="fb-result-count">{results.length.toLocaleString()} 条</strong></div>
   <div className="fb-result-tabs"><Tabs selectedIndex={activeTab} onChange={({selectedIndex})=>setActiveTab(selectedIndex)}><TabList aria-label="发现结果对象类型">{modes.map(mode=>{const Icon=mode.icon;return <Tab key={mode.id} id={"fb-tab-"+mode.id}><span className="fb-tab-label"><Icon size={16}/>{mode.label}<span className="fb-tab-count">{countByType(mode.id)}</span></span></Tab>;})}</TabList>
    <TabPanels>{modes.map(mode=><TabPanel key={mode.id}>{busy?<div className="fb-empty">正在执行 Actor 并读取 Dataset…</div>:<ResultTable rows={visibleResults} type={mode.id}/>}</TabPanel>)}</TabPanels>
   </Tabs></div>
   {meta?.actors?.length>0&&<div className="fb-actor-meta"><strong>采集执行信息</strong>{meta.actors.map((actor:any)=><div key={actor.run_id}><span>{actor.actor_id}</span><small>Run：{actor.run_id} · Dataset：{actor.dataset_id}</small></div>)}</div>}
  </section>
  <section className="fb-history-section"><div className="fb-section-head"><div><span className="eyebrow">04 / TASK HISTORY</span><h3>历史发现任务</h3></div><Button kind="ghost" size="sm" onClick={()=>loadHistory(organizationId)}>刷新记录</Button></div>
   {!history.length?<div className="fb-history-empty">暂无历史发现记录</div>:<div className="fb-history-list">{history.map(row=><button type="button" key={row.id} className={historyId===row.id?"fb-history-row selected":"fb-history-row"} onClick={()=>openHistory(row)}><span><strong>{row.title}</strong><small>{new Date(row.created_at).toLocaleString()}</small></span><span><Tag type={row.status==="succeeded"?"green":row.status==="failed"?"red":"warm-gray"}>{statusLabel(row.status)}</Tag><small>{row.result_count||0} 条</small></span></button>)}</div>}
  </section>
 </section>;
}
