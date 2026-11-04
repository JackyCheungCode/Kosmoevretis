import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, Dropdown, InlineNotification, NumberInput, Search, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tabs, TabList, Tab, TabPanels, TabPanel, TextArea, TextInput, Tag } from "@carbon/react";
import { Download, LogoInstagram } from "@carbon/icons-react";
import { supabase } from "../lib/supabase";
import "./instagram-discovery.css";
import { EmptyState, ErrorState, IntelligencePageTemplate, LoadingState, PageSection, StatusTag } from "../design-system";

type Mode = "profiles" | "posts" | "reels" | "comments" | "hashtags" | "creators" | "places" | "brand";
type RowData = Record<string, unknown>;
type History = { id: string; title: string; status: string; result_count: number; created_at: string };
const ACTOR_ID = "instagram-data-api/instagram-scraper";
const modes: { id: Mode; label: string; description: string; input: string; placeholder: string }[] = [
 {id:"profiles",label:"账号档案",description:"账号简介、粉丝、关注数、认证与主页资料",input:"Instagram 用户名或主页 URL",placeholder:"sony 或 https://www.instagram.com/sony/"},
 {id:"posts",label:"帖子采集",description:"公开帖子、图片、视频、文案与互动数据",input:"账号、帖子或 Reels URL",placeholder:"每行一个账号或 Instagram URL"},
 {id:"reels",label:"Reels 趋势",description:"播放、点赞、评论、收藏、分享与视频信息",input:"账号、Reels URL 或话题",placeholder:"每行一个账号 / Reels URL"},
 {id:"comments",label:"评论洞察",description:"指定帖子与 Reels 下的公开评论",input:"帖子或 Reels URL",placeholder:"每行一个 Instagram 帖子 / Reels URL"},
 {id:"hashtags",label:"Hashtag 趋势",description:"围绕标签发现热门公开帖子与互动",input:"Hashtag / 主题关键词",placeholder:"#wirelessaudio、#smarthome、#gaming"},
 {id:"creators",label:"创作者分析",description:"创作者档案、粉丝规模与公开资料",input:"创作者用户名或主页 URL",placeholder:"每行一个创作者用户名或主页 URL"},
 {id:"places",label:"地点内容",description:"通过 Instagram 地点 URL 发现公开内容",input:"Instagram 地点 URL",placeholder:"每行一个地点 / 位置 URL"},
 {id:"brand",label:"品牌与竞品监控",description:"跟踪品牌账号内容与产品相关市场信号",input:"品牌账号、帖子或 Reels URL",placeholder:"https://www.instagram.com/brand/"},
];
const tabs = [{id:"overview",label:"情报总览"},{id:"profiles",label:"账号档案"},{id:"posts",label:"帖子内容"},{id:"reels",label:"Reels"},{id:"comments",label:"消费者评论"},{id:"hashtags",label:"Hashtag 趋势"},{id:"creators",label:"创作者分析"},{id:"places",label:"地点内容"},{id:"brand",label:"品牌监控"},{id:"raw",label:"完整原始数据"}];
const columns: Record<string,{key:string;label:string}[]> = {
 profiles:[["username","账号"],["fullName","名称"],["biography","简介"],["followers","粉丝"],["following","关注"],["postsCount","帖子数"],["isVerified","认证"],["url","主页"]].map(([key,label])=>({key,label})),
 posts:[["ownerUsername","发布账号"],["caption","内容"],["takenAt","发布时间"],["likes","点赞"],["comments","评论"],["url","内容链接"]].map(([key,label])=>({key,label})),
 reels:[["ownerUsername","创作者"],["caption","内容"],["views","播放"],["likes","点赞"],["comments","评论"],["saves","收藏"],["shares","分享"],["url","Reels 链接"]].map(([key,label])=>({key,label})),
 comments:[["ownerUsername","评论者"],["text","评论内容"],["likes","点赞"],["timestamp","时间"],["postUrl","原帖链接"]].map(([key,label])=>({key,label})),
 hashtags:[["ownerUsername","发布账号"],["caption","内容"],["hashtags","Hashtags"],["likes","点赞"],["comments","评论"],["url","内容链接"]].map(([key,label])=>({key,label})),
 creators:[["username","创作者"],["fullName","名称"],["followers","粉丝"],["postsAnalyzed","样本帖子"],["averageLikes","平均点赞"],["averageComments","平均评论"],["engagementRate","互动率"],["isVerified","认证"],["url","主页"]].map(([key,label])=>({key,label})),
 places:[["locationName","地点"],["ownerUsername","发布账号"],["caption","内容"],["takenAt","发布时间"],["likes","点赞"],["url","内容链接"]].map(([key,label])=>({key,label})),
 brand:[["ownerUsername","账号"],["caption","品牌 / 产品内容"],["hashtags","Hashtags"],["likes","点赞"],["comments","评论"],["views","播放"],["url","内容链接"]].map(([key,label])=>({key,label})),
};
const aliases: Record<string,string[]> = {
 username:["username","ownerUsername"],fullName:["fullName","full_name","name"],biography:["biography","bio","description"],followers:["followers","followerCount","followersCount"],following:["following","followingCount"],postsCount:["postsCount","mediaCount"],isVerified:["isVerified","verified"],url:["url","postUrl","profileUrl","permalink"],ownerUsername:["ownerUsername","username"],caption:["caption","text","description"],takenAt:["takenAt","timestamp","date"],likes:["likes","likesCount","likeCount"],comments:["comments","commentsCount","commentCount"],views:["views","viewCount","playCount","videoPlayCount"],saves:["saves","savedCount"],shares:["shares","shareCount"],hashtags:["hashtags","tags"],text:["text","content","comment"],timestamp:["timestamp","createdAt","date"],postUrl:["postUrl","post_url","url"],locationName:["locationName","location","placeName"],postsAnalyzed:["postsAnalyzed"],averageLikes:["averageLikes"],averageComments:["averageComments"],engagementRate:["engagementRate"]
};
const get = (row:RowData,key:string) => (aliases[key]||[key]).map(k=>row[k]).find(v=>v!==undefined&&v!==null&&v!=="") ?? null;
const show = (v:unknown) => v==null ? "—" : typeof v==="object" ? JSON.stringify(v) : String(v);
const kindOf = (r:RowData) => {
 const type=String(r.discovery_type||r.type||"").toLowerCase();
 if(["profile","details","user"].includes(type)||Boolean(r.username&&!r.caption&&!r.text))return "profiles";
 if(type.includes("comment")||(r.text&&r.ownerUsername&&!r.caption))return "comments";
 if(type.includes("reel")||r.playCount||r.videoPlayCount)return "reels";
 if(type.includes("place")||r.locationName)return "places";
 return "posts";
};
function ResultTable({rows,kind}:{rows:RowData[];kind:string}) {
 const cols=columns[kind]||columns.posts;
 if(!rows.length)return <EmptyState title="暂无此类结果" description="当前任务没有返回该类型记录。可调整发现源后重新执行。"/>;
 return <TableContainer title={tabs.find(t=>t.id===kind)?.label||"发现结果"}><Table size="lg" useZebraStyles><TableHead><TableRow>{cols.map(c=><TableHeader key={c.key}>{c.label}</TableHeader>)}</TableRow></TableHead><TableBody>{rows.map((r,i)=><TableRow key={String(r.id||r.shortcode||r.url||i)+"-"+i}>{cols.map(c=>{const v=get(r,c.key);return <TableCell key={c.key}>{["url","postUrl"].includes(c.key)&&typeof v==="string"&&/^https?:\/\//i.test(v)?<a href={v} target="_blank" rel="noreferrer">{show(v)}</a>:<span title={show(v)}>{show(v)}</span>}</TableCell>;})}</TableRow>)}</TableBody></Table></TableContainer>;
}
const exportJson=(rows:RowData[])=>{const url=URL.createObjectURL(new Blob([JSON.stringify(rows,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="instagram-discovery-results.json";a.click();URL.revokeObjectURL(url);};

export default function InstagramDiscovery() {
 const [session,setSession]=useState<any>(null),[org,setOrg]=useState(""),[orgName,setOrgName]=useState("");
 const [mode,setMode]=useState<Mode>("profiles"),[sources,setSources]=useState(""),[keywords,setKeywords]=useState("");
 const [limit,setLimit]=useState(30),[newerThan,setNewerThan]=useState("30 days");
 const [activeTab,setActiveTab]=useState("overview"),[rows,setRows]=useState<RowData[]>([]),[history,setHistory]=useState<History[]>([]);
 const [selectedHistory,setSelectedHistory]=useState(""),[loading,setLoading]=useState(false),[historyLoading,setHistoryLoading]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[meta,setMeta]=useState<any>(null),[filter,setFilter]=useState("");
 const sourceList=useMemo(()=>sources.split(/[\n,，;；]+/).map(x=>x.trim()).filter(Boolean),[sources]);
 const keywordList=useMemo(()=>keywords.split(/[\n,，;；]+/).map(x=>x.trim().replace(/^#/,"")).filter(Boolean),[keywords]);
 const current=modes.find(x=>x.id===mode)||modes[0];
 const grouped=useMemo(()=>{const out:Record<string,RowData[]>={profiles:[],posts:[],reels:[],comments:[],hashtags:[],creators:[],places:[],brand:[]};rows.forEach(r=>{const k=kindOf(r);out[k].push(r);if(mode==="hashtags"&&k==="posts")out.hashtags.push(r);if(mode==="creators"&&k==="profiles")out.creators.push(r);if(mode==="brand"&&k==="posts")out.brand.push(r);});if(mode==="hashtags"&&!out.hashtags.length)out.hashtags=out.posts;if(mode==="creators")out.creators=out.profiles.map(profile=>{const username=String(get(profile,"username")||"").toLowerCase();const sample=out.posts.filter(post=>String(get(post,"ownerUsername")||"").toLowerCase()===username);const likes=sample.map(post=>Number(get(post,"likes"))||0);const comments=sample.map(post=>Number(get(post,"comments"))||0);const averageLikes=likes.length?Math.round(likes.reduce((a,b)=>a+b,0)/likes.length):0;const averageComments=comments.length?Math.round(comments.reduce((a,b)=>a+b,0)/comments.length):0;const followers=Number(get(profile,"followers"))||0;return {...profile,postsAnalyzed:sample.length,averageLikes,averageComments,engagementRate:followers?Number((((averageLikes+averageComments)/followers)*100).toFixed(2)):null};});if(mode==="brand"&&!out.brand.length)out.brand=out.posts;return out;},[rows,mode]);
 const filtered=useMemo(()=>rows.filter(r=>!filter.trim()||JSON.stringify(r).toLowerCase().includes(filter.trim().toLowerCase())),[rows,filter]);
 useEffect(()=>{let live=true;supabase.auth.getSession().then(({data})=>{if(live)setSession(data.session);});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>{live=false;subscription.unsubscribe();};},[]);
 useEffect(()=>{if(!session?.user){setOrg("");return;}(async()=>{const {data:m,error:me}=await supabase.from("organization_members").select("organization_id").eq("user_id",session.user.id).limit(1).maybeSingle();if(me)throw me;if(!m)throw new Error("当前账号尚未加入企业工作区。");const {data:o,error:oe}=await supabase.from("organizations").select("id,name").eq("id",m.organization_id).single();if(oe)throw oe;setOrg(o.id);setOrgName(o.name);})().catch(e=>setError(e instanceof Error?e.message:"无法读取企业工作区。"));},[session]);
 const loadHistory=async()=>{if(!org)return;setHistoryLoading(true);try{const {data,error:e}=await supabase.functions.invoke("instagram-discovery",{body:{action:"list_history",organization_id:org}});if(e)throw e;if(data?.error)throw new Error(data.error);setHistory(data.history||[]);}catch(e){setError(e instanceof Error?e.message:"无法读取历史任务。");}finally{setHistoryLoading(false);}};
 useEffect(()=>{if(org)void loadHistory();},[org]);
 const run=async()=>{setError("");setNotice("");setSelectedHistory("");if(mode==="hashtags"?!keywordList.length:!sourceList.length){setError("请至少填写一个有效的发现源。");return;}if(mode==="comments"&&sourceList.some(x=>!/instagram\.com\/(p|reel|tv)\//i.test(x))){setError("评论洞察只接受 Instagram 帖子或 Reels URL。");return;}if(!org){setError("当前账号没有可用的企业工作区。");return;}setLoading(true);setRows([]);setMeta(null);setActiveTab("overview");try{const {data,error:e}=await supabase.functions.invoke("instagram-discovery",{body:{action:"collect",organization_id:org,discovery_type:mode,sources:sourceList,keywords:keywordList,max_results:limit,only_newer_than:newerThan}});if(e)throw e;if(data?.error)throw new Error(data.error);setRows(data.results||[]);setMeta(data.actor_meta||null);setNotice("采集任务完成，共返回 "+Number(data.result_count||0).toLocaleString()+" 条记录。");await loadHistory();}catch(e){setError(e instanceof Error?e.message:"Instagram 发现任务失败。");}finally{setLoading(false);}};
 const openHistory=async(id:string)=>{if(!id||!org)return;setSelectedHistory(id);setLoading(true);setError("");setNotice("");try{const {data,error:e}=await supabase.functions.invoke("instagram-discovery",{body:{action:"get_history",organization_id:org,task_id:id}});if(e)throw e;if(data?.error)throw new Error(data.error);const task=data.history;setRows(task.raw_items||[]);setMeta(task.actor_meta||null);const s=task.input_snapshot||{};if(s.discovery_type&&modes.some(x=>x.id===s.discovery_type))setMode(s.discovery_type);setSources(Array.isArray(s.sources)?s.sources.join("\n"):"");setKeywords(Array.isArray(s.keywords)?s.keywords.join("\n"):"");setNotice("已载入历史任务结果。");setActiveTab("overview");}catch(e){setError(e instanceof Error?e.message:"读取历史任务失败。");}finally{setLoading(false);}};
 const resultTabs:ReactNode=<Tabs selectedIndex={Math.max(0,tabs.findIndex(t=>t.id===activeTab))} onChange={({selectedIndex})=>setActiveTab(tabs[selectedIndex]?.id||"overview")}><TabList aria-label="Instagram 情报维度" contained>{tabs.map(t=><Tab key={t.id}>{t.label}</Tab>)}</TabList><TabPanels>{tabs.map(t=><TabPanel key={t.id}>{t.id==="overview"?<div className="ig-overview"><div className="ig-kpis"><div><span>结果总量</span><strong>{rows.length.toLocaleString()}</strong></div><div><span>账号档案</span><strong>{grouped.profiles.length.toLocaleString()}</strong></div><div><span>帖子 / Reels</span><strong>{(grouped.posts.length+grouped.reels.length).toLocaleString()}</strong></div><div><span>评论记录</span><strong>{grouped.comments.length.toLocaleString()}</strong></div></div>{rows.length?<ResultTable rows={filtered.slice(0,20)} kind={mode==="profiles"||mode==="creators"?"profiles":mode==="comments"?"comments":mode==="reels"?"reels":"posts"}/>:<EmptyState title="等待 Instagram 情报数据" description="在上方配置账号、帖子、标签或地点，开始采集后将在这里汇总展示。"/>}</div>:t.id==="raw"?(rows.length?<div className="ig-raw"><pre>{JSON.stringify(rows,null,2)}</pre><Button kind="secondary" renderIcon={Download} onClick={()=>exportJson(rows)}>导出完整 JSON</Button></div>:<EmptyState title="暂无原始数据" description="执行采集任务后，可在这里查看 Actor 返回的完整字段。"/>):<ResultTable rows={grouped[t.id]||[]} kind={t.id}/>}</TabPanel>)}</TabPanels></Tabs>;
 return <IntelligencePageTemplate title="Instagram 全球社交情报" eyebrow="GLOBAL SOCIAL INTELLIGENCE / INSTAGRAM" description="发现全球公开社交内容、热门产品信号、消费者反馈、品牌竞品与创作者。数据采集仅在你主动提交时执行。" sourceConfiguration={<PageSection title="配置 Instagram 发现源" description="选择任务类型，再填写账号、内容、Hashtag 或地点；Actor 输入由服务端按任务类型组装。">
  <div className="ig-actor-info"><div><LogoInstagram size={24}/><div><strong>{ACTOR_ID}</strong><span>主 Actor · 公开数据 · 无需 Instagram 登录 Cookie</span></div></div><StatusTag type="green">推荐主数据源</StatusTag></div>
  <div className="ig-mode-grid" role="group" aria-label="选择 Instagram 发现类型">{modes.map(x=><Button key={x.id} kind="ghost" size="lg" className={mode===x.id?"ig-mode-card is-selected":"ig-mode-card"} aria-pressed={mode===x.id} onClick={()=>{setMode(x.id);setError("");setNotice("");}}><strong>{x.label}</strong><span>{x.description}</span></Button>)}</div>
  <div className="ig-form-grid"><div className="ig-form-source"><TextArea id="ig-sources" labelText={current.input} placeholder={current.placeholder} value={sources} onChange={e=>setSources(e.target.value)} rows={4}/><span className="ig-helper">{sourceList.length} 个输入 · 每行一个；账号可使用用户名或完整 URL</span></div>
   {mode==="hashtags"&&<div><TextArea id="ig-keywords" labelText="Hashtag / 主题词" placeholder="#wirelessaudio\n#smarthome\n#gaming" value={keywords} onChange={e=>setKeywords(e.target.value)} rows={4}/><span className="ig-helper">通过 Actor 的 Hashtag 搜索入口发现公开内容。</span></div>}
   <div className="ig-control"><NumberInput id="ig-limit" label="最多返回结果" min={1} max={200} value={limit} onChange={(_e,s)=>setLimit(Number(s.value)||30)}/><span className="ig-helper">每次任务最多 200 条，实际数量取决于公开数据与 Actor 限制。</span></div>
   {["posts","reels","hashtags","brand"].includes(mode)&&<div className="ig-control"><TextInput id="ig-newer" labelText="仅采集此时间范围内的内容" value={newerThan} onChange={e=>setNewerThan(e.target.value)} placeholder="例如：7 days / 2026-10-01"/><span className="ig-helper">支持相对时间或日期，按 Actor 输入规范传入。</span></div>}
  </div>
  <div className="ig-submit-row"><div><span>Apify Token 由设置中心安全管理，前端不会读取密钥。</span><span>任务执行可能产生费用；页面不会自动启动任务。</span></div><Button kind="primary" onClick={run} disabled={loading||!org}>{loading?"正在执行…":"开始 Instagram 分析"}</Button></div>
  {error&&<ErrorState description={error} />}{notice&&<InlineNotification kind="success" lowContrast title="任务完成" subtitle={notice} hideCloseButton/>}
 </PageSection>} metadata={<div className="ig-metadata"><span>组织：{orgName||"企业工作区"}</span><span>Actor：{ACTOR_ID}</span><span>任务历史：{history.length} 条</span></div>}>
 <PageSection title="情报结果" description="按账号、内容类型和业务主题切换；完整原始数据保留 Actor 返回字段。" actions={<div className="ig-result-actions"><Tag type="blue">{rows.length.toLocaleString()} 条记录</Tag><Button kind="ghost" size="sm" onClick={loadHistory} disabled={historyLoading}>{historyLoading?"刷新中…":"刷新历史"}</Button></div>}>
  <div className="ig-history-bar"><Dropdown id="ig-history" titleText="历史任务" label="选择历史任务" items={history} itemToString={item=>item?item.title+" · "+item.result_count+" 条 · "+new Date(item.created_at).toLocaleString():""} selectedItem={history.find(x=>x.id===selectedHistory)||null} onChange={({selectedItem})=>{if(selectedItem)void openHistory(selectedItem.id);}}/><Search labelText="筛选当前结果" placeholder="搜索账号、文案、标签或字段" value={filter} onChange={e=>setFilter(e.target.value)}/></div>
  {loading&&<LoadingState description="正在执行 Instagram Actor 并读取 Dataset…"/>}
  {meta&&<div className="ig-run-meta"><StatusTag type="green">Actor 已完成</StatusTag><span>Run：{String(meta.actors?.[0]?.run_id||"—")}</span><span>Dataset：{String(meta.actors?.[0]?.dataset_id||"—")}</span><span>费用：{String(meta.actors?.[0]?.usage_total_usd??"以 Apify 账单为准")}</span></div>}
  {resultTabs}
 </PageSection></IntelligencePageTemplate>;
}
