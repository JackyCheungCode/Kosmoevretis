import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, InlineNotification, NumberInput, Search, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tabs, TabList, Tab, TextArea, TextInput, Tag } from "@carbon/react";
import { Download } from "@carbon/icons-react";
import { supabase } from "../lib/supabase";
import { EmptyState, ErrorState, IntelligencePageTemplate, LoadingState, PageSection } from "../design-system";
import { CollectionModeGrid } from "../design-system/components/CollectionModeGrid";
import "./platform-data-collection.css";

type Platform = "x" | "reddit" | "pinterest" | "tiktok" | "youtube";
type RowData = Record<string, unknown>;
type History = {id:string;title:string;status:string;result_count:number;created_at:string};
type LogEntry = {id:number;time:string;level:"info"|"success"|"error";message:string};
type Mode = {id:string;label:string;description:string;inputLabel:string;placeholder:string;target:boolean;keyword?:boolean};
const config:Record<Platform,{name:string;description:string;modes:Mode[]}> = {
 x:{name:"X",description:"覆盖公开动态检索、账号研究、互动关系、社区与趋势发现。",modes:[
  {id:"search",label:"关键词搜索",description:"高级搜索语法、最新 / 热门 / 媒体结果",inputLabel:"搜索关键词或 X 高级查询",placeholder:'wireless earbuds\\n"smart home" min_faves:100',target:true},
  {id:"profile",label:"账号档案",description:"账号简介、粉丝、关注、链接及公开资料",inputLabel:"用户名或主页 URL",placeholder:"@Sony 或 https://x.com/Sony",target:true},
  {id:"userPosts",label:"账号动态",description:"账号帖子、回复、媒体、点赞及文章",inputLabel:"账号用户名或主页 URL",placeholder:"每行一个 X 账号",target:true},
  {id:"postDetail",label:"帖子与回复",description:"帖子详情、对话上下文和公开回复线程",inputLabel:"帖子 URL 或 ID",placeholder:"https://x.com/user/status/...",target:true},
  {id:"postEngagement",label:"互动用户",description:"转发者、引用者及可见点赞用户",inputLabel:"帖子 URL 或 ID",placeholder:"每行一个帖子链接",target:true},
  {id:"connections",label:"关注关系",description:"粉丝、关注、认证粉丝、互关及订阅者",inputLabel:"账号用户名或主页 URL",placeholder:"每行一个 X 账号",target:true},
  {id:"list",label:"列表采集",description:"公开列表详情、成员或列表动态",inputLabel:"X List URL",placeholder:"https://x.com/i/lists/...",target:true},
  {id:"community",label:"社区采集",description:"公开社区帖子与成员",inputLabel:"X Community URL",placeholder:"https://x.com/i/communities/...",target:true},
  {id:"trends",label:"趋势榜单",description:"地区趋势主题与排名",inputLabel:"地区（可选）",placeholder:"worldwide / United States / Japan",target:false}
 ]},
 reddit:{name:"Reddit",description:"覆盖社区、全站搜索、帖子、评论树及用户公开活动。",modes:[
  {id:"subreddit_posts",label:"社区帖子",description:"Hot / New / Top / Rising / Controversial",inputLabel:"Subreddit 名称",placeholder:"r/headphones 可写 headphones",target:true},
  {id:"search",label:"全站关键词",description:"跨社区搜索帖子与评论，可批量关键词",inputLabel:"关键词 / 精确短语",placeholder:'"wireless earbuds"\\n"mechanical keyboard"',target:false,keyword:true},
  {id:"user_profile",label:"用户档案",description:"用户公开帖子、评论与社区活动",inputLabel:"Reddit 用户名",placeholder:"每行一个用户名，不含 u/",target:true},
  {id:"post_comments",label:"帖子评论树",description:"指定帖子下的评论、嵌套回复与评分",inputLabel:"Reddit 帖子 URL",placeholder:"https://www.reddit.com/r/.../comments/...",target:true}
 ]},
 pinterest:{name:"Pinterest",description:"覆盖灵感搜索、Pin、创作者、Board、分区及相关 Pin。",modes:[
  {id:"search",label:"关键词搜索",description:"搜索 Pins、视频、Board 或创作者",inputLabel:"搜索关键词",placeholder:"desk setup\\nwireless charging station",target:true},
  {id:"pinDetail",label:"Pin 详情",description:"图片 / 视频、外链、保存、互动和完整详情",inputLabel:"Pin URL 或 ID",placeholder:"https://www.pinterest.com/pin/...",target:true},
  {id:"profile",label:"创作者档案",description:"公开账号、粉丝、简介及链接",inputLabel:"用户名或个人主页 URL",placeholder:"@pinterest 或个人主页 URL",target:true},
  {id:"userPins",label:"用户作品",description:"指定创作者发布的 Pins",inputLabel:"用户名或个人主页 URL",placeholder:"每行一个 Pinterest 用户",target:true},
  {id:"board",label:"Board 采集",description:"Board 信息及其 Pin 内容",inputLabel:"Board URL",placeholder:"https://www.pinterest.com/user/board/",target:true},
  {id:"boardSections",label:"Board 分区",description:"公开 Board 的分区结构",inputLabel:"Board URL",placeholder:"https://www.pinterest.com/user/board/",target:true},
  {id:"relatedPins",label:"相关推荐",description:"围绕 Pin 发现相似内容",inputLabel:"Pin URL 或 ID",placeholder:"https://www.pinterest.com/pin/...",target:true}
 ]},
 tiktok:{name:"TikTok",description:"覆盖短视频、创作者、关键词、Hashtag、评论、字幕与声音。",modes:[
  {id:"search",label:"关键词搜索",description:"搜索公开视频并按热度或时间排序",inputLabel:"搜索关键词",placeholder:"wireless earbuds\\nportable monitor",target:false,keyword:true},
  {id:"hashtags",label:"Hashtag 趋势",description:"标签视频、热度及创作者发现",inputLabel:"Hashtag",placeholder:"#techgadgets\\n#smarthome",target:false,keyword:true},
  {id:"profiles",label:"创作者档案",description:"账号资料、粉丝数及公开主页信息",inputLabel:"用户名或主页 URL",placeholder:"@creator 或 TikTok 主页 URL",target:true},
  {id:"creatorVideos",label:"创作者作品",description:"指定创作者发布的视频与互动数据",inputLabel:"创作者用户名或主页 URL",placeholder:"每行一个 TikTok 创作者",target:true},
  {id:"videos",label:"视频详情",description:"视频数据、音乐、标签及媒体",inputLabel:"视频 / 声音 / 主页 URL",placeholder:"https://www.tiktok.com/@user/video/...",target:true},
  {id:"comments",label:"评论洞察",description:"视频评论与公开回复",inputLabel:"视频 URL",placeholder:"每行一个 TikTok 视频链接",target:true},
  {id:"sounds",label:"声音趋势",description:"音乐 / 声音及关联视频",inputLabel:"TikTok 声音 URL",placeholder:"https://www.tiktok.com/music/...",target:true},
  {id:"live",label:"直播发现",description:"通过公开直播间或创作者主页链接发现直播内容",inputLabel:"直播间或创作者主页 URL",placeholder:"TikTok LIVE 或创作者主页 URL",target:true}
 ]},
 youtube:{name:"YouTube",description:"覆盖视频、频道、播放列表、Shorts、直播、社区、评论、字幕及内容洞察。",modes:[
  {id:"complete",label:"综合采集",description:"自动识别视频、频道、播放列表、搜索和标签",inputLabel:"关键词、频道或视频 URL",placeholder:"wireless earbuds review\\nhttps://www.youtube.com/@Sony",target:true},
  {id:"search",label:"视频与频道搜索",description:"关键词搜索、类型、上传日期和热度",inputLabel:"搜索关键词",placeholder:"best noise cancelling headphones",target:false,keyword:true},
  {id:"channel",label:"频道档案",description:"频道信息、视频、Shorts、直播与社区帖子",inputLabel:"频道 URL 或 @handle",placeholder:"https://www.youtube.com/@Sony",target:true},
  {id:"video",label:"视频详情",description:"视频元数据、章节、标签、播放和互动",inputLabel:"视频 / Shorts URL",placeholder:"https://www.youtube.com/watch?v=...",target:true},
  {id:"comments",label:"评论洞察",description:"评论、作者、点赞及嵌套回复",inputLabel:"视频 URL",placeholder:"每行一个 YouTube 视频链接",target:true},
  {id:"transcripts",label:"字幕与转录",description:"多语言字幕、时间戳与文本",inputLabel:"视频 URL",placeholder:"每行一个视频链接",target:true},
  {id:"playlists",label:"播放列表",description:"播放列表信息、视频清单及顺序",inputLabel:"Playlist URL",placeholder:"https://www.youtube.com/playlist?list=...",target:true},
  {id:"trending",label:"趋势与直播",description:"热门发现、直播与回放（尽力获取）",inputLabel:"地区或搜索词",placeholder:"US / gaming / consumer electronics",target:false,keyword:true}
 ]}
};
const tabs=[{id:"overview",label:"情报总览"},{id:"records",label:"采集结果"},{id:"raw",label:"完整原始数据"}];
const lines=(s:string)=>s.split(/[\n,，;；]+/).map(x=>x.trim()).filter(Boolean);
const stringify=(v:unknown)=>v==null?"—":typeof v==="object"?JSON.stringify(v):String(v);
function exportRows(rows:RowData[],platform:string){const blob=new Blob([JSON.stringify(rows,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=platform+"-platform-data.json";a.click();URL.revokeObjectURL(url);}
const commonFieldLabels:Record<string,string>={id:"记录 ID",url:"内容链接",permalink:"内容链接",username:"账号",author:"作者",authorName:"作者",title:"标题",description:"描述",text:"内容",fullText:"内容",caption:"文案",createdAt:"发布时间",publishedAt:"发布时间",timestamp:"时间",likeCount:"点赞",likes:"点赞",viewCount:"播放量",views:"播放量",commentCount:"评论数",comments:"评论数",shareCount:"分享数",shares:"分享数",followerCount:"粉丝数",followers:"粉丝数",score:"评分",subreddit:"社区",channelName:"频道",duration:"时长",language:"语言"};
const platformFieldLabels:Record<Platform,Record<string,string>>={
 x:{fullText:"动态内容",retweetCount:"转发数",replyCount:"回复数",viewCount:"浏览量",authorName:"账号名称"},
 reddit:{selftext:"帖子正文",upvoteRatio:"赞同率",numComments:"评论数",createdUtc:"发布时间"},
 pinterest:{pinId:"Pin ID",imageUrl:"图片链接",saves:"保存数",repins:"转存数",boardName:"画板"},
 tiktok:{desc:"视频文案",playCount:"播放量",diggCount:"点赞数",createTime:"发布时间",webVideoUrl:"视频链接",musicTitle:"音乐"},
 youtube:{channelName:"频道",viewCount:"播放量",publishedAt:"发布时间",likeCount:"点赞数"}
};
function ResultRows({rows,platform}:{rows:RowData[];platform:Platform}){if(!rows.length)return <EmptyState title="暂无采集结果" description="任务完成后，公开数据将在此处展示。"/>;const keys=Array.from(new Set(rows.flatMap(r=>Object.keys(r)))).slice(0,10);return <div className="pdc-table-wrap" role="region" aria-label="采集记录，可横向滚动" tabIndex={0}><TableContainer title="采集记录"><Table size="lg" useZebraStyles><TableHead><TableRow>{keys.map(k=><TableHeader key={k}>{platformFieldLabels[platform][k]||commonFieldLabels[k]||k}</TableHeader>)}</TableRow></TableHead><TableBody>{rows.slice(0,200).map((r,i)=><TableRow key={String(r.id||r.url||i)}>{keys.map(k=>{const value=r[k];return <TableCell key={k}>{typeof value==="string"&&(value.startsWith("https://")||value.startsWith("http://"))?<a href={value} target="_blank" rel="noreferrer">打开链接</a>:<span title={stringify(value)}>{stringify(value)}</span>}</TableCell>;})}</TableRow>)}</TableBody></Table></TableContainer></div>;}
export default function PlatformDataCollection({platform}:{platform:Platform}){
 const cfg=config[platform], [session,setSession]=useState<any>(null),[org,setOrg]=useState("");
 const [mode,setMode]=useState(cfg.modes[0].id),[targets,setTargets]=useState(""),[limit,setLimit]=useState(50),[activeTab,setActiveTab]=useState("overview");
 const [rows,setRows]=useState<RowData[]>([]),[history,setHistory]=useState<History[]>([]),[selectedHistory,setSelectedHistory]=useState("");
 const [resultMode,setResultMode]=useState(cfg.modes[0].id),[logs,setLogs]=useState<LogEntry[]>([]);
 const [loading,setLoading]=useState(false),[historyLoading,setHistoryLoading]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[filter,setFilter]=useState("");
 const [comments,setComments]=useState(true),[subtitles,setSubtitles]=useState(false),[replies,setReplies]=useState(true),[insights,setInsights]=useState(true),[region,setRegion]=useState("US");
 const current=cfg.modes.find(m=>m.id===mode)||cfg.modes[0], inputs=useMemo(()=>lines(targets),[targets]);
 const addLog=(message:string,level:LogEntry["level"]="info")=>setLogs(old=>[...old,{id:Date.now()+Math.random(),time:new Date().toLocaleTimeString(),level,message}].slice(-100));
 const typeOf=(row:RowData)=>String(row.discovery_type||row.objectType||row.contentType||row.type||mode);
 const resultRows=useMemo(()=>rows.filter(row=>typeOf(row)===resultMode),[rows,resultMode,mode]);
 const resultCount=(id:string)=>rows.filter(row=>typeOf(row)===id).length;
 const visible=useMemo(()=>rows.filter(r=>!filter||JSON.stringify(r).toLowerCase().includes(filter.toLowerCase())),[rows,filter]);
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session));const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>subscription.unsubscribe();},[]);
 useEffect(()=>{if(!session?.user)return;let live=true;(async()=>{const {data:m,error:e}=await supabase.from("organization_members").select("organization_id").eq("user_id",session.user.id).limit(1).maybeSingle();if(e)throw e;if(!m)throw new Error("当前账号尚未加入企业工作区。");if(live)setOrg(m.organization_id);})().catch(e=>setError(e instanceof Error?e.message:"无法读取企业工作区。"));return()=>{live=false;};},[session]);
 const loadHistory=async()=>{if(!org)return;setHistoryLoading(true);try{const {data,error:e}=await supabase.functions.invoke("platform-data-collection",{body:{action:"list_history",organization_id:org,platform}});if(e)throw e;if(data?.error)throw new Error(data.error);setHistory(data.history||[]);}catch(e){setError(e instanceof Error?e.message:"读取历史失败。");}finally{setHistoryLoading(false);}};
 useEffect(()=>{if(org)void loadHistory();},[org,platform]);
 const run=async()=>{setError("");setNotice("");setSelectedHistory("");setResultMode(mode);setLogs([]);if(!current.keyword&&!inputs.length&&mode!=="trends"){setError("请先填写采集目标。");return;}if(current.keyword&&!inputs.length){setError("请先填写搜索关键词。");return;}if(!org){setError("当前账号没有可用的企业工作区。");return;}setLoading(true);setRows([]);setActiveTab("overview");addLog("已创建发现请求，准备提交服务端。");addLog("正在校验企业权限与平台连接状态。");addLog("正在启动 "+cfg.name+" "+current.label+" 任务。");addLog("服务端正在执行采集并整理数据；此处为任务阶段日志，不代表 Actor 内部实时日志。");try{const {data,error:e}=await supabase.functions.invoke("platform-data-collection",{body:{action:"collect",organization_id:org,platform,mode,targets:inputs,max_results:limit,options:{comments,subtitles,replies,insights,region}}});if(e)throw e;if(data?.error)throw new Error(data.error);setRows(data.results||[]);addLog("采集请求已返回，共 "+Number(data.result_count||0).toLocaleString()+" 条记录。","success");setNotice("采集任务完成，共返回 "+Number(data.result_count||0).toLocaleString()+" 条记录。");await loadHistory();addLog("任务已写入历史记录。","success");}catch(e){const message=e instanceof Error?e.message:"平台采集任务失败。";setError(message);addLog("任务失败："+message,"error");}finally{setLoading(false);}};
 const openHistory=async(id:string)=>{setLoading(true);setError("");try{const {data,error:e}=await supabase.functions.invoke("platform-data-collection",{body:{action:"get_history",organization_id:org,platform,task_id:id}});if(e)throw e;if(data?.error)throw new Error(data.error);const task=data.history;setRows(task.raw_items||[]);const restoredMode=task.input_snapshot?.mode||cfg.modes[0].id;setMode(restoredMode);setResultMode(restoredMode);setTargets((task.input_snapshot?.targets||[]).join("\n"));setSelectedHistory(id);setNotice("已载入历史任务。");setActiveTab("overview");setLogs([]);addLog("历史任务数据已载入："+task.raw_items?.length+" 条。","success");}catch(e){setError(e instanceof Error?e.message:"读取历史任务失败。");}finally{setLoading(false);}};
 const nav=<Tabs selectedIndex={Math.max(0,tabs.findIndex(t=>t.id===activeTab))} onChange={({selectedIndex})=>setActiveTab(tabs[selectedIndex]?.id||"overview")}><TabList aria-label={cfg.name+" 采集结果"}>{tabs.map(t=><Tab key={t.id}>{t.label}</Tab>)}</TabList></Tabs>;
 const source=<section className="pdc-config-panel"><div className="pdc-config-heading discovery-object-heading"><div><span className="eyebrow">发现对象</span><h3>选择发现对象</h3></div><span>一个渠道，多种公开对象</span></div>
  <CollectionModeGrid ariaLabel={cfg.name+" 采集能力"} options={cfg.modes} selectedId={mode} onSelect={id=>{setMode(id);setResultMode(id);setRows([]);setError("");setNotice("");}}/>
  <div className="pdc-form"><div><TextArea id={"pdc-targets-"+platform} labelText={current.inputLabel} placeholder={current.placeholder} value={targets} onChange={e=>setTargets(e.target.value)} rows={4}/><span className="pdc-help">{inputs.length} 个输入 · 每行一个</span></div>
   <div className="pdc-options"><NumberInput id={"pdc-limit-"+platform} label="最多返回结果" min={1} max={500} value={limit} onChange={(_e,s)=>setLimit(Number(s.value)||50)}/><TextInput id={"pdc-region-"+platform} labelText="地区 / 市场" value={region} onChange={e=>setRegion(e.target.value)} placeholder="US / GB / JP"/></div>
  </div>
  <div className="pdc-toggles"><Checkbox id={"pdc-comments-"+platform} labelText="采集评论" checked={comments} onChange={(_e,{checked})=>setComments(checked)}/><Checkbox id={"pdc-replies-"+platform} labelText="采集评论回复" checked={replies} onChange={(_e,{checked})=>setReplies(checked)}/><Checkbox id={"pdc-subtitles-"+platform} labelText="采集字幕 / 转录" checked={subtitles} onChange={(_e,{checked})=>setSubtitles(checked)}/><Checkbox id={"pdc-insights-"+platform} labelText="扩展内容洞察" checked={insights} onChange={(_e,{checked})=>setInsights(checked)}/></div>
  <div className="pdc-submit"><span>任务仅在你主动启动时执行，可能产生数据服务费用。</span><Button onClick={run} disabled={loading||!org}>{loading?"正在采集…":"开始 "+cfg.name+" 发现"}</Button></div>
  {error&&<ErrorState description={error}/ >}{notice&&<InlineNotification kind="success" title="任务状态" subtitle={notice} lowContrast hideCloseButton/>}
 </section>;
 const activity=<section className="pdc-activity"><div className="pdc-section-head"><div><span className="pdc-eyebrow">02 / 实时活动</span><h3>任务日志</h3><p>展示页面任务阶段事件，不伪装为 Actor 内部实时日志。</p></div><div className="pdc-activity-actions"><Tag type={loading?"blue":"gray"}>{loading?"执行中":"空闲"}</Tag><Button kind="ghost" size="sm" onClick={()=>setLogs([])}>清空日志</Button></div></div><div className="pdc-log-console" aria-live="polite">{logs.length?logs.map(log=><div className={"pdc-log-line "+log.level} key={log.id}><time>{log.time}</time><span>{log.message}</span></div>):<div className="pdc-log-empty">等待任务事件。启动发现后，日志将在此处追加。</div>}</div></section>;
 return <IntelligencePageTemplate title={cfg.name+" 公开信息发现"} description={cfg.description+" 按对象类型发现公开数据，配置完成后手动启动任务。"} sourceConfiguration={<>{source}{activity}</>} navigation={nav}>
 <PageSection title="采集结果" description="查看结构化记录、筛选结果，或导出完整原始数据。" actions={<div className="pdc-actions"><Tag type="blue">{rows.length.toLocaleString()} 条记录</Tag><Button kind="ghost" size="sm" renderIcon={Download} onClick={()=>exportRows(rows,platform)} disabled={!rows.length}>导出 JSON</Button></div>}>
  <div className="pdc-history-toolbar"><Search labelText="筛选结果" placeholder="搜索任意字段" value={filter} onChange={e=>setFilter(e.target.value)}/><Button kind="ghost" size="sm" onClick={()=>void loadHistory()} disabled={historyLoading}>{historyLoading?"刷新中…":"刷新记录"}</Button></div>
  {loading&&<LoadingState description="正在采集并整理公开数据…"/>}
  <section className="pdc-history-section"><div className="pdc-section-head"><div><span className="pdc-eyebrow">04 / 历史任务</span><h3>历史发现任务</h3></div></div>{!history.length?<div className="pdc-history-empty">暂无历史发现任务</div>:<div className="pdc-history-list">{history.map(item=><button type="button" key={item.id} className={"pdc-history-row"+(selectedHistory===item.id?" selected":"")} onClick={()=>void openHistory(item.id)}><span><strong>{item.title}</strong><small>{new Date(item.created_at).toLocaleString()}</small></span><span className="pdc-history-meta"><Tag type={item.status==="succeeded"?"green":item.status==="failed"?"red":"warm-gray"}>{item.status==="succeeded"?"已完成":item.status==="failed"?"失败":item.status==="partial"?"部分完成":item.status}</Tag><small>{item.result_count||0} 条</small></span></button>)}</div>}</section>
  {activeTab==="raw"?(rows.length?<div className="pdc-raw"><pre>{JSON.stringify(rows,null,2)}</pre><Button kind="secondary" renderIcon={Download} onClick={()=>exportRows(rows,platform)}>导出完整 JSON</Button></div>:<EmptyState title="暂无原始数据" description="执行采集后可查看完整原始字段。"/>):activeTab==="records"?<><div className="pdc-result-heading"><div><span className="pdc-eyebrow">03 / DISCOVERY RESULTS</span><h3>发现结果</h3><p>按发现对象分类查看，保留平台原始字段并提供完整 JSON 导出。</p></div><strong>{visible.length.toLocaleString()} 条</strong></div><Tabs selectedIndex={Math.max(0,cfg.modes.findIndex(m=>m.id===resultMode))} onChange={({selectedIndex})=>setResultMode(cfg.modes[selectedIndex]?.id||cfg.modes[0].id)}><TabList aria-label={cfg.name+" 发现结果对象类型"}>{cfg.modes.map(m=><Tab key={m.id}>{m.label} <span className="pdc-tab-count">{resultCount(m.id)}</span></Tab>)}</TabList></Tabs><div className="pdc-result-tab-content">{loading?<LoadingState description="正在采集并整理公开数据…"/>:<ResultRows rows={resultRows.filter(r=>!filter||JSON.stringify(r).toLowerCase().includes(filter.toLowerCase()))} platform={platform}/>}</div></>:<><div className="pdc-kpis"><div><span>结果总量</span><strong>{rows.length.toLocaleString()}</strong></div><div><span>当前筛选</span><strong>{visible.length.toLocaleString()}</strong></div><div><span>当前任务</span><strong>{selectedHistory?"历史任务":rows.length?"已完成":"未执行"}</strong></div><div><span>采集平台</span><strong>{cfg.name}</strong></div></div>{rows.length?<ResultRows rows={visible.slice(0,50)} platform={platform}/>:<EmptyState title={"等待 "+cfg.name+" 采集数据"} description="先配置采集源，再开始任务；本页面不会自动执行采集任务。"/>}</>}
 </PageSection>
 </IntelligencePageTemplate>;
}
