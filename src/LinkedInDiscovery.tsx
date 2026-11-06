import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ClickableTile, Button, ComboBox, InlineNotification, NumberInput, Tag, TextInput, TextArea,
  Tabs, TabList, Tab, TabPanels, TabPanel, Table, TableHead, TableRow, TableHeader, TableBody, TableCell, TableContainer,
} from "@carbon/react";
import { User, Building, Chat, Calendar, Search } from "@carbon/icons-react";
import { supabase } from "./lib/supabase";
import { PageHeader } from "./design-system";
import { CollectionModeGrid } from "./design-system/components/CollectionModeGrid";
import "./linkedin-discovery.css";

type Kind = "people" | "companies" | "posts" | "jobs" | "enrich";
type Row = Record<string, any>;
type History = { id:string; title:string; status:string; result_count:number; created_at:string; actor_id:string; error_message?:string|null; input_snapshot?:Record<string,any> };
type Log = { id:number; time:string; level:"info"|"success"|"warning"|"error"; message:string };
type Option = { id:string; label:string };
const kinds:{id:Kind;label:string;description:string;icon:any}[] = [
 {id:"people",label:"人员发现",description:"寻找采购、管理层与业务决策者",icon:User},
 {id:"companies",label:"企业发现",description:"寻找品牌商、分销商与零售企业",icon:Building},
 {id:"posts",label:"帖子发现",description:"发现公开需求、讨论与市场信号",icon:Chat},
 {id:"jobs",label:"招聘发现",description:"识别企业招聘与扩张信号",icon:Calendar},
 {id:"enrich",label:"信息补全",description:"通过 LinkedIn URL 补充公开资料",icon:Search},
];
const countries:Option[] = [
 "United States","Canada","United Kingdom","Germany","France","Italy","Spain","Netherlands","Belgium","Switzerland","Austria","Sweden","Norway","Denmark","Finland","Poland","Czechia","Portugal","Ireland","Japan","South Korea","China","Hong Kong","Taiwan","Singapore","Malaysia","Thailand","Vietnam","Indonesia","Philippines","India","Australia","New Zealand","United Arab Emirates","Saudi Arabia","Turkey","Brazil","Mexico","Argentina","South Africa","Egypt"
].map(x=>({id:x,label:x}));
const roles:Option[] = [
 "CEO","Founder","Owner","Managing Director","Chief Procurement Officer","Procurement Director","Procurement Manager","Purchasing Manager","Sourcing Director","Sourcing Manager","Category Manager","Product Manager","Head of Sales","Sales Director","Business Development Director","Business Development Manager","Import Manager","Export Manager","Supply Chain Director","Supply Chain Manager","Buyer","Head of E-commerce","Retail Buyer","Wholesale Manager","Distributor"
].map(x=>({id:x,label:x}));
const fields:Record<Kind,{key:string;label:string}[]> = {
 people:[{key:"full_name",label:"姓名"},{key:"headline",label:"职位 / 简介"},{key:"company_name",label:"当前企业"},{key:"location",label:"所在地"},{key:"li_number_followers",label:"关注者"},{key:"li_profile_url",label:"LinkedIn 主页"}],
 companies:[{key:"name",label:"企业名称"},{key:"industry",label:"行业"},{key:"location",label:"所在地"},{key:"employee_count",label:"员工规模"},{key:"website",label:"网站"},{key:"linkedin_url",label:"企业主页"}],
 posts:[{key:"text",label:"帖子内容"},{key:"author_name",label:"作者"},{key:"posted_at",label:"发布时间"},{key:"likes",label:"点赞"},{key:"comments_count",label:"评论"},{key:"url",label:"帖子链接"}],
 jobs:[{key:"title",label:"职位"},{key:"company_name",label:"企业"},{key:"location",label:"工作地点"},{key:"posted_at",label:"发布时间"},{key:"employment_type",label:"雇佣类型"},{key:"url",label:"职位链接"}],
 enrich:[{key:"entity_type",label:"对象类型"},{key:"full_name",label:"姓名 / 名称"},{key:"headline",label:"职位 / 简介"},{key:"company_name",label:"企业"},{key:"source_url",label:"来源链接"},{key:"scraped_at",label:"采集时间"}],
};
const aliases:Record<string,string[]> = {
 full_name:["full_name","name","firstName"],headline:["headline","job_title","title","description"],company_name:["company_name","companyName","currentCompany","linkedin_company_name"],location:["location","li_profile_country","company_location"],
 li_number_followers:["li_number_followers","followers","followerCount"],li_profile_url:["li_profile_url","profileUrl","url"],name:["name","company_name","companyName","title"],
 industry:["industry","industries"],employee_count:["employee_count","employeeCount","staffCount","company_size"],website:["website","company_website","websiteUrl"],linkedin_url:["linkedin_url","li_company_url","company_url","companyUrl","url"],
 text:["text","content","post_text","postText","commentary"],author_name:["author_name","authorName","full_name"],posted_at:["posted_at","postedAt","date_posted","date","publishedAt"],likes:["likes","likeCount","numLikes"],comments_count:["comments_count","commentsCount","numComments"],url:["url","linkedin_url","post_url","postUrl","job_url","linkedin_job_url","source_url"],
 title:["title","job_title","linkedin_job_title"],employment_type:["employment_type","employmentType","linkedin_employment_type"],entity_type:["entity_type","type"],source_url:["source_url","url"],scraped_at:["scraped_at","scrapedAt"]
};
const val=(row:Row,key:string)=>{for(const k of aliases[key]||[key])if(row?.[k]!==undefined&&row[k]!==null&&row[k]!=="")return row[k];return null;};
const display=(v:any)=>v==null?"—":typeof v==="object"?JSON.stringify(v):String(v);
const statusName=(s:string)=>s==="succeeded"?"已完成":s==="failed"?"失败":s==="partial"?"部分完成":s==="running"?"执行中":s;
function DataTable({rows,kind}:{rows:Row[];kind:Kind}) {
 const cols=fields[kind];
 if(!rows.length)return <div className="li-empty">该类型暂无结果。请选择发现对象并执行任务，结果将在对应 Tab 中呈现。</div>;
 return <TableContainer className="li-table" title={kinds.find(k=>k.id===kind)?.label+"结果"}>
  <Table size="lg" useZebraStyles>
   <TableHead><TableRow>{cols.map(c=><TableHeader key={c.key}>{c.label}</TableHeader>)}</TableRow></TableHead>
   <TableBody>{rows.map((r,i)=><TableRow key={String(r.id||r.url||r.li_profile_url||i)+"-"+i}>{cols.map(c=>{const v=val(r,c.key);const link=["url","li_profile_url","linkedin_url","source_url"].includes(c.key)&&v;return <TableCell key={c.key}>{link?<a className="li-link" href={String(v)} target="_blank" rel="noreferrer">{display(v)}</a>:<span title={display(v)}>{display(v)}</span>}</TableCell>;})}</TableRow>)}</TableBody>
  </Table>
 </TableContainer>;
}
export default function LinkedInDiscovery(){
 const [session,setSession]=useState<any>(null),[ready,setReady]=useState(false),[org,setOrg]=useState(""),[orgName,setOrgName]=useState("");
 const [kind,setKind]=useState<Kind>("people"),[terms,setTerms]=useState(""),[country,setCountry]=useState<Option|null>(null),[role,setRole]=useState<Option|null>(null),[limit,setLimit]=useState(50),[dateRange,setDateRange]=useState("month");
 const [enrichType,setEnrichType]=useState("person"),[urls,setUrls]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[rows,setRows]=useState<Row[]>([]),[meta,setMeta]=useState<any>(null),[history,setHistory]=useState<History[]>([]),[historyId,setHistoryId]=useState(""),[activeTab,setActiveTab]=useState(0),[logs,setLogs]=useState<Log[]>([]);
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[authError,setAuthError]=useState("");
 const addLog=(message:string,level:Log["level"]="info")=>setLogs(old=>[...old,{id:Date.now()+Math.random(),time:new Date().toLocaleTimeString(),level,message}].slice(-120));
 const termsList=useMemo(()=>terms.split(/[\n,，;；]+/).map(x=>x.trim()).filter(Boolean),[terms]);
 const activeKind=kinds[activeTab]?.id||kind;
 const visible=useMemo(()=>rows.filter(r=>String(r.discovery_type||kind)===activeKind),[rows,activeKind,kind]);
 const count=(id:Kind)=>rows.filter(r=>String(r.discovery_type||kind)===id).length;
 useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setSession(data.session);setReady(true);}});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);setReady(true);});return()=>{alive=false;subscription.unsubscribe();};},[]);
 useEffect(()=>{if(!session?.user){setOrg("");return;} (async()=>{const {data:m,error:me}=await supabase.from("organization_members").select("organization_id").eq("user_id",session.user.id).limit(1).maybeSingle();if(me)throw me;if(!m)throw new Error("当前账号尚未加入企业工作区。");const {data:o,error:oe}=await supabase.from("organizations").select("id,name").eq("id",m.organization_id).single();if(oe)throw oe;setOrg(o.id);setOrgName(o.name);})().catch(e=>setError(e instanceof Error?e.message:"无法读取企业工作区。"));},[session]);
 const loadHistory=async(id:string)=>{const {data,error:e}=await supabase.functions.invoke("linkedin-discovery",{body:{action:"list_history",organization_id:id}});if(e)throw e;if(data?.error)throw new Error(data.error);setHistory(data.history||[]);};
 useEffect(()=>{if(org)void loadHistory(org).catch(e=>setError(e instanceof Error?e.message:"无法读取 LinkedIn 任务历史。"));},[org]);
 const run=async()=>{
  setError("");setNotice("");setHistoryId("");
  if(kind==="enrich"?!urls.trim():kind==="jobs"?(!termsList.length&&!role):!termsList.length){setError(kind==="enrich"?"请粘贴至少一个 LinkedIn URL。":"请至少输入一个搜索关键词或选择职位。");return;}
  if(!org){setError("当前账号没有可用的企业工作区。");return;}
  setBusy(true);setRows([]);setMeta(null);setActiveTab(kinds.findIndex(k=>k.id===kind));setLogs([]);
  addLog("已创建 LinkedIn 发现请求。");addLog("正在校验登录状态、组织权限与 Apify 连接。");
  const actor=kind==="people"?"harvestapi/linkedin-profile-search":kind==="companies"?"harvestapi/linkedin-company-search":kind==="posts"?"insights_data/linkedin-post-search-scraper-no-cookies":kind==="jobs"?"data_forge_org/linkedin-scraper":"按补全对象选择固定 Actor";
  addLog("正在提交 "+actor+"。");
  try{
   const {data,error:e}=await supabase.functions.invoke("linkedin-discovery",{body:{action:"collect",organization_id:org,discovery_type:kind,search_terms:termsList,location:country?.id||"",job_title:role?.id||"",max_results:limit,date_range:dateRange,enrich_type:enrichType,urls:urls.split(/[\n,，;；]+/).map(x=>x.trim()).filter(Boolean)}});
   if(e)throw e;if(data?.error)throw new Error(data.error);
   setRows(data.results||[]);setMeta(data.actor_meta||null);
   addLog("Actor 已完成，Dataset 已读取。","success");
   for(const a of data.actor_meta?.actors||[]){addLog("完成 "+a.actor_id+" · "+a.status+" · Dataset "+a.dataset_id,"success");if(a.run_log){addLog("Apify Run 原始日志："+a.actor_id);String(a.run_log).split(/\r?\n/).filter(Boolean).slice(-100).forEach((line:string)=>addLog(line));}else addLog("Actor 未返回可读取的 Run 日志。","warning");}
   addLog("已保存 "+(data.result_count||0)+" 条结果。","success");setNotice("发现任务完成，共返回 "+(data.result_count||0)+" 条记录。");await loadHistory(org);
  }catch(e){const msg=e instanceof Error?e.message:"LinkedIn 发现任务失败。";setError(msg);addLog("任务失败："+msg,"error");}
  finally{setBusy(false);}
 };
 const openHistory=async(h:History)=>{setBusy(true);setError("");setNotice("");setHistoryId(h.id);setLogs([]);addLog("正在载入历史任务 "+h.id);try{const {data,error:e}=await supabase.functions.invoke("linkedin-discovery",{body:{action:"get_history",organization_id:org,task_id:h.id}});if(e)throw e;if(data?.error)throw new Error(data.error);const x=data.history;setRows(x.raw_items||[]);setMeta(x.actor_meta||null);for(const a of x.actor_meta?.actors||[]){addLog("历史 Actor："+a.actor_id+" · Run "+a.run_id,"success");if(a.run_log)String(a.run_log).split(/\r?\n/).filter(Boolean).slice(-100).forEach((line:string)=>addLog(line));}const s=x.input_snapshot||{};const next=s.discovery_type||"people";setKind(next);setActiveTab(kinds.findIndex(k=>k.id===next));setTerms((s.search_terms||[]).join("\n"));setUrls((s.urls||[]).join("\n"));setNotice("已载入历史任务结果。");addLog("历史数据读取完成。","success");}catch(e){const msg=e instanceof Error?e.message:"读取历史任务失败。";setError(msg);addLog(msg,"error");}finally{setBusy(false);}};
 const login=async(e:FormEvent)=>{e.preventDefault();setAuthError("");const {error:e2}=await supabase.auth.signInWithPassword({email,password});if(e2)setAuthError(e2.message);};
 if(!ready)return <div className="li-boot">正在连接 LinkedIn 发现工作台…</div>;
 if(!session)return <form className="li-login" onSubmit={login}><h2>登录企业工作区</h2><TextInput id="li-email" labelText="邮箱" value={email} onChange={e=>setEmail(e.target.value)}/><TextInput id="li-password" labelText="密码" type="password" value={password} onChange={e=>setPassword(e.target.value)}/>{authError&&<InlineNotification kind="error" title="登录失败" subtitle={authError} hideCloseButton/>}<Button type="submit">登录</Button></form>;
 return <section className="linkedin-discovery">
  <PageHeader title="LinkedIn 公开信息发现" description="发现目标企业、采购决策者、公开帖子与招聘信号，保留 Actor 来源及原始数据。" actions={<Tag type="blue">{orgName||"企业工作区"}</Tag>} />
  <section className="li-panel li-config">
   <CollectionModeGrid title="选择发现对象" description="按对象类型显示对应参数" ariaLabel="选择 LinkedIn 发现对象" options={kinds} selectedId={kind} onSelect={id=>{setKind(id as Kind);setRows([]);setMeta(null);setError("");setNotice("");}} />
   <div className="li-form-grid">
    {kind!=="enrich"&&<div className="li-field li-keywords"><TextArea id="li-keywords" labelText={kind==="posts"?"搜索关键词 / 话题":"搜索关键词"} placeholder={kind==="people"?"例如：B2B Purchasing Manager\n也可通过职位筛选进一步限定":kind==="companies"?"例如：Consumer Electronics Distributor":"例如：wireless earbuds, sourcing, procurement"} value={terms} onChange={e=>setTerms(e.target.value)} rows={3}/><small>{termsList.length} 个关键词 · 换行或逗号分隔</small></div>}
    {kind!=="enrich"&&kind!=="posts"&&<div className="li-field"><ComboBox id="li-country" titleText="国家 / 地区" placeholder="选择国家或地区" items={countries} itemToString={x=>x?.label||""} selectedItem={country} onChange={({selectedItem})=>setCountry(selectedItem||null)}/><small>按 Actor 支持的 LinkedIn 地区名称传入。</small></div>}
    {(kind==="people"||kind==="jobs")&&<div className="li-field"><ComboBox id="li-job-title" titleText={kind==="people"?"当前职位筛选":"目标招聘职位"} placeholder="选择职位（可选）" items={roles} itemToString={x=>x?.label||""} selectedItem={role} onChange={({selectedItem})=>setRole(selectedItem||null)}/><small>人员搜索对应 currentJobTitles；招聘搜索将职位写入 LinkedIn Jobs 搜索 URL。</small></div>}
    {kind==="posts"&&<div className="li-field"><ComboBox id="li-date-range" titleText="帖子时间范围" items={[{id:"any",label:"不限"},{id:"24h",label:"过去 24 小时"},{id:"week",label:"过去 7 天"},{id:"month",label:"过去 30 天"},{id:"3months",label:"过去 3 个月"},{id:"year",label:"过去 1 年"}]} itemToString={x=>x?.label||""} selectedItem={[{id:"any",label:"不限"},{id:"24h",label:"过去 24 小时"},{id:"week",label:"过去 7 天"},{id:"month",label:"过去 30 天"},{id:"3months",label:"过去 3 个月"},{id:"year",label:"过去 1 年"}].find(x=>x.id===dateRange)||null} onChange={({selectedItem})=>setDateRange(selectedItem?.id||"month")}/></div>}
    {kind==="enrich"&&<><div className="li-field"><ComboBox id="li-enrich-type" titleText="补全对象" items={[{id:"person",label:"人员资料"},{id:"company",label:"企业资料"},{id:"person_posts",label:"人员公开动态"}]} itemToString={x=>x?.label||""} selectedItem={[{id:"person",label:"人员资料"},{id:"company",label:"企业资料"},{id:"person_posts",label:"人员公开动态"}].find(x=>x.id===enrichType)||null} onChange={({selectedItem})=>setEnrichType(selectedItem?.id||"person")}/></div><div className="li-field li-keywords"><TextArea id="li-urls" labelText="LinkedIn URL" placeholder="每行一个 LinkedIn 个人或企业主页 URL" value={urls} onChange={e=>setUrls(e.target.value)} rows={4}/><small>仅提交公开可访问的 LinkedIn URL。</small></div></>}
    {kind!=="enrich"&&<div className="li-field"><NumberInput id="li-max" label="最多返回结果" min={1} max={200} value={limit} onChange={(_e,{value})=>setLimit(Number(value)||50)}/><small>单次任务最多 {limit} 条；实际数量取决于 LinkedIn 公开结果。</small></div>}
   </div>
   <div className="li-submit"><span>Apify Token 仅在服务端解密和调用；Actor ID 固定在服务端代码中。</span><Button onClick={run} disabled={busy}>{busy?"正在发现…":"开始 LinkedIn 发现"}</Button></div>
   {error&&<InlineNotification kind="error" title="任务未完成" subtitle={error} onCloseButtonClick={()=>setError("")}/>}
   {notice&&<InlineNotification kind="success" title="任务状态" subtitle={notice} onCloseButtonClick={()=>setNotice("")}/>}
  </section>
  <section className="li-panel li-logs"><div className="li-section-head"><div><span className="eyebrow">RUN ACTIVITY</span><h3>任务日志</h3><p>同时显示页面任务阶段与 Apify Run 原始日志；不将阶段事件伪装为 Actor 实时日志。</p></div><div className="li-log-tools"><Tag type={busy?"blue":"gray"}>{busy?"执行中":"空闲"}</Tag><Button kind="ghost" size="sm" onClick={()=>setLogs([])}>清空日志</Button></div></div><div className="li-console" aria-live="polite">{logs.length?logs.map(l=><div className={"li-log "+l.level} key={l.id}><time>{l.time}</time><i/><span>{l.message}</span></div>):<div className="li-log-empty">等待任务事件。开始发现后将在此处显示执行日志。</div>}</div></section>
  <section className="li-panel li-results"><div className="li-section-head"><div><span className="eyebrow">DISCOVERY RESULTS</span><h3>发现结果</h3><p>使用对象 Tab 切换对应 Carbon 表格，实际字段以 Actor 返回为准。</p></div><strong>{rows.length.toLocaleString()} 条</strong></div>
   <Tabs selectedIndex={activeTab} onChange={({selectedIndex})=>setActiveTab(selectedIndex)}><TabList aria-label="LinkedIn 发现结果">{kinds.map(k=>{const Icon=k.icon;return <Tab key={k.id} id={"li-tab-"+k.id}><span className="li-tab-label"><Icon size={16}/>{k.label}<small>{count(k.id)}</small></span></Tab>;})}</TabList>
    <TabPanels>{kinds.map(k=><TabPanel key={k.id}>{busy?<div className="li-empty">正在执行 Actor 并读取 Dataset…</div>:<DataTable rows={visible} kind={k.id}/>}</TabPanel>)}</TabPanels>
   </Tabs>
   {meta?.actors?.length>0&&<div className="li-meta"><strong>采集执行信息</strong>{meta.actors.map((a:any)=><div key={a.run_id}><span>{a.actor_id}</span><small>Run：{a.run_id} · Dataset：{a.dataset_id}</small></div>)}</div>}
  </section>
  <section className="li-panel li-history"><div className="li-section-head"><div><span className="eyebrow">TASK HISTORY</span><h3>历史发现任务</h3></div><Button kind="ghost" size="sm" onClick={()=>loadHistory(org)}>刷新记录</Button></div>
   {!history.length?<div className="li-empty">暂无历史 LinkedIn 发现任务</div>:<div className="li-history-list">{history.map(h=><ClickableTile key={h.id} className={historyId===h.id?"li-history-row selected":"li-history-row"} onClick={()=>openHistory(h)}><span><strong>{h.title}</strong><small>{new Date(h.created_at).toLocaleString()}</small></span><span><Tag type={h.status==="succeeded"?"green":h.status==="failed"?"red":"warm-gray"}>{statusName(h.status)}</Tag><small>{h.result_count||0} 条</small></span></ClickableTile>)}</div>}
  </section>
 </section>;
}
