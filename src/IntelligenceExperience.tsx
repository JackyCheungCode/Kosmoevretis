import { useEffect, useRef, useState } from "react";
import { Accordion, AccordionItem, Tabs, TabList, Tab, TabPanels, TabPanel } from "@carbon/react";
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

const statusLabel:Record<string,string>={ready:"已验证",needs_auth:"需授权",limited:"受限",planned:"待接入",error:"异常"};
const statusTone:Record<string,string>={ready:"ready",needs_auth:"auth",limited:"limited",planned:"planned",error:"error"};
const defaultSourceSlugs=["amazon","google-trends","tiktok","youtube","reddit"];

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
 const [sources,setSources]=useState<Source[]>([]),[capabilities,setCapabilities]=useState<Capability[]>([]),[channel,setChannel]=useState("全部"),[query,setQuery]=useState(""),[expanded,setExpanded]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let live=true;(async()=>{const [s,p]=await Promise.all([supabase.from("intelligence_data_sources").select("*").eq("is_active",true).order("sort_order"),supabase.from("intelligence_source_capabilities").select("*")]);if(!live)return;if(s.error||p.error){setError("数据源暂不可用，请检查目录权限。");setLoading(false);return;}setSources((s.data||[]) as Source[]);setCapabilities((p.data||[]) as Capability[]);setLoading(false);})();return()=>{live=false;};},[organizationId]);
 const recommended=sources.filter(s=>defaultSourceSlugs.includes(s.slug)).sort((a,b)=>defaultSourceSlugs.indexOf(a.slug)-defaultSourceSlugs.indexOf(b.slug));
 const visible=sources.filter(s=>{const searchable=[s.name,...capabilities.filter(cap=>cap.source_id===s.id).map(cap=>cap.label)].join(" ").toLowerCase();return (channel==="全部"||s.channel===channel)&&searchable.includes(query.toLowerCase());});
 const list=expanded?visible:recommended,selected=selectedSourceIds.length;
 const toggle=(id:string,checked:boolean)=>onChange(checked?[...selectedSourceIds,id]:selectedSourceIds.filter(x=>x!==id));
 const renderCard=(source:Source)=><label className={selectedSourceIds.includes(source.id)?"gi-source-card selected":"gi-source-card"} key={source.id}>
  <input className="gi-source-native-check" type="checkbox" checked={selectedSourceIds.includes(source.id)} onChange={e=>toggle(source.id,e.target.checked)} aria-label={"选择"+source.name}/>
  <img src={source.logo_url} alt="" onError={e=>{e.currentTarget.style.display="none";const fallback=e.currentTarget.nextElementSibling as HTMLElement|null;if(fallback)fallback.style.display="grid";}}/>
  <span className="gi-logo-fallback">{source.name.slice(0,2).toUpperCase()}</span>
  <span className="gi-source-name"><strong>{source.name}</strong><small>{capabilities.filter(cap=>cap.source_id===source.id).slice(0,2).map(cap=>cap.label).join(" · ")||source.channel}</small></span>
  <span className={`gi-status ${statusTone[source.status]||"planned"}`}>{statusLabel[source.status]||"待接入"}</span>
 </label>;
 return <section className="gi-source-section" id="intelligence-data-sources">
  <div className="gi-section-head"><div><span className="eyebrow">03 / DATA SOURCES</span><h2>数据渠道与平台</h2><p>选择本次分析的数据来源</p></div><span className="gi-count-pill">{selected} 个已选</span></div>
  <div className="gi-source-actions"><div className="gi-source-actions-left"><button type="button" className="gi-quiet-button" onClick={()=>onChange(recommended.map(s=>s.id))}>推荐组合</button><button type="button" className="gi-quiet-button" onClick={()=>{onChange(recommended.map(s=>s.id));onLoadDemo();}}>载入演示数据</button></div><button type="button" className="gi-expand-button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>{expanded?"收起平台":"更多平台"} <span>{expanded?"−":"＋"}</span></button></div>
  {loading?<div className="gi-loading">正在读取平台目录…</div>:error?<div className="gi-warning">{error}</div>:<>
   {expanded&&<div className="gi-source-toolbar"><div className="gi-channel-filter">{["全部","电商平台","搜索引擎","社交媒体","视频平台","社区论坛","新闻媒体","行业媒体","行业数据"].map(x=><button key={x} type="button" className={channel===x?"active":""} onClick={()=>setChannel(x)}>{x}</button>)}</div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索平台或能力"/><button type="button" className="gi-quiet-button" onClick={()=>onChange(sources.map(s=>s.id))}>全选</button><button type="button" className="gi-quiet-button" onClick={()=>onChange([])}>清空</button></div>}
   <div className="gi-source-grid">{list.map(renderCard)}{expanded&&!list.length&&<div className="gi-source-empty">没有匹配的平台</div>}</div>
  </>}
  <div className="gi-source-note">平台状态以实际授权和接入情况为准；选择平台不代表已启动实时采集。</div>
 </section>;
}
export function IntelligenceTabContent({data,activeTab,analyzed,loading}:{data:DemoData|null;activeTab:string;analyzed:boolean;loading:boolean}) {
 if(!analyzed)return <div className="results-empty"><div className="results-empty-icon">⌁</div><strong>等待配置分析条件</strong><p>完成分析对象、目标市场和数据渠道配置，然后点击「开始分析」。</p></div>;
 if(loading)return <div className="gi-loading">正在加载情报数据集…</div>;
 if(!data)return <div className="gi-warning">暂无演示数据。请检查演示数据集是否已写入当前企业。</div>;
 const d=data;
 return <div className="gi-dashboard"><div className="gi-demo-banner"><span>DEMO DATA</span>{d.demo_notice}</div>
 {activeTab==="overview"&&<><div className="gi-kpi-grid">{d.kpis.map(k=><div className="gi-kpi" key={k.label}><span>{k.label}</span><strong>{k.value}</strong><small className="positive">{k.delta} <em>{k.unit}</em></small></div>)}</div><div className="gi-chart-grid"><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>跨渠道热度变化</h4><p>近六个月相对指数 · 模拟数据</p></div><span>趋势对比</span></div><LineChart data={d.trend}/></article><article className="gi-chart-card"><div className="gi-card-head"><div><h4>社交平台声量结构</h4><p>互动样本占比</p></div></div><DonutChart items={d.social.map(x=>({label:x.platform,value:x.share}))}/></article><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>国家市场机会分布</h4><p>机会指数综合示意，不代表市场规模</p></div></div><MarketMap markets={d.markets}/></article></div></>}
 {activeTab==="bestsellers"&&<div className="gi-chart-grid"><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>全球热销商品样本榜</h4><p>平台热度综合分 · 并非真实销量排名</p></div></div><div className="gi-table-wrap"><table className="gi-data-table"><thead><tr><th>排名</th><th>商品</th><th>品牌</th><th>价格</th><th>热度指数</th><th>评论样本</th></tr></thead><tbody>{d.bestsellers.map(x=><tr key={x.rank}><td>#{x.rank}</td><td><strong>{x.name}</strong></td><td>{x.brand}</td><td>${x.price.toFixed(2)}</td><td><div className="gi-score"><i style={{width:x.score+"%"}}/><b>{x.score}</b></div></td><td>{x.review_count.toLocaleString()}</td></tr>)}</tbody></table></div></article></div>}
 {activeTab==="search"&&<div className="gi-chart-grid"><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>搜索兴趣趋势</h4><p>0–100 相对指数，不是绝对搜索量</p></div></div><LineChart data={d.trend}/></article><article className="gi-chart-card"><div className="gi-card-head"><div><h4>增长查询</h4><p>示例关键词增长率</p></div></div><div className="gi-term-list">{d.search_terms.map(x=><div key={x.term}><span>{x.term}</span><b>{x.growth}</b><i style={{width:x.index+"%"}}/></div>)}</div></article></div>}
 {activeTab==="social"&&<div className="gi-chart-grid"><article className="gi-chart-card"><div className="gi-card-head"><div><h4>平台互动指数</h4><p>跨平台相对互动</p></div></div><BarChart items={d.social.map(x=>({label:x.platform,value:x.engagement}))}/></article><article className="gi-chart-card"><div className="gi-card-head"><div><h4>社交声量占比</h4><p>演示样本</p></div></div><DonutChart items={d.social.map(x=>({label:x.platform,value:x.share}))}/></article></div>}
 {activeTab==="consumer"&&<div className="gi-chart-grid"><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>消费者高频痛点</h4><p>评论与社区主题聚类样本</p></div></div><BarChart items={d.pain_points.map(x=>({label:x.label,value:x.count}))}/></article></div>}
 {activeTab==="competitors"&&<div className="gi-chart-grid"><article className="gi-chart-card"><div className="gi-card-head"><div><h4>竞品关注度份额</h4><p>模拟样本结构</p></div></div><DonutChart items={d.competitors.map(x=>({label:x.name,value:x.share}))}/></article><article className="gi-chart-card"><div className="gi-card-head"><div><h4>竞品价格定位</h4><p>USD 标价示例</p></div></div><BarChart items={d.competitors.map(x=>({label:x.name,value:x.price}))}/></article></div>}
 {activeTab==="categories"&&<div className="gi-chart-grid"><article className="gi-chart-card"><div className="gi-card-head"><div><h4>细分品类结构</h4><p>样本占比</p></div></div><DonutChart items={d.categories}/></article><article className="gi-chart-card"><div className="gi-card-head"><div><h4>细分市场占比</h4><p>演示数据</p></div></div><BarChart items={d.categories}/></article></div>}
 {activeTab==="markets"&&<div className="gi-chart-grid"><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>国家/地区排行</h4><p>演示数据，仅用于界面预览；地图与排行共用同一组相对兴趣值。</p></div></div><div className="gi-gt-region-layout"><GoogleTrendsRegionMap regions={d.markets.map(m=>({name:m.name,label:m.name,code:m.code,value:m.search}))} geo="" keyword="演示数据"/><div className="gi-gt-region-ranking"><h5>国家/地区排行</h5><div className="gi-market-rank">{d.markets.slice().sort((a,b)=>b.search-a.search).map(m=><div key={m.code}><span>{m.flag} {m.name}</span><div><i style={{width:m.search+"%"}}/></div><b>{m.search}</b></div>)}</div></div></div></article></div>}
 </div>;
}

export function AIAnalysisPanel({data,accessToken,context,activeTab,liveResults=[]}:{data:DemoData|null;accessToken:string;context:string;activeTab:string;liveResults?:any[]}) {
 const [provider,setProvider]=useState("cloudflare-workers-ai"),[model,setModel]=useState("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),[mode,setMode]=useState("all"),[singleTab,setSingleTab]=useState(activeTab),[customTabs,setCustomTabs]=useState(["bestsellers","search","consumer"]),[question,setQuestion]=useState(""),[answer,setAnswer]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const tabOptions=[["overview","情报总览"],["bestsellers","全球热销榜"],["search","搜索趋势"],["social","社交媒体趋势"],["consumer","消费者洞察"],["competitors","品牌与竞品"],["categories","品类分析"],["markets","国家市场"]];
 useEffect(()=>{setSingleTab(activeTab);},[activeTab]);
 const liveDataset=(liveResults.length?({demo_notice:"以下为真实 Google Trends 采集数据；未接入的电商、社媒维度不作推测。",product:{name:context||liveResults[0]?.keyword||"关键词研究",category:"Google Trends",brand:""},kpis:[],trend:liveResults.flatMap((r:any)=>Array.isArray(r.interest_over_time)?r.interest_over_time.map((p:any)=>({period:p.date||"",search:Number(p[r.keyword])||0,social:0,commerce:0})):[]),bestsellers:[],search_terms:liveResults.flatMap((r:any)=>{const q=r.related_queries||{};return (Array.isArray(q.rising)?q.rising:Array.isArray(q.top)?q.top:[]).map((x:any)=>({term:x.query||x.keyword||"",index:Number(x.value)||0,growth:x.formattedValue||""}));}),social:[],pain_points:[],competitors:[],categories:[],markets:liveResults.flatMap((r:any)=>Array.isArray(r.interest_by_region)?r.interest_by_region.map((x:any)=>({code:x.geoCode||"",name:x.region||x.geoCode||"",flag:"",opportunity:Number(x.value)||0,search:Number(x.value)||0,social:0,price:0})):[]),ai_reports:{all:"请基于已采集的 Google Trends 数据进行分析。",tabs:{}}} as DemoData):null);
 const aiDataset=liveDataset||data;
 const run=async()=>{if(!aiDataset){setError("请先加载真实采集结果或可用数据集。");return;}if(provider!=="cloudflare-workers-ai"){setError("当前 AI 服务尚未配置，请选择已接入的服务。");return;}if(mode==="custom"&&!customTabs.length){setError("请至少选择一个情报维度。");return;}setBusy(true);setError("");try{const response=await fetch("/api/intelligence-ai",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+accessToken},body:JSON.stringify({provider,model,mode,tab:singleTab,tabs:customTabs,question,context,dataset:aiDataset,live_evidence:liveResults})});const payload=await response.json();if(!response.ok)throw new Error(payload.error||"AI 分析暂不可用");setAnswer(payload.answer||"AI 未返回可展示内容。");}catch(e){setError(e instanceof Error?e.message:"AI 分析失败，请稍后重试。");}finally{setBusy(false);}};
 const sample=mode==="single"?(aiDataset?.ai_reports.tabs[singleTab]||aiDataset?.ai_reports.all):mode==="custom"?aiDataset?.ai_reports.all:aiDataset?.ai_reports.all;
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
  <div className="gi-section-head"><div><span className="eyebrow">05 / AI INTELLIGENCE</span><h2>AI 分析与商业洞察</h2><p>先选择 AI 服务与模型，再确定分析范围和研究问题；分析结果对应本次实际调用的模型。</p></div><span className="gi-ai-model">Cloudflare Workers AI · {selectedModel.label}</span></div>
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
      <TabPanel><div className="gi-ai-field"><strong>选择参与分析的情报维度</strong><div className="gi-ai-checks">{tabOptions.map(x=><label key={x[0]}><input type="checkbox" checked={customTabs.includes(x[0])} onChange={e=>setCustomTabs(v=>e.target.checked?[...v,x[0]]:v.filter(k=>k!==x[0]))}/>{x[1]}</label>)}</div><small>已选择 {customTabs.length} / 8 个维度</small></div></TabPanel>
     </TabPanels>
    </Tabs></div>
   </section>
   <section className="gi-ai-step">
    <div className="gi-ai-step-head"><span className="gi-ai-step-index">03</span><div><strong>补充研究问题</strong><small>可选，描述希望 AI 重点回答的商业问题。</small></div></div>
    <label className="gi-ai-field">研究问题<textarea rows={3} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="例如：哪个国家值得优先进入？产品应该如何差异化？"/></label>
   </section>
   <button className="primary-button gi-ai-run" type="button" onClick={run} disabled={busy||!accessToken||!model}>{busy?"AI 正在分析…":"开始 AI 分析"}</button>
   <small className="gi-ai-run-note">调用 Cloudflare Workers AI 会产生模型用量；仅发送本次选择的数据摘要与研究问题。真实采集数据与模拟数据会在分析结论中区分标注。</small>
  </div>
  <div className="gi-ai-result"><div className="gi-ai-result-head"><div><span className="eyebrow">AI INTERPRETATION</span><h3>{answer?"AI 分析结果":"演示分析报告"}</h3></div><span className="gi-demo-tag">{answer?"模型生成":liveResults.length?"真实数据待分析":"DEMO SAMPLE"}</span></div>{error&&<div className="gi-warning">{error}</div>}<div className="gi-ai-answer"><MarkdownReport content={answer||sample||"等待分析数据。"}/></div><div className="gi-ai-evidence"><strong>证据说明</strong><p>{liveResults.length?"本次包含真实 Google Trends 观察数据；AI 对需求和机会的解释属于推断，不能替代真实销量或已验证购买需求。":"当前样本可能包含模拟数据；平台排名、搜索兴趣、互动样本和 AI 推断不可替代真实销量或经验证的市场数据。"}</p><span>本次模型：{selectedModel.label} · {provider==="cloudflare-workers-ai"?"Cloudflare Workers AI":"未配置服务"}</span><span>分析上下文：{context||"当前情报任务"}</span></div></div></div>
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
export function HistoryTasksAccordion({history,onSelectHistory}:{history:any[];onSelectHistory:(id:string)=>void}) {
 const [open,setOpen]=useState(false);
 if(!history.length)return null;
 return <section className="gi-history-accordion">
  <Accordion align="start" size="md">
   <AccordionItem title={`历史搜索任务 · ${history.length}`} open={open} onHeadingClick={()=>setOpen(value=>!value)}>
    <p className="gi-history-description">查看并恢复此前保存的 Google Trends 搜索任务。</p>
    <div className="gi-history-table-wrap"><table className="gi-history-table"><thead><tr><th>采集任务</th><th>数据来源</th><th>市场</th><th>采集时间</th><th>状态</th><th>结果</th><th>操作</th></tr></thead><tbody>{history.map((item:any)=><tr key={item.id}><td><strong>{item.title||"Google Trends 采集"}</strong></td><td>Google Trends</td><td>{item.input_snapshot?.geo||item.input_snapshot?.markets?.join(", ")||"全球"}</td><td>{item.created_at?new Date(item.created_at).toLocaleString():"—"}</td><td><span className={"gi-history-status "+(item.status==="succeeded"?"ok":item.status==="failed"?"bad":"")}>{item.status}</span></td><td>{item.result_count??0}</td><td><button type="button" className="gi-history-open" onClick={()=>onSelectHistory(item.id)}>查看结果</button></td></tr>)}</tbody></table></div>
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
 const layer=L.geoJSON({type:"FeatureCollection",features},{style:(feature:any)=>{const value=feature.properties.__trendValue;return{color:"#ffffff",weight:0.8,fillColor:value===null?"#d8d8d8":color(value),fillOpacity:value===null?0.45:0.88};},onEachFeature:(feature:any,shape:any)=>{const p=feature.properties||{};const label=p.__trendValue===null?"暂无足够数据":("搜索兴趣指数："+p.__trendValue);shape.bindTooltip("<strong>"+String(p.__trendName)+"</strong><br/>"+label,{sticky:true});}}).addTo(map);
 if(!global&&layer.getBounds().isValid())map.fitBounds(layer.getBounds(),{padding:[12,12]});else if(layer.getBounds().isValid())map.fitBounds(layer.getBounds(),{padding:[8,8]});
 window.setTimeout(()=>map.invalidateSize(),120);
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
 const mapGeo=result?.geo&&String(result.geo).toUpperCase()!=="WORLDWIDE"?String(result.geo):"";
 return <section className="gi-live-results">
  <div className="gi-live-status"><span className={"gi-status "+(loading?"limited":meta?.status==="failed"?"error":"ready")}>{loading?"正在采集…":meta?.status==="failed"?"采集失败":meta?"真实数据":"等待采集"}</span></div>
  {loading&&<div className="gi-warning">正在调用 Google Trends Actor，完成后自动保存任务与原始结果。</div>}
  
  {results.length>1&&<div className="gi-filter-row"><label>关键词结果<select value={selected} onChange={e=>setSelected(Number(e.target.value))}>{results.map((x:any,i:number)=><option key={i} value={i}>{x.keyword||"关键词 "+(i+1)}</option>)}</select></label></div>}
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

export function IntelligenceDataExperience({organizationId,activeTab,analyzed,accessToken,context,liveResults=[],liveMeta=null,history=[],collectionLoading=false}:{organizationId:string|null;activeTab:string;analyzed:boolean;accessToken:string;context:string;liveResults?:any[];liveMeta?:any|null;history?:any[];collectionLoading?:boolean}) {
 const [data,setData]=useState<DemoData|null>(null),[loading,setLoading]=useState(false),[loadError,setLoadError]=useState("");
 useEffect(()=>{if(!organizationId){setData(null);return;}let live=true;setLoading(true);supabase.from("intelligence_demo_datasets").select("dataset").eq("organization_id",organizationId).eq("slug","wireless-headphones-global-demo-v1").maybeSingle().then(({data,error})=>{if(!live)return;if(error){setLoadError(error.message);setData(null);}else{setLoadError("");setData((data?.dataset||null) as DemoData|null);}setLoading(false);});return()=>{live=false;};},[organizationId]);
 const hasLive=liveResults.length>0;
 return <>{hasLive||collectionLoading||liveMeta||history.length>0?<LiveGoogleTrends results={liveResults} meta={liveMeta} loading={collectionLoading} activeTab={activeTab}/>:<><IntelligenceTabContent data={data} activeTab={activeTab} analyzed={analyzed} loading={loading}/>{loadError&&<div className="gi-warning">{loadError}</div>}</>}
 <AIAnalysisPanel data={data} accessToken={accessToken} context={context} activeTab={activeTab} liveResults={liveResults}/>
 </>;
}
