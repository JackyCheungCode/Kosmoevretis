import { useEffect, useState } from "react";
import CarbonSelect from "./components/CarbonSelect";
import "./intelligence.css";
import { supabase } from "./lib/supabase";

type Source = { id:string; slug:string; channel:string; name:string; logo_url:string; website_url:string; description:string; market_codes:string[]; status:string; sort_order:number };
type Connector = { id:string; source_id:string; name:string; connector_type:string; provider:string; actor_id:string|null; status:string; notes:string; auth_required:boolean };
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
const channelList=["全部渠道","电商平台","搜索引擎","社交媒体","视频平台","社区论坛","用户评价","新闻媒体","行业媒体","行业数据"];
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

export function DataSourceSelector({organizationId,selectedMarkets,selectedSourceIds,onChange,onLoadDemo}:{organizationId:string|null;selectedMarkets:string[];selectedSourceIds:string[];onChange:(ids:string[])=>void;onLoadDemo:()=>void}) {
 const [sources,setSources]=useState<Source[]>([]),[connectors,setConnectors]=useState<Connector[]>([]),[capabilities,setCapabilities]=useState<Capability[]>([]),[channel,setChannel]=useState("全部渠道"),[query,setQuery]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let live=true;(async()=>{const [s,c,p]=await Promise.all([supabase.from("intelligence_data_sources").select("*").eq("is_active",true).order("sort_order"),supabase.from("intelligence_source_connectors").select("*"),supabase.from("intelligence_source_capabilities").select("*")]);if(!live)return;if(s.error||c.error||p.error){setError("数据源目录暂不可用，请检查目录迁移与权限。");setLoading(false);return;}setSources((s.data||[]) as Source[]);setConnectors((c.data||[]) as Connector[]);setCapabilities((p.data||[]) as Capability[]);setLoading(false);})();return()=>{live=false;};},[organizationId]);
 const visible=sources.filter(s=>{const searchable=[s.name,s.description,...capabilities.filter(cap=>cap.source_id===s.id).flatMap(cap=>[cap.label,cap.description])].join(" ").toLowerCase();return (channel==="全部渠道"||s.channel===channel)&&searchable.includes(query.toLowerCase());});
 const selected=selectedSourceIds.length;
 return <section className="gi-source-section" id="intelligence-data-sources">
  <div className="gi-section-head"><div><span className="eyebrow">03 / DATA SOURCES & PLATFORMS</span><h2>数据渠道与平台</h2><p>选择本次分析使用的数据来源。平台能力、采集器类型和授权状态分别展示。</p></div><span className="gi-count-pill">{selected} 个平台已选</span></div>
  <div className="gi-source-toolbar"><div className="gi-channel-filter">{channelList.map(x=><button key={x} type="button" className={channel===x?"active":""} onClick={()=>setChannel(x)}>{x}</button>)}</div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索平台名称或数据能力"/><button type="button" className="gi-quiet-button" onClick={()=>onChange(sources.map(source=>source.id))}>全选</button><button type="button" className="gi-quiet-button" onClick={()=>onChange(defaultSourceSlugs.map(slug=>sources.find(s=>s.slug===slug)?.id).filter(Boolean) as string[])}>推荐组合</button><button type="button" className="gi-quiet-button" onClick={()=>{onChange(defaultSourceSlugs.map(slug=>sources.find(s=>s.slug===slug)?.id).filter(Boolean) as string[]);onLoadDemo();}}>载入演示分析</button><button type="button" className="gi-quiet-button" onClick={()=>onChange([])}>清空</button></div>
  {loading?<div className="gi-loading">正在读取平台目录…</div>:error?<div className="gi-warning">{error}</div>:<div className="gi-source-grid">{visible.map(source=>{const checked=selectedSourceIds.includes(source.id),sourceConnectors=connectors.filter(c=>c.source_id===source.id),sourceCaps=capabilities.filter(c=>c.source_id===source.id),supported=source.market_codes.includes("GLOBAL")||!selectedMarkets.length||selectedMarkets.some(m=>source.market_codes.includes(m));return <article className={checked?"gi-source-card selected":"gi-source-card"} key={source.id}><div className="gi-source-card-top"><label className="gi-source-check"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked?[...selectedSourceIds,source.id]:selectedSourceIds.filter(id=>id!==source.id))}/><span className="sr-only">选择{source.name}</span></label><img src={source.logo_url} alt={source.name+" Logo"} onError={e=>{e.currentTarget.style.display="none";const fallback=e.currentTarget.nextElementSibling as HTMLElement|null;if(fallback)fallback.style.display="grid";}}/><span className="gi-logo-fallback">{source.name.slice(0,2).toUpperCase()}</span><div className="gi-source-name"><strong>{source.name}</strong><small>{source.channel}</small></div><span className={`gi-status ${statusTone[source.status]||"planned"}`}>{statusLabel[source.status]||"待接入"}</span></div><p>{source.description}</p><div className="gi-source-capabilities">{sourceCaps.slice(0,4).map(cap=><span key={cap.id} title={cap.description}>{cap.label}</span>)}</div><div className="gi-connector-list">{sourceConnectors.map(connector=><span key={connector.id} title={connector.notes}>{connector.connector_type==="apify_actor"?"Apify Actor":connector.connector_type==="official_api"?"官方 API":connector.connector_type==="public_web"?"公开网页":"第三方"} · {connector.name}{connector.actor_id?" · "+connector.actor_id:""}<em className={statusTone[connector.status]||"planned"}>{statusLabel[connector.status]||"待接入"}</em></span>)}</div><div className="gi-source-foot"><span>{supported?"覆盖所选市场":"所选市场可能不支持"}</span><span>{source.market_codes.slice(0,5).join(" · ")}</span></div></article>;})}</div>}
  <div className="gi-source-note"><strong>能力边界：</strong>目录中标注「需授权 / 受限 / 待接入」的平台不会被当作已连接。真实销量、平台排名、第三方估算和 AI 推断分别标记；选择平台不等于已经启动采集。</div>
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
 {activeTab==="markets"&&<div className="gi-chart-grid"><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>国家市场机会地图</h4><p>圆点为演示机会指数，不是地理热力实测值</p></div></div><MarketMap markets={d.markets}/></article><article className="gi-chart-card wide"><div className="gi-card-head"><div><h4>国家市场机会排序</h4><p>需求、社交热度与价格带综合示例</p></div></div><div className="gi-market-rank">{d.markets.map(m=><div key={m.code}><span>{m.flag} {m.name}</span><div><i style={{width:m.opportunity+"%"}}/></div><b>{m.opportunity}</b></div>)}</div></article></div>}
 </div>;
}

export function AIAnalysisPanel({data,accessToken,context,activeTab}:{data:DemoData|null;accessToken:string;context:string;activeTab:string}) {
 const [mode,setMode]=useState("all"),[singleTab,setSingleTab]=useState(activeTab),[customTabs,setCustomTabs]=useState(["bestsellers","search","consumer"]),[question,setQuestion]=useState(""),[answer,setAnswer]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const tabOptions=[["overview","情报总览"],["bestsellers","全球热销榜"],["search","搜索趋势"],["social","社交媒体趋势"],["consumer","消费者洞察"],["competitors","品牌与竞品"],["categories","品类分析"],["markets","国家市场"]];
 useEffect(()=>{setSingleTab(activeTab);},[activeTab]);
 const run=async()=>{if(!data){setError("演示数据集尚未加载。");return;}setBusy(true);setError("");try{const response=await fetch("/api/intelligence-ai",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+accessToken},body:JSON.stringify({mode,tab:singleTab,tabs:customTabs,question,context,dataset:data})});const payload=await response.json();if(!response.ok)throw new Error(payload.error||"AI 分析暂不可用");setAnswer(payload.answer||"AI 未返回可展示内容。");}catch(e){setError(e instanceof Error?e.message:"AI 分析失败，请稍后重试。");}finally{setBusy(false);}};
 const sample=mode==="single"?(data?.ai_reports.tabs[singleTab]||data?.ai_reports.all):mode==="custom"?data?.ai_reports.all:data?.ai_reports.all;
 return <section className="gi-ai-section" id="ai-intelligence-analysis"><div className="gi-section-head"><div><span className="eyebrow">05 / AI INTELLIGENCE</span><h2>AI 分析与商业洞察</h2><p>可综合全部情报、分析单个 Tab，或组合多个维度；结论可追溯到当前数据集。</p></div><span className="gi-ai-model">Cloudflare Workers AI</span></div>
  <div className="gi-ai-layout"><div className="gi-ai-controls"><div className="gi-mode-switch">{[["all","全部结果"],["single","单个 Tab"],["custom","组合分析"]].map(x=><button type="button" key={x[0]} className={mode===x[0]?"active":""} onClick={()=>setMode(x[0])}>{x[1]}</button>)}</div>
   {mode==="single"&&<label className="gi-ai-field">选择分析板块<CarbonSelect value={singleTab} onChange={setSingleTab}>{tabOptions.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</CarbonSelect></label>}
   {mode==="custom"&&<div className="gi-ai-field"><strong>选择参与分析的 Tab</strong><div className="gi-ai-checks">{tabOptions.map(x=><label key={x[0]}><input type="checkbox" checked={customTabs.includes(x[0])} onChange={e=>setCustomTabs(v=>e.target.checked?[...v,x[0]]:v.filter(k=>k!==x[0]))}/>{x[1]}</label>)}</div></div>}
   <label className="gi-ai-field">补充研究问题（可选）<textarea rows={3} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="例如：哪个国家值得优先进入？产品应该如何差异化？"/></label>
   <button className="primary-button gi-ai-run" type="button" onClick={run} disabled={busy||!accessToken}>{busy?"AI 正在分析…":"开始 AI 分析"}</button><small>实时分析会调用 Cloudflare Workers AI，产生模型用量；仅发送本次选择的数据摘要与问题。</small>
  </div><div className="gi-ai-result"><div className="gi-ai-result-head"><div><span className="eyebrow">AI INTERPRETATION</span><h3>{answer?"AI 分析结果":"演示分析报告"}</h3></div><span className="gi-demo-tag">{answer?"模型生成":"DEMO SAMPLE"}</span></div>{error&&<div className="gi-warning">{error}</div>}<div className="gi-ai-answer">{answer||sample||"等待分析数据。"}</div><div className="gi-ai-evidence"><strong>证据说明</strong><p>当前样本全部为模拟数据；平台排名、搜索兴趣、互动样本和 AI 推断不可替代真实销量或经验证的市场数据。</p><span>分析上下文：{context||"当前情报任务"}</span></div></div></div>
 </section>;
}

export function IntelligenceDataExperience({organizationId,activeTab,analyzed,accessToken,context}:{organizationId:string|null;activeTab:string;analyzed:boolean;accessToken:string;context:string}) {
 const [data,setData]=useState<DemoData|null>(null),[loading,setLoading]=useState(false),[loadError,setLoadError]=useState("");
 useEffect(()=>{if(!organizationId){setData(null);return;}let live=true;setLoading(true);supabase.from("intelligence_demo_datasets").select("dataset").eq("organization_id",organizationId).eq("slug","wireless-headphones-global-demo-v1").maybeSingle().then(({data,error})=>{if(!live)return;if(error){setLoadError(error.message);setData(null);}else{setLoadError("");setData((data?.dataset||null) as DemoData|null);}setLoading(false);});return()=>{live=false;};},[organizationId]);
 return <><IntelligenceTabContent data={data} activeTab={activeTab} analyzed={analyzed} loading={loading}/>{loadError&&<div className="gi-warning">{loadError}</div>}<AIAnalysisPanel data={data} accessToken={accessToken} context={context} activeTab={activeTab}/></>;
}
