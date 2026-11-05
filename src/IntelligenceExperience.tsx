import { useEffect, useRef, useState } from "react";
import { Accordion, AccordionItem, Button, Checkbox, Search, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag, Tabs, TabList, Tab, TabPanels, TabPanel, TextArea } from "@carbon/react";
import MarkdownReport from "./components/MarkdownReport";
import CarbonSelect from "./components/CarbonSelect";
import "./intelligence.css";
import { supabase } from "./lib/supabase";

type Source = { id:string; slug:string; channel:string; name:string; logo_url:string; website_url:string; description:string; market_codes:string[]; status:string; sort_order:number };
type Capability = { id:string; source_id:string; capability_key:string; label:string; description:string; evidence_type:string; availability_status:string };
type DemoData = {
  demo_notice:string; product:{name:string;category:string;brand:string};
  kpis:{label:string;value:string;delta:string;unit:string}[];
  trend:{period:string;search:number;social:number;commerce:number}[];
  bestsellers:{rank:number;name:string;brand:string;price:number;currency:string;score:number;review_count:number;market:string}[];
  search_terms:{term:string;index:number;growth:string}[];
  social:{platform:string;engagement:number;share:number}[];
  pain_points:{label:string;count:number}[];
  competitors:{name:string;share:number;price:number}[];
  categories:{label:string;value:number}[];
  markets:{code:string;name:string;flag:string;opportunity:number;search:number;social:number;price:number}[];
  ai_reports:{all:string;tabs:Record<string,string>};
};

const statusLabel:Record<string,string>={ready:"可采集",needs_auth:"需授权",limited:"受限",planned:"待接入",error:"异常"};
const statusTone:Record<string,string>={ready:"ready",needs_auth:"auth",limited:"limited",planned:"planned",error:"error"};
const defaultSourceSlugs=["amazon","google-trends","google-news","tiktok","youtube","reddit"];
const collectableSourceSlugs=new Set(["google-trends","google-news","amazon","walmart","ebay","mercado-libre","x","reddit","pinterest","tiktok","youtube","instagram","facebook","linkedin"]);

function LineChart({data}:{data:DemoData["trend"]}) {
  const w=640,h=220,p=30,all=[...data.map(d=>d.search),...data.map(d=>d.social),...data.map(d=>d.commerce)],max=Math.max(...all,100);
  const x=(i:number)=>p+i*(w-p*2)/Math.max(1,data.length-1),y=(v:number)=>h-p-v/max*(h-p*2);
  const path=(key:"search"|"social"|"commerce")=>data.map((d,i)=>(i?"L":"M")+x(i)+","+y(d[key])).join(" ");
  return <div className="gi-chart"><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="多渠道趋势折线图">
    {[0,25,50,75,100].map(v=><g key={v}><line x1={p} x2={w-p} y1={y(v)} y2={y(v)} className="gi-gridline"/><text x={p-8} y={y(v)+4} textAnchor="end" className="gi-axis-label">{v}</text></g>)}
    <path d={path("search")} className="gi-line gi-line-search"/><path d={path("social")} className="gi-line gi-line-social"/><path d={path("commerce")} className="gi-line gi-line-commerce"/>
    {data.map((d,i)=><g key={d.period}><text x={x(i)} y={h-5} textAnchor="middle" className="gi-axis-label">{d.period}</text><circle cx={x(i)} cy={y(d.search)} r="3.5" className="gi-dot-search"/></g>)}
  </svg><div className="gi-legend"><span><i className="search"/>搜索兴趣</span><span><i className="social"/>社交互动</span><span><i className="commerce"/>电商信号</span></div></div>;
}
function BarChart({items}:{items:{label:string;value:number}[]}) {
 const max=Math.max(...items.map(x=>x.value),1);
 return <div className="gi-bars">{items.map(x=><div className="gi-bar-row" key={x.label}><span>{x.label}</span><div><i style={{width:`${x.value/max*100}%`}}/></div><b>{x.value}</b></div>)}</div>;
}
function DonutChart({items}:{items:{label:string;value:number}[]}) {
 const total=items.reduce((s,x)=>s+x.value,0)||1,c=2*Math.PI*43;let offset=0;
 return <div className="gi-donut-wrap"><svg viewBox="0 0 120 120" className="gi-donut" role="img" aria-label="渠道占比圆环图"><circle cx="60" cy="60" r="43" className="gi-donut-track"/>{items.map((item,i)=>{const len=item.value/total*c,el=<circle key={item.label} cx="60" cy="60" r="43" className={`gi-donut-segment gi-segment-${i%5}`} strokeDasharray={`${len} ${c-len}`} strokeDashoffset={-offset} transform="rotate(-90 60 60)"/>;offset+=len;return el;})}<text x="60" y="56" textAnchor="middle" className="gi-donut-total">{total}</text><text x="60" y="70" textAnchor="middle" className="gi-donut-caption">样本</text></svg><div className="gi-donut-legend">{items.map((x,i)=><div key={x.label}><i className={`gi-segment-${i%5}`}/><span>{x.label}</span><b>{Math.round(x.value/total*100)}%</b></div>)}</div></div>;
}
function MarketMap({markets}:{markets:DemoData["markets"]}) {
 const points:Record<string,[number,number]>={US:[155,112],CA:[155,68],GB:[318,72],DE:[340,82],FR:[326,94],JP:[500,110],KR:[480,115],AU:[500,190]};
 return <div className="gi-map-wrap"><svg viewBox="0 0 620 250" role="img" aria-label="全球市场机会分布示意图" className="gi-map"><path className="gi-continent" d="M42 58 L78 30 139 28 174 49 187 81 164 101 151 130 112 142 90 118 62 113 42 87Z M185 148 L212 161 224 194 210 230 191 214 179 180Z M278 48 L317 34 351 47 371 70 356 93 326 99 310 85 289 83Z M333 103 L370 98 397 120 386 159 359 175 339 145Z M398 49 L466 33 532 49 565 77 546 106 501 119 468 98 436 103 412 81Z M474 161 L526 153 557 174 540 206 499 213 475 191Z"/>{markets.map(m=>{const [x,y]=points[m.code]||[300,120];return <g key={m.code}><circle cx={x} cy={y} r={5+m.opportunity/24} className="gi-map-point" opacity=".8"/><text x={x} y={y-12} textAnchor="middle">{m.code}</text></g>;})}</svg><div className="gi-map-legend"><span/>演示机会指数 · 点位为示意坐标</div></div>;
}

export function DataSourceSelector({organizationId,selectedSourceIds,onChange,onLoadDemo}:{organizationId:string|null;selectedMarkets:string[];selectedSourceIds:string[];onChange:(ids:string[])=>void;onLoadDemo:()=>void}) {
 const [sources,setSources]=useState<Source[]>([]),[capabilities,setCapabilities]=useState<Capability[]>([]),[channel,setChannel]=useState("全部"),[query,setQuery]=useState(""),[expanded,setExpanded]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[apifyReady,setApifyReady]=useState(false);
 useEffect(()=>{let live=true;(async()=>{if(!organizationId){setLoading(false);return;}const [s,p,provider]=await Promise.all([supabase.from("intelligence_data_sources").select("*").eq("is_active",true).order("sort_order"),supabase.from("intelligence_source_capabilities").select("*"),supabase.from("platform_provider_connections").select("provider_key,is_enabled,status").eq("organization_id",organizationId)]);if(!live)return;if(s.error||p.error||provider.error){setError("数据源目录或连接状态暂不可用，请检查设置中心。");setLoading(false);return;}setSources((s.data||[]) as Source[]);setCapabilities((p.data||[]) as Capability[]);const apify=(provider.data||[]).find((row:any)=>row.provider_key==="apify");setApifyReady(Boolean(apify?.is_enabled&&apify.status==="verified"));setLoading(false);})();return()=>{live=false;};},[organizationId]);
 const canCollectSource=(slug:string)=>collectableSourceSlugs.has(slug)&&(slug==="google-news"||apifyReady);
 const recommended=sources.filter(s=>defaultSourceSlugs.includes(s.slug)&&canCollectSource(s.slug)).sort((a,b)=>defaultSourceSlugs.indexOf(a.slug)-defaultSourceSlugs.indexOf(b.slug));
 const visible=sources.filter(s=>{const searchable=[s.name,...capabilities.filter(cap=>cap.source_id===s.id).map(cap=>cap.label)].join(" ").toLowerCase();return (channel==="全部"||s.channel===channel)&&searchable.includes(query.toLowerCase());});
 const list=expanded?visible:recommended,selected=selectedSourceIds.length;
 const toggle=(id:string,checked:boolean)=>onChange(checked?[...selectedSourceIds,id]:selectedSourceIds.filter(x=>x!==id));
 const renderCard=(source:Source)=>{const supported=collectableSourceSlugs.has(source.slug),canCollect=canCollectSource(source.slug),status=canCollect?"ready":supported?"needs_auth":"planned";return <label className={selectedSourceIds.includes(source.id)?"gi-source-card selected":canCollect?"gi-source-card":"gi-source-card unavailable"} key={source.id}>
  <input className="gi-source-native-check" type="checkbox" checked={selectedSourceIds.includes(source.id)} disabled={!canCollect} onChange={e=>toggle(source.id,e.target.checked)} aria-label={"选择"+source.name+(canCollect?"":"（暂不可采集）")}/>
  <img src={source.logo_url} alt="" onError={e=>{e.currentTarget.style.display="none";const fallback=e.currentTarget.nextElementSibling as HTMLElement|null;if(fallback)fallback.style.display="grid";}}/>
  <span className="gi-logo-fallback">{source.name.slice(0,2).toUpperCase()}</span>
  <span className="gi-source-name"><strong>{source.name}</strong><small>{capabilities.filter(cap=>cap.source_id===source.id).slice(0,2).map(cap=>cap.label).join(" · ")||source.channel}</small></span>
  <span className={"gi-status "+(statusTone[status]||"planned")}>{statusLabel[status]||"待接入"}</span>
 </label>;};
 return <section className="gi-source-section" id="intelligence-data-sources">
  <div className="gi-section-head"><div><span className="eyebrow">03 / DATA SOURCES</span><h2>数据渠道与平台</h2><p>选择本次分析的数据来源</p></div><span className="gi-count-pill">{selected} 个已选</span></div>
  <div className="gi-source-actions"><div className="gi-source-actions-left"><button type="button" className="gi-quiet-button" onClick={()=>onChange(recommended.map(s=>s.id))} disabled={!recommended.length}>推荐组合</button><button type="button" className="gi-quiet-button" onClick={()=>{onChange(recommended.map(s=>s.id));onLoadDemo();}} disabled={!recommended.length}>载入示例配置</button></div><button type="button" className="gi-expand-button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>{expanded?"收起平台":"更多平台"} <span>{expanded?"−":"＋"}</span></button></div>
  {loading?<div className="gi-loading">正在读取平台目录…</div>:error?<div className="gi-warning">{error}</div>:<>
   {expanded&&<div className="gi-source-toolbar"><div className="gi-channel-filter">{["全部","电商平台","搜索引擎","社交媒体","视频平台","社区论坛","新闻媒体","行业媒体","行业数据"].map(x=><button key={x} type="button" className={channel===x?"active":""} onClick={()=>setChannel(x)}>{x}</button>)}</div><Search size="lg" labelText="搜索平台或能力" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索平台或能力"/><button type="button" className="gi-quiet-button" onClick={()=>onChange(sources.filter(s=>canCollectSource(s.slug)).map(s=>s.id))} disabled={!sources.some(s=>canCollectSource(s.slug))}>全选</button><button type="button" className="gi-quiet-button" onClick={()=>onChange([])}>清空</button></div>}
   <div className="gi-source-grid">{list.map(renderCard)}{expanded&&!list.length&&<div className="gi-source-empty">没有匹配的平台</div>}</div>
  </>}
  <div className="gi-source-note">{apifyReady?"已验证的 Apify 可执行电商与社媒平台；Google News RSS 无需 Apify。":"Google News RSS 无需 Apify；其它已接入的电商与社媒来源需要先在设置中心验证 Apify。"} 电商采集会按所选且受支持的市场站点分别启动任务；第三方 Actor 可能产生费用。</div>
 </section>;
}
export function IntelligenceTabContent({data,activeTab,analyzed,loading}:{data:DemoData|null;activeTab:string;analyzed:boolean;loading:boolean}) {
 if(!analyzed)return <div className="results-empty"><div className="results-empty-icon">⌁</div><strong>等待配置分析条件</strong><p>完成分析对象、目标市场和数据渠道配置，然后点击「开始分析」。</p></div>;
 if(loading)return <div className="gi-loading">正在加载情报数据集…</div>;
 if(!data)return <div className="gi-warning">暂无演示数据。请检查演示数据集是否已写入当前企业。</div>;
 const d=data;
 return <div className="gi-dashboard"><div className="gi-demo-banner"><span>DEMO DATA</span>{d.demo_notice}</div>
 {activeTab==="overview"&&<><div className="gi-kpi-grid">{d.kpis.map(k=><div className="gi-kpi" key={k.label}><span>{k.label}</span><strong>{k.value}</strong><small className="positive">{k.delta} <em>{k.unit}</em></small></div>)}</div><div className="gi-chart-grid"><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>跨渠道热度变化</h4><p>近六个月相对指数 · 模拟数据</p></div><span>趋势对比</span></div><LineChart data={d.trend}/></article><article className="gi-chart-card"><div className="gi-card-head"><div><h4>社交平台声量结构</h4><p>互动样本占比</p></div></div><DonutChart items={d.social.map(x=>({label:x.platform,value:x.share}))}/></article><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>国家市场机会分布</h4><p>机会指数综合示意，不代表市场规模</p></div></div><MarketMap markets={d.markets}/></article></div></>}
 {activeTab==="bestsellers"&&<div className="gi-chart-grid"><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>全球热销商品样本榜</h4><p>平台热度综合分 · 并非真实销量排名</p></div></div><TableContainer className="gi-table-wrap" title="全球热销商品样本榜"><Table size="sm" useZebraStyles><TableHead><TableRow><TableHeader>排名</TableHeader><TableHeader>商品</TableHeader><TableHeader>品牌</TableHeader><TableHeader>价格</TableHeader><TableHeader>热度指数</TableHeader><TableHeader>评论样本</TableHeader></TableRow></TableHead><TableBody>{d.bestsellers.map(x=><TableRow key={x.rank}><TableCell>#{x.rank}</TableCell><TableCell><strong>{x.name}</strong></TableCell><TableCell>{x.brand}</TableCell><TableCell>${x.price.toFixed(2)}</TableCell><TableCell><div className="gi-score"><i style={{width:x.score+"%"}}/><b>{x.score}</b></div></TableCell><TableCell>{x.review_count.toLocaleString()}</TableCell></TableRow>)}</TableBody></Table></TableContainer></article></div>}
 {activeTab==="search"&&<div className="gi-chart-grid"><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>搜索兴趣趋势</h4><p>0–100 相对指数，不是绝对搜索量</p></div></div><LineChart data={d.trend}/></article><article className="gi-chart-card"><div className="gi-card-head"><div><h4>增长查询</h4><p>示例关键词增长率</p></div></div><div className="gi-term-list">{d.search_terms.map(x=><div key={x.term}><span>{x.term}</span><b>{x.growth}</b><i style={{width:x.index+"%"}}/></div>)}</div></article></div>}
 {activeTab==="social"&&<div className="gi-chart-grid"><article className="gi-chart-card"><div className="gi-card-head"><div><h4>平台互动指数</h4><p>跨平台相对互动</p></div></div><BarChart items={d.social.map(x=>({label:x.platform,value:x.engagement}))}/></article><article className="gi-chart-card"><div className="gi-card-head"><div><h4>社交声量占比</h4><p>演示样本</p></div></div><DonutChart items={d.social.map(x=>({label:x.platform,value:x.share}))}/></article></div>}
 {activeTab==="consumer"&&<div className="gi-chart-grid"><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>消费者高频痛点</h4><p>评论与社区主题聚类样本</p></div></div><BarChart items={d.pain_points.map(x=>({label:x.label,value:x.count}))}/></article></div>}
 {activeTab==="competitors"&&<div className="gi-chart-grid"><article className="gi-chart-card"><div className="gi-card-head"><div><h4>竞品关注度份额</h4><p>模拟样本结构</p></div></div><DonutChart items={d.competitors.map(x=>({label:x.name,value:x.share}))}/></article><article className="gi-chart-card"><div className="gi-card-head"><div><h4>竞品价格定位</h4><p>USD 标价示例</p></div></div><BarChart items={d.competitors.map(x=>({label:x.name,value:x.price}))}/></article></div>}
 {activeTab==="categories"&&<div className="gi-chart-grid"><article className="gi-chart-card"><div className="gi-card-head"><div><h4>细分品类结构</h4><p>样本占比</p></div></div><DonutChart items={d.categories}/></article><article className="gi-chart-card"><div className="gi-card-head"><div><h4>细分市场占比</h4><p>演示数据</p></div></div><BarChart items={d.categories}/></article></div>}
 {activeTab==="markets"&&<div className="gi-chart-grid"><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>国家/地区排行</h4><p>演示数据，仅用于界面预览；地图与排行共用同一组相对兴趣值。</p></div></div><div className="gi-gt-region-layout"><GoogleTrendsRegionMap regions={d.markets.map(m=>({name:m.name,label:m.name,code:m.code,value:m.search}))} geo="" keyword="演示数据"/><div className="gi-gt-region-ranking"><h5>国家/地区排行</h5><div className="gi-market-rank">{d.markets.slice().sort((a,b)=>b.search-a.search).map(m=><div key={m.code}><span>{m.flag} {m.name}</span><div><i style={{width:m.search+"%"}}/></div><b>{m.search}</b></div>)}</div></div></div></article></div>}
 </div>;
}

export function AIAnalysisPanel({accessToken,context,activeTab,taskId,organizationId,evidenceCount=0}:{accessToken:string;context:string;activeTab:string;taskId:string|null;organizationId:string|null;evidenceCount?:number}) {
 const [provider,setProvider]=useState("cloudflare-workers-ai"),[model,setModel]=useState("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),[mode,setMode]=useState("all"),[singleTab,setSingleTab]=useState(activeTab),[customTabs,setCustomTabs]=useState(["bestsellers","search","consumer"]),[question,setQuestion]=useState(""),[answer,setAnswer]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[reportMeta,setReportMeta]=useState<any|null>(null);
 const tabOptions=[["overview","情报总览"],["bestsellers","全球热销榜"],["search","搜索趋势"],["social","社交媒体趋势"],["consumer","消费者洞察"],["competitors","品牌与竞品"],["categories","品类分析"],["markets","国家市场"]];
 useEffect(()=>{setSingleTab(activeTab);},[activeTab]);
 useEffect(()=>{setAnswer("");setError("");setReportMeta(null);},[taskId]);
 const run=async()=>{if(!taskId||!organizationId){setError("请先完成一次真实市场采集，再生成 AI 报告。");return;}if(provider!=="cloudflare-workers-ai"){setError("当前 AI 服务尚未配置，请选择已接入的服务。");return;}if(mode==="custom"&&!customTabs.length){setError("请至少选择一个情报维度。");return;}setBusy(true);setError("");try{const response=await fetch("/api/intelligence-ai",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+accessToken},body:JSON.stringify({organization_id:organizationId,task_id:taskId,provider,model,mode,tab:singleTab,tabs:customTabs,question,context})});const payload=await response.json();if(!response.ok)throw new Error(payload.error||"AI 分析暂不可用");setAnswer(payload.answer||"AI 未返回可展示内容。");setReportMeta(payload);}catch(e){setError(e instanceof Error?e.message:"AI 分析失败，请稍后重试。");}finally{setBusy(false);}};
 const sample="完成一次真实采集后，AI 将基于本次任务的来源证据、市场信号和原始链接生成分析报告。";
 const modelOptions=[
  {value:"@cf/meta/llama-3.3-70b-instruct-fp8-fast",label:"Meta Llama 3.3 70B · 推荐",description:"均衡的综合分析能力，当前默认模型"},
  {value:"@cf/meta/llama-4-scout-17b-16e-instruct",label:"Meta Llama 4 Scout 17B",description:"新一代多模态模型，适合复杂语义理解"},
  {value:"@cf/openai/gpt-oss-120b",label:"OpenAI GPT-OSS 120B",description:"高能力开源推理模型"},
  {value:"@cf/openai/gpt-oss-20b",label:"OpenAI GPT-OSS 20B",description:"响应更轻量的通用模型"},
  {value:"@cf/moonshotai/kimi-k2.6",label:"Moonshot Kimi K2.6",description:"长上下文与复杂推理"},
  {value:"@cf/zai-org/glm-5.3",label:"Z.ai GLM 5.3",description:"面向复杂任务的推理模型"}
 ];
 const selectedModel=modelOptions.find(item=>item.value===model)||modelOptions[0];
 return <section className="gi-ai-section" id="ai-intelligence-analysis">
  <div className="gi-section-head"><div><span className="eyebrow">05 / AI INTELLIGENCE</span><h2>AI 分析与商业洞察</h2><p>AI 只读取本次任务已保存的真实采集证据；不再把演示数据作为市场事实。</p></div><span className="gi-ai-model">Cloudflare Workers AI · {selectedModel.label}</span></div>
  <div className="gi-ai-layout"><div className="gi-ai-controls">
   <section className="gi-ai-step">
    <div className="gi-ai-step-head"><span className="gi-ai-step-index">01</span><div><strong>选择 AI 服务与模型</strong><small>选择本次分析使用的推理服务和模型。</small></div></div>
    <div className="gi-ai-model-grid">
     <label className="gi-ai-field">AI 服务<CarbonSelect value={provider} onChange={v=>{setProvider(v);setAnswer("");}}><option value="cloudflare-workers-ai">Cloudflare Workers AI · 已接入</option><option value="openai" disabled>OpenAI API · 待配置密钥</option><option value="anthropic" disabled>Anthropic API · 待配置密钥</option><option value="google" disabled>Google Gemini API · 待配置密钥</option></CarbonSelect></label>
     <label className="gi-ai-field">选择模型<CarbonSelect value={model} onChange={v=>{setModel(v);setAnswer("");}}>{modelOptions.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</CarbonSelect></label>
    </div>
    <small className="gi-ai-provider-hint">{selectedModel.description}。其他直连服务商尚未配置 API Key，暂不可选；模型通过 Cloudflare Workers AI 执行。</small>
   </section>
   <section className="gi-ai-step">
    <div className="gi-ai-step-head"><span className="gi-ai-step-index">02</span><div><strong>选择分析范围</strong><small>单选一种分析方式，切换时保留已填写的研究条件。</small></div></div>
    <div className="gi-ai-tabs"><Tabs selectedIndex={Math.max(0,["all","single","custom"].indexOf(mode))} onChange={({selectedIndex})=>setMode(["all","single","custom"][selectedIndex]||"all")}>
     <TabList aria-label="AI 分析范围"><Tab>全部结果</Tab><Tab>单个 Tab</Tab><Tab>组合分析</Tab></TabList>
     <TabPanels>
      <TabPanel><div className="gi-ai-tab-description">综合分析全部 8 个情报维度，生成市场概况、机会判断、竞争态势与行动建议。</div></TabPanel>
      <TabPanel><label className="gi-ai-field">选择分析板块<CarbonSelect value={singleTab} onChange={setSingleTab}>{tabOptions.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</CarbonSelect></label></TabPanel>
      <TabPanel><div className="gi-ai-field"><strong>选择参与分析的情报维度</strong><div className="gi-ai-checks">{tabOptions.map(x=><label key={x[0]}><Checkbox id={"ai-tab-"+x[0]} labelText={x[1]} checked={customTabs.includes(x[0])} onChange={(_event: React.ChangeEvent<HTMLInputElement>, data: {checked:boolean})=>setCustomTabs(v=>data.checked?[...v,x[0]]:v.filter(k=>k!==x[0]))}/>{x[1]}</label>)}</div><small>已选择 {customTabs.length} / 8 个维度</small></div></TabPanel>
     </TabPanels>
    </Tabs></div>
   </section>
   <section className="gi-ai-step">
    <div className="gi-ai-step-head"><span className="gi-ai-step-index">03</span><div><strong>补充研究问题</strong><small>可选，描述希望 AI 重点回答的商业问题。</small></div></div>
    <div className="gi-ai-field"><TextArea id="gi-ai-question" labelText="研究问题" rows={3} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="例如：哪个国家值得优先进入？产品应该如何差异化？"/></div>
   </section>
   <Button kind="primary" className="gi-ai-run" type="button" onClick={run} disabled={busy||!accessToken||!model||!taskId||evidenceCount===0}>{busy?"AI 正在分析…":"开始 AI 分析"}</Button>
   <small className="gi-ai-run-note">{taskId?"本次任务已保存 "+evidenceCount+" 条真实证据。":"请先完成真实数据采集。"} 调用 Cloudflare Workers AI 会产生模型用量。</small>
  </div>
  <div className="gi-ai-result"><div className="gi-ai-result-head"><div><span className="eyebrow">AI INTERPRETATION</span><h3>{answer?"AI 分析报告":"等待真实证据"}</h3></div><span className="gi-demo-tag">{answer?"模型生成":taskId?"可生成报告":"等待采集"}</span></div>{error&&<div className="gi-warning">{error}</div>}<div className="gi-ai-answer"><MarkdownReport content={answer||sample}/></div><div className="gi-ai-evidence"><strong>证据说明</strong><p>{reportMeta?"本次分析使用 "+reportMeta.evidence_count+" 条证据，来源："+(reportMeta.source_slugs||[]).join("、")+"。观察数据与 AI 推断分开呈现。":"电商排名不是销量，Google Trends 指数不是绝对搜索量，社交互动不等于购买转化。AI 结论必须回溯到来源证据。"}</p><span>本次模型：{selectedModel.label} · Cloudflare Workers AI</span><span>分析上下文：{context||"当前情报任务"}</span>{reportMeta?.report_id&&<span>报告已保存，可在该任务历史中追溯。</span>}</div></div></div>
 </section>;
}

function TrendLineChart({series,keyword}:{series:any[];keyword:string}) {
 const points=series.map((row:any,i:number)=>{const raw=row?.[keyword]??row?.value??row?.interest??row?.interestValue??row?.values?.[0]?.value??0;const value=Number(raw);const date=row?.date??row?.formattedTime??row?.time??(row?.timestamp?new Date(Number(row.timestamp)*1000).toISOString().slice(0,10):String(i+1));return{date:String(date),value:Number.isFinite(value)?Math.max(0,Math.min(100,value)):0};}).filter((p:any)=>p.date);
 if(!points.length)return <div className="gi-empty-state">Actor 未返回可绘制的时间序列。请展开原始数据检查返回字段。</div>;
 const w=760,h=280,left=48,right=18,top=18,bottom=48,max=100;
 const x=(i:number)=>left+(i/Math.max(1,points.length-1))*(w-left-right),y=(v:number)=>top+(1-v/max)*(h-top-bottom);
 const path=points.map((p:any,i:number)=>(i?"L":"M")+x(i)+","+y(p.value)).join(" ");
 const labels=points.filter((_:any,i:number)=>i===0||i===points.length-1||i%Math.max(1,Math.ceil(points.length/5))===0);
 return <div className="gi-trend-chart"><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={keyword+" 搜索兴趣时间序列折线图"} preserveAspectRatio="xMidYMid meet">
 {[0,25,50,75,100].map(v=><g key={v}><line x1={left} x2={w-right} y1={y(v)} y2={y(v)} className="gi-gridline"/><text x={left-10} y={y(v)+4} textAnchor="end" className="gi-axis-label">{v}</text></g>)}
 <path d={path} className="gi-line gi-line-search"/>{points.map((p:any,i:number)=><circle key={i} cx={x(i)} cy={y(p.value)} r={points.length>90?1.8:3} className="gi-dot-search"><title>{p.date} · {p.value}</title></circle>)}
 {labels.map((p:any)=><text key={p.date} x={x(points.indexOf(p))} y={h-12} textAnchor="middle" className="gi-axis-label">{p.date.slice(0,10)}</text>)}
 </svg><div className="gi-chart-footnote">Google Trends 相对兴趣指数 · 0–100</div></div>;
}
function RankedEvidence({items}:{items:any[]}) {
 const rows=items.slice(0,20).map((item:any)=>({label:String(item.label??item.query??item.topic??item.title??item.keyword??item.value??"未命名"),value:Number(item.value??item.extracted_value??item.score??0),growth:item.formattedValue??item.growth??item.formatted_value??""}));
 const max=Math.max(1,...rows.map(x=>x.value));
 if(!rows.length)return <div className="gi-empty-state">当前 Actor 结果没有返回此类数据。</div>;
 return <div className="gi-evidence-list">{rows.map((row:any,i:number)=><div className="gi-evidence-row" key={i}><span className="gi-evidence-rank">{i+1}</span><div className="gi-evidence-main"><strong title={row.label}>{row.label}</strong><div className="gi-evidence-track"><i style={{width:Math.max(0,Math.min(100,row.value/max*100))+"%"}}/></div></div><b>{row.growth|| (row.value||"—")}</b></div>)}</div>;
}
export function HistoryTasksAccordion({history,onSelectHistory}:{history:any[];onSelectHistory:(row:any)=>void}) {
 const [open,setOpen]=useState(false);
 if(!history.length)return null;
 return <section className="gi-history-accordion">
  <Accordion align="start" size="md">
   <AccordionItem title={`读取历史任务 · ${history.length}`} open={open} onHeadingClick={()=>setOpen(value=>!value)}>
    <p className="gi-history-description">选择一条历史记录，恢复当时的分析配置与已保存结果；不会重新执行采集。</p>
    <TableContainer className="gi-history-table-wrap" title="历史采集任务"><Table size="sm" useZebraStyles><TableHead><TableRow><TableHeader>分析任务</TableHeader><TableHeader>分析对象 / 关键词</TableHeader><TableHeader>目标市场</TableHeader><TableHeader>采集时间</TableHeader><TableHeader>状态</TableHeader><TableHeader>结果</TableHeader><TableHeader>操作</TableHeader></TableRow></TableHead><TableBody>{history.map((item:any)=>{const input=item.input_snapshot||{};const terms=Array.isArray(input.keywords)?input.keywords.join("、"):input.keywords||"";const target=Array.isArray(input.markets)&&input.markets.length?input.markets.join("、"):input.geo||"全球";return <TableRow key={item.id}><TableCell><strong>{item.title||"Google Trends 采集"}</strong></TableCell><TableCell>{input.product_name||terms||"关键词分析"}</TableCell><TableCell>{target}</TableCell><TableCell>{item.created_at?new Date(item.created_at).toLocaleString():"—"}</TableCell><TableCell><Tag type={item.status==="succeeded"?"green":item.status==="failed"?"red":"gray"}>{item.status}</Tag></TableCell><TableCell>{item.result_count??0}</TableCell><TableCell><Button kind="ghost" size="sm" type="button" onClick={()=>onSelectHistory(item)}>读取</Button></TableCell></TableRow>;})}</TableBody></Table></TableContainer>
   </AccordionItem>
  </Accordion>
 </section>;
}
function loadLeafletForTrends():Promise<any>{
 const w=window as any;if(w.L)return Promise.resolve(w.L);
 return new Promise((resolve,reject)=>{const existing=document.querySelector<HTMLScriptElement>('script[data-trends-leaflet="true"]');if(existing){existing.addEventListener("load",()=>resolve((window as any).L),{once:true});existing.addEventListener("error",()=>reject(new Error("地图加载失败")),{once:true});return;}
 const css=document.createElement("link");css.rel="stylesheet";css.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";document.head.appendChild(css);
 const script=document.createElement("script");script.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";script.async=true;script.dataset.trendsLeaflet="true";script.onload=()=>resolve((window as any).L);script.onerror=()=>reject(new Error("Leaflet 地图组件加载失败"));document.head.appendChild(script);});
}
function GoogleTrendsRegionMap({regions,geo,keyword}:{regions:any[];geo:string;keyword:string}){
 const host=useRef<HTMLDivElement>(null);const [mapError,setMapError]=useState("");const [retry,setRetry]=useState(0);
 const rows=regions.map((x:any)=>({name:String(x.name??x.label??x.region??x.geoCode??x.geo_code??"未知地区"),code:String(x.code??x.geoCode??x.geo_code??""),value:Math.max(0,Math.min(100,Number(x.value??x.interest??x.interestValue??0)||0))})).filter((x:any)=>x.name!=="未知地区");
 const global=!geo||geo.toUpperCase()==="WORLDWIDE"||geo==="0";
 useEffect(()=>{let cancelled=false;let map:any=null;(async()=>{try{const L=await loadLeafletForTrends();if(cancelled||!host.current)return;map=L.map(host.current,{scrollWheelZoom:false,worldCopyJump:true}).setView(global?[20,0]:[25,0],global?1.4:3);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:9,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
 const palette=["#edf5ff","#d0e2ff","#a6c8ff","#78a9ff","#4589ff","#0f62fe","#0043ce"];
 const color=(v:number)=>palette[Math.min(palette.length-1,Math.floor(Math.max(0,Math.min(100,v))/100*palette.length))];
 let geojson:any=null;
 if(global){const r=await fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson");if(!r.ok)throw new Error("国家边界数据加载失败");geojson=await r.json();}
 else{
  const boundaryResponse=await fetch("/api/region-boundaries?geo="+encodeURIComponent(geo));
  const boundaryText=await boundaryResponse.text();let boundaryPayload:any=null;try{boundaryPayload=JSON.parse(boundaryText);}catch{throw new Error("省／州边界服务返回了非 JSON 响应（HTTP "+boundaryResponse.status+"），请稍后重试。");}
  if(!boundaryResponse.ok)throw new Error([boundaryPayload?.error,boundaryPayload?.detail].filter(Boolean).join("：")||("省／州边界数据加载失败（HTTP "+boundaryResponse.status+"）"));
  if(boundaryPayload?.type!=="FeatureCollection"||!Array.isArray(boundaryPayload.features))throw new Error(boundaryPayload?.error||"省／州边界数据格式无效。");
  geojson=boundaryPayload;
 }
 if(cancelled)return;
 const normalize=(v:string)=>v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
 const lookup=new Map<string,number>();rows.forEach((r:any)=>{if(r.code)lookup.set(normalize(r.code),r.value);lookup.set(normalize(r.name),r.value);});
 const features=(geojson.features||[]).map((feature:any)=>{const p=feature.properties||{};const code=global?(p["ISO3166-1-Alpha-2"]||p.ISO_A2||p.iso_a2):(p.shapeISO||p.shapeISO3||p.shapeID||"");const name=p.ADMIN||p.shapeName||p.name||p.NAME_1||code;let value=lookup.get(normalize(String(code)));if(value===undefined)value=lookup.get(normalize(String(name)));if(value===undefined&&!global){const featureSuffix=normalize(String(code)).split("-").pop();const suffix=rows.find((r:any)=>normalize(r.name)===normalize(String(name))||normalize(r.name).includes(normalize(String(name)))||normalize(String(name)).includes(normalize(r.name))||(featureSuffix&&normalize(r.code).split("-").pop()===featureSuffix));if(suffix)value=suffix.value;}return{...feature,properties:{...p,__trendName:name,__trendCode:code,__trendValue:value??null}};});
 L.geoJSON({type:"FeatureCollection",features},{style:(feature:any)=>{const value=feature.properties.__trendValue;return{color:"#ffffff",weight:0.8,fillColor:value===null?"#d8d8d8":color(value),fillOpacity:value===null?0.45:0.88};},onEachFeature:(feature:any,shape:any)=>{const p=feature.properties||{};const label=p.__trendValue===null?"暂无足够数据":("搜索兴趣指数："+p.__trendValue);shape.bindTooltip("<strong>"+String(p.__trendName)+"</strong><br/>"+label,{sticky:true});}}).addTo(map);
 const matchedFeatures=features.filter((feature:any)=>feature.properties.__trendValue!==null);const focusFeatures=!global&&matchedFeatures.length>=Math.max(3,Math.floor(features.length*0.35))?matchedFeatures:features;const focusLayer=L.geoJSON({type:"FeatureCollection",features:focusFeatures});const focusBounds=focusLayer.getBounds();window.setTimeout(()=>{map.invalidateSize();if(focusBounds.isValid())map.fitBounds(focusBounds,{padding:global?[8,8]:[18,18],maxZoom:global?4:5});},160);
 }catch(e){if(!cancelled)setMapError(e instanceof Error?(e.message==="Failed to fetch"?"省／州边界请求失败：地图服务或网络暂不可达，请重试。":e.message):"地区地图加载失败");}})();
 return()=>{cancelled=true;if(map){map.remove();map=null;}};},[geo,global,keyword,retry,rows.map((x:any)=>x.code+":"+x.value+":"+x.name).join("|")]);
 return <div className="gi-gt-map-shell"><div ref={host} className="gi-gt-map" role="img" aria-label={global?"Google Trends 国家搜索兴趣地图":keyword+" 省州搜索兴趣地图"}/>{mapError&&<div className="gi-map-error">{mapError}<button type="button" className="gi-map-retry" onClick={()=>{setMapError("");setRetry(x=>x+1);}}>重试加载</button></div>}<div className="gi-gt-map-legend"><span>低</span>{["#edf5ff","#d0e2ff","#a6c8ff","#78a9ff","#4589ff","#0f62fe","#0043ce"].map((c,i)=><i key={i} style={{background:c}}/>)}<span>高</span><small>相对兴趣指数 0–100 · 灰色表示无足够数据 · 边界：geoBoundaries</small></div></div>;
}
function LiveGoogleTrends({results,meta,loading,activeTab}:{results:any[];meta:any|null;loading:boolean;activeTab:string}) {
 const [selected,setSelected]=useState(0);const result=results[selected]||results[0]||null;
 useEffect(()=>setSelected(0),[results]);
 const series=Array.isArray(result?.interest_over_time)?result.interest_over_time:[];
 const regions=Array.isArray(result?.interest_by_region)?result.interest_by_region:[];
 const related=result?.related_queries||{},topics=result?.related_topics||{};
 const relatedItems=Array.isArray(related.rising)?related.rising:Array.isArray(related.top)?related.top:[];
 const topicItems=Array.isArray(topics.rising)?topics.rising:Array.isArray(topics.top)?topics.top:[];
 const regionRows=regions.map((x:any)=>({name:String(x.region??x.name??x.geoCode??x.geo_code??"未知地区"),label:String(x.region??x.name??x.geoCode??x.geo_code??"未知地区"),code:String(x.geoCode??x.geo_code??""),value:Math.max(0,Math.min(100,Number(x.value??x.interest??x.interestValue??0)||0))})).filter((x:any)=>x.name!=="未知地区").sort((a:any,b:any)=>b.value-a.value);
 const requestedGeo=result?.geo&&String(result.geo).toUpperCase()!=="WORLDWIDE"&&String(result.geo)!=="0"?String(result.geo):(meta?.markets?.length===1?String(meta.markets[0]):"");const mapGeo=requestedGeo==="CN-MAINLAND"?"CN":requestedGeo;
 return <section className="gi-live-results">
  <div className="gi-live-status"><span className={"gi-status "+(loading?"limited":meta?.status==="failed"?"error":"ready")}>{loading?"正在采集…":meta?.status==="failed"?"采集失败":meta?.history?"历史数据":meta?"真实数据":"等待采集"}</span></div>
  {loading&&<div className="gi-warning">正在调用 Google Trends Actor，完成后自动保存任务与原始结果。</div>}
  
  {results.length>1&&<div className="gi-filter-row"><label>关键词结果<CarbonSelect value={String(selected)} onChange={value=>setSelected(Number(value))} ariaLabel="关键词结果">{results.map((x:any,i:number)=><option key={i} value={String(i)}>{x.keyword||"关键词 "+(i+1)}</option>)}</CarbonSelect></label></div>}
  {result&&<div className="gi-chart-grid">
   {activeTab==="overview"&&<><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>搜索兴趣概览 · {result.keyword}</h4><p>当前关键词的真实时间序列</p></div></div><TrendLineChart series={series} keyword={result.keyword}/></article><article className="gi-chart-card"><div className="gi-card-head"><div><h4>重点国家 / 地区</h4><p>按 Google Trends 相对兴趣排序</p></div></div><RankedEvidence items={regionRows}/></article><article className="gi-chart-card"><div className="gi-card-head"><div><h4>上升相关查询</h4><p>消费者关联搜索线索</p></div></div><RankedEvidence items={relatedItems}/></article></>}
   {activeTab==="search"&&<><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>搜索兴趣时间序列</h4><p>{result.keyword} · {result.geo||"全球"} · {result.time_range}</p></div></div><TrendLineChart series={series} keyword={result.keyword}/></article><article className="gi-chart-card"><div className="gi-card-head"><div><h4>相关搜索查询</h4><p>Top / Rising 查询</p></div></div><RankedEvidence items={related.top?.length?related.top:relatedItems}/></article><article className="gi-chart-card"><div className="gi-card-head"><div><h4>相关主题</h4><p>与关键词共同出现的主题</p></div></div><RankedEvidence items={topics.top?.length?topics.top:topicItems}/></article></>}
   {activeTab==="markets"&&<><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>{mapGeo?"省／州搜索兴趣分布":"全球国家搜索兴趣分布"}</h4><p>{mapGeo?"按所选国家的次级行政区展示":"按国家展示全球搜索兴趣"} · 颜色越深代表相对兴趣越高</p></div></div><div className="gi-gt-region-layout"><GoogleTrendsRegionMap regions={regionRows} geo={mapGeo} keyword={result.keyword||""}/><div className="gi-gt-region-ranking"><h5>{mapGeo?"省／州相对兴趣排行":"国家相对兴趣排行"}</h5><RankedEvidence items={regionRows}/></div></div></article></>}
   {activeTab==="consumer"&&<><article className="gi-chart-card"><div className="gi-card-head"><div><h4>消费者关注主题</h4><p>由相关主题提取，属于需求线索而非已验证购买需求</p></div></div><RankedEvidence items={topicItems}/></article><article className="gi-chart-card"><div className="gi-card-head"><div><h4>消费者相关搜索</h4><p>用于识别场景、功能和问题线索</p></div></div><RankedEvidence items={relatedItems}/></article></>}
   {activeTab==="categories"&&<article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>品类相关搜索线索</h4><p>从相关查询和主题中识别相邻需求</p></div></div><RankedEvidence items={[...topicItems,...relatedItems]}/></article>}
   {activeTab==="bestsellers"&&<div className="gi-warning">Google Trends 不提供真实电商销量或热销排名。请接入 Amazon、eBay 等电商数据源后再展示真实热销榜。</div>}
   {activeTab==="social"&&<div className="gi-warning">Google Trends 不包含社交媒体互动数据。社媒趋势需接入 TikTok、YouTube、Reddit 等数据源。</div>}
   {activeTab==="competitors"&&<div className="gi-warning">当前 Google Trends 结果不足以验证品牌份额或竞品销量。可将竞品关键词分别加入分析后进行搜索关注度比较。</div>}

  </div>}
  {!result&&!loading&&<div className="gi-warning">{meta?.status==="failed"?meta.error:"尚无真实采集结果。请配置关键词、市场和时间范围后开始分析。"}</div>}
  {meta?.error&&<div className="gi-warning">{meta.error}</div>}
  {result&&<details className="gi-raw-evidence"><summary>查看 Actor 原始返回数据（完整 JSON）</summary><pre>{JSON.stringify(result,null,2)}</pre></details>}
 </section>;
}

function LiveMarketIntelligence({evidence,activeTab,loading}:{evidence:any[];activeTab:string;loading:boolean}) {
 const products=evidence.filter(row=>row.evidence_kind==="product_listing");
 const social=evidence.filter(row=>row.evidence_kind==="social_post");
 const trends=evidence.filter(row=>row.evidence_kind==="search_trend");
 const reviews=evidence.filter(row=>row.evidence_kind==="review");
 const countBy=(rows:any[],key:string)=>rows.reduce((map:Record<string,number>,row:any)=>{const value=String(row[key]||"未知");map[value]=(map[value]||0)+1;return map;},{});
 const metric=(row:any,key:string)=>row.metrics?.[key]??row.raw_payload?.[key]??"—";
 const empty=(message:string)=><div className="gi-empty-state">{message}</div>;
 if(loading)return <div className="gi-loading">正在汇总多渠道采集结果…</div>;
 if(activeTab==="overview")return <section className="gi-live-evidence">
  <div className="gi-kpi-grid"><div className="gi-kpi"><span>证据记录</span><strong>{evidence.length.toLocaleString()}</strong><small>实际采集记录</small></div><div className="gi-kpi"><span>数据来源</span><strong>{new Set(evidence.map(x=>x.source_slug)).size}</strong><small>成功返回数据的平台</small></div><div className="gi-kpi"><span>商品信号</span><strong>{products.length.toLocaleString()}</strong><small>商品列表 / 排名观察</small></div><div className="gi-kpi"><span>内容信号</span><strong>{social.length.toLocaleString()}</strong><small>帖子、视频与讨论样本</small></div></div>
  <article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>最新市场证据</h4><p>每条记录保留来源平台、采集时间与原始链接</p></div></div>{evidence.length?<div className="gi-live-evidence-list">{evidence.slice(0,20).map((row:any)=><div className="gi-live-evidence-row" key={row.id}><div><strong>{row.title||"未命名记录"}</strong><p>{row.content_text||row.source_slug}</p><small>{row.source_slug} · {row.market_code||"全球"} · {row.collected_at?new Date(row.collected_at).toLocaleString():""}</small></div>{row.source_url&&<a href={row.source_url} target="_blank" rel="noreferrer">查看来源</a>}</div>)}</div>:empty("本次任务尚未返回可展示的真实证据。")}</article>
 </section>;
 if(activeTab==="bestsellers")return <section className="gi-live-evidence"><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>全球商品热销信号</h4><p>按平台返回的排名 / BSR 与商品信号展示；不将排名推算为销量</p></div></div>{products.length?<div className="gi-product-evidence-list">{products.slice().sort((a:any,b:any)=>(a.rank_value??999999)-(b.rank_value??999999)).slice(0,100).map((row:any,i:number)=><div className="gi-product-evidence-row" key={row.id}><span className="gi-evidence-rank">{row.rank_value??i+1}</span><div><strong>{row.title||"未命名商品"}</strong><small>{row.source_slug} · {row.market_code||"市场未标注"} · {row.rating?"评分 "+row.rating:"评分未知"} · {row.review_count??"—"} 条评论</small></div><b>{row.price!=null?(row.currency||"USD")+" "+Number(row.price).toFixed(2):"价格未知"}</b>{row.source_url&&<a href={row.source_url} target="_blank" rel="noreferrer">商品链接</a>}</div>)}</div>:empty("本次没有电商商品证据。请在上方选择 Amazon、Walmart、eBay 或 Mercado Libre 等可用电商来源。")}</article></section>;
 if(activeTab==="search")return <section className="gi-live-evidence">{trends.length>0&&<article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>搜索趋势与需求线索</h4><p>Google Trends 相对兴趣指数（0–100），不是绝对搜索量</p></div></div><div className="gi-live-evidence-list">{trends.map((row:any)=><div className="gi-live-evidence-row" key={row.id}><div><strong>{row.title}</strong><p>{JSON.stringify(row.metrics?.related_queries||{}).slice(0,420)}</p><small>{row.source_slug} · {row.market_code||"全球"} · {row.collected_at?new Date(row.collected_at).toLocaleString():""}</small></div>{row.source_url&&<a href={row.source_url} target="_blank" rel="noreferrer">来源</a>}</div>)}</div></article>}{evidence.some(row=>row.evidence_kind==="article")&&<article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>全球新闻与行业动态</h4><p>公开新闻 RSS 结果，按所选市场和关键词检索</p></div></div><div className="gi-live-evidence-list">{evidence.filter(row=>row.evidence_kind==="article").slice(0,100).map((row:any)=><div className="gi-live-evidence-row" key={row.id}><div><strong>{row.title}</strong><p>{row.content_text}</p><small>{row.metrics?.publisher||row.source_slug} · {row.market_code||"全球"} · {row.metrics?.published_at||row.collected_at}</small></div>{row.source_url&&<a href={row.source_url} target="_blank" rel="noreferrer">阅读报道</a>}</div>)}</div></article>}{!trends.length&&!evidence.some(row=>row.evidence_kind==="article")&&empty("本次没有搜索趋势或新闻证据。")}</section>;
 if(activeTab==="social")return <section className="gi-live-evidence"><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>社交媒体与社区热度</h4><p>帖子、视频、互动和话题信号，不等于购买转化</p></div></div>{social.length?<div className="gi-live-evidence-list">{social.slice(0,100).map((row:any)=><div className="gi-live-evidence-row" key={row.id}><div><strong>{row.title||"内容记录"}</strong><p>{row.content_text||"无文本内容"}</p><small>{row.source_slug} · {row.market_code||"全球"} · {metric(row,"viewCount")} 浏览 · {metric(row,"likeCount")} 赞 · {metric(row,"commentCount")} 评论</small></div>{row.source_url&&<a href={row.source_url} target="_blank" rel="noreferrer">查看内容</a>}</div>)}</div>:empty("本次没有社交媒体或社区内容证据。")}</article></section>;
 if(activeTab==="consumer")return <section className="gi-live-evidence"><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>消费者讨论与反馈样本</h4><p>基于公开内容与评论线索；AI 可进一步归纳痛点，但不会把样本当作总体民意</p></div></div>{social.length||reviews.length?<div className="gi-live-evidence-list">{[...reviews,...social].slice(0,100).map((row:any)=><div className="gi-live-evidence-row" key={row.id}><div><strong>{row.title||row.source_slug}</strong><p>{row.content_text||"无文本内容"}</p><small>{row.source_slug} · {row.market_code||"全球"} · {row.collected_at?new Date(row.collected_at).toLocaleString():""}</small></div>{row.source_url&&<a href={row.source_url} target="_blank" rel="noreferrer">来源</a>}</div>)}</div>:empty("本次没有消费者讨论或评论证据。")}</article></section>;
 if(activeTab==="competitors")return <section className="gi-live-evidence"><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>品牌与竞品动态</h4><p>基于商品品牌字段与公开内容提及，不代表市场份额</p></div></div>{products.length||social.length?<div className="gi-live-evidence-list">{[...products,...social].slice(0,100).map((row:any)=><div className="gi-live-evidence-row" key={row.id}><div><strong>{row.title||row.raw_payload?.brand||row.source_slug}</strong><p>{row.content_text||"商品与品牌观察记录"}</p><small>{row.source_slug} · {row.market_code||"全球"}</small></div>{row.source_url&&<a href={row.source_url} target="_blank" rel="noreferrer">查看来源</a>}</div>)}</div>:empty("本次没有品牌或竞品证据。")}</article></section>;
 if(activeTab==="categories"){const groups=countBy(products.map((row:any)=>({category:row.raw_payload?.category||row.raw_payload?.categoryName||row.raw_payload?.productCategory||"未分类"})),"category");return <section className="gi-live-evidence"><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>商品品类分布</h4><p>按采集结果中的品类字段汇总</p></div></div>{Object.keys(groups).length?<div className="gi-bars">{Object.entries(groups).sort((a,b)=>b[1]-a[1]).map(([label,value])=><div className="gi-bar-row" key={label}><span>{label}</span><div><i style={{width:(value/Math.max(...Object.values(groups))*100)+"%"}}/></div><b>{value}</b></div>)}</div>:empty("本次没有可归类的商品证据。")}</article></section>;}
 const markets=countBy(evidence,"market_code");
 return <section className="gi-live-evidence"><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>国家与地区证据分布</h4><p>按来源实际标注的市场代码汇总，不推断未标注地区</p></div></div>{Object.keys(markets).length?<div className="gi-bars">{Object.entries(markets).sort((a,b)=>b[1]-a[1]).map(([label,value])=><div className="gi-bar-row" key={label}><span>{label}</span><div><i style={{width:(value/Math.max(...Object.values(markets))*100)+"%"}}/></div><b>{value}</b></div>)}</div>:empty("本次采集记录未返回国家 / 地区字段。")}</article></section>;
}

export function IntelligenceDataExperience({organizationId,activeTab,analyzed,accessToken,context,liveMeta=null,collectionLoading=false,taskId=null,evidence=[],evidenceCount=0}:{organizationId:string|null;activeTab:string;analyzed:boolean;accessToken:string;context:string;liveResults?:any[];liveMeta?:any|null;collectionLoading?:boolean;taskId?:string|null;evidence?:any[];evidenceCount?:number}) {
 const hasEvidence=evidence.length>0;
 const trendResults=evidence.filter(row=>row.evidence_kind==="search_trend").map(row=>({...row.raw_payload,keyword:row.raw_payload?.keyword||row.title,interest_over_time:row.raw_payload?.interest_over_time||row.metrics?.interest_over_time||[],interest_by_region:row.raw_payload?.interest_by_region||row.metrics?.interest_by_region||[],related_queries:row.raw_payload?.related_queries||row.metrics?.related_queries||{},related_topics:row.raw_payload?.related_topics||row.metrics?.related_topics||[]}));
 return <>{collectionLoading?<div className="gi-loading">正在采集并标准化多渠道市场证据…</div>:hasEvidence&&trendResults.length&&activeTab==="markets"?<LiveGoogleTrends results={trendResults} meta={liveMeta} loading={false} activeTab={activeTab}/>:hasEvidence?<LiveMarketIntelligence evidence={evidence} activeTab={activeTab} loading={false}/>:analyzed?<div className="gi-warning">本次任务没有返回该维度的真实证据。不会用演示数据替代真实市场结果。</div>:<IntelligenceTabContent data={null} activeTab={activeTab} analyzed={false} loading={false}/>}
 <AIAnalysisPanel accessToken={accessToken} context={context} activeTab={activeTab} taskId={taskId} organizationId={organizationId} evidenceCount={evidenceCount||evidence.length}/>
 </>;
}
