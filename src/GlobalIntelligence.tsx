import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { Button, InlineNotification, PasswordInput, Checkbox, Search, TextArea, TextInput } from "@carbon/react";
import { CarbonTabs } from "./design-system/components";
import CarbonSelect from "./components/CarbonSelect";
import { AIAnalysisPanel, DataSourceSelector, HistoryTasksAccordion, IntelligenceDataExperience } from "./IntelligenceExperience";

type Product={id:string;name:string;brand:string|null;model:string|null;category_path:string[]|null};
type Value={id:string;value_text:string;unit:string|null;include_in_analysis?:boolean};
type Attribute={id:string;name:string;unit:string|null;include_in_analysis?:boolean;product_attribute_values:Value[]};
type Variant={id:string;sku:string|null;title:string|null;model:string|null;price:number|null;currency:string|null;attribute_value_ids:string[]};
type Tab={id:string;label:string};
type Market={code:string;name:string;flag:string;mapCode:string};
declare global{interface Window{L?:any}}

const tabs:Tab[]=[
{id:"overview",label:"情报总览"},
{id:"bestsellers",label:"全球热销榜"},
{id:"search",label:"搜索趋势"},
{id:"social",label:"社交媒体趋势"},
{id:"consumer",label:"消费者洞察"},
{id:"competitors",label:"品牌与竞品"},
{id:"categories",label:"品类分析"},
{id:"markets",label:"国家市场"}];
const isoCodes="AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ").filter(x=>!["CN","HK","MO","TW"].includes(x));
const displayNames=new Intl.DisplayNames(["zh-CN"],{type:"region"});
const flagFor=(code:string)=>String.fromCodePoint(...code.toUpperCase().split("").map(c=>127397+c.charCodeAt(0)));
const markets:Market[]=[...isoCodes.map(code=>({code,name:displayNames.of(code)||code,flag:flagFor(code),mapCode:code})),{code:"CN-MAINLAND",name:"中国大陆",flag:"🇨🇳",mapCode:"CN"},{code:"HK",name:"中国香港",flag:"🇭🇰",mapCode:"HK"},{code:"MO",name:"中国澳门",flag:"🇲🇴",mapCode:"MO"},{code:"TW",name:"中国台湾",flag:"🇹🇼",mapCode:"TW"}].sort((a,b)=>a.name.localeCompare(b.name,"zh-CN"));
const languageByMarket:Record<string,string[]>={US:["EN"],GB:["EN"],CA:["EN","FR"],AU:["EN"],NZ:["EN"],JP:["JA"],KR:["KO"],DE:["DE"],AT:["DE"],CH:["DE","FR","IT"],FR:["FR"],BE:["NL","FR"],NL:["NL"],ES:["ES"],MX:["ES"],BR:["PT-BR"],PT:["PT-PT"],CN:["ZH"],"CN-MAINLAND":["ZH"],HK:["ZH","EN"],MO:["ZH","PT-PT"],TW:["ZH"],IN:["EN","HI"],SG:["EN","ZH"],IE:["EN"],IT:["IT"],SE:["SV"],NO:["NB"],DK:["DA"],FI:["FI"],PL:["PL"],TR:["TR"],RU:["RU"],TH:["TH"],VN:["VI"],ID:["ID"],MY:["MS","EN"],PH:["EN"],ZA:["EN"]};
const languageNames:Record<string,string>={EN:"英语",JA:"日语",KO:"韩语",DE:"德语",FR:"法语",ES:"西班牙语","PT-BR":"葡萄牙语（巴西）","PT-PT":"葡萄牙语",ZH:"中文",NL:"荷兰语",IT:"意大利语",HI:"印地语",SV:"瑞典语",NB:"挪威语",DA:"丹麦语",FI:"芬兰语",PL:"波兰语",TR:"土耳其语",RU:"俄语",TH:"泰语",VI:"越南语",ID:"印尼语",MS:"马来语"};
const extraLanguages=["EN","JA","KO","DE","FR","ES","PT-BR","PT-PT","ZH","NL","IT","HI","SV","NB","DA","FI","PL","TR","RU","TH","VI","ID","MS"];

function ensureLeaflet():Promise<any>{
 if(window.L)return Promise.resolve(window.L);
 return new Promise((resolve,reject)=>{
  const script=document.createElement("script");script.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";script.async=true;
  const existing=document.querySelector<HTMLLinkElement>('link[data-leaflet-css="true"]');
  if(!existing){const link=document.createElement("link");link.rel="stylesheet";link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";link.dataset.leafletCss="true";document.head.appendChild(link);}
  script.onload=()=>window.L?resolve(window.L):reject(new Error("地图组件初始化失败"));script.onerror=()=>reject(new Error("地图组件加载失败"));document.head.appendChild(script);
 });
}
function WorldMarketMap({selected,onToggle}:{selected:string[];onToggle:(code:string)=>void}){
 const element=useRef<HTMLDivElement>(null),mapRef=useRef<any>(null),layerRef=useRef<any>(null);const [mapError,setMapError]=useState("");
 useEffect(()=>{
  let cancelled=false;
  ensureLeaflet().then(async L=>{
   if(cancelled||!element.current)return;
   const map=L.map(element.current,{worldCopyJump:true,scrollWheelZoom:false}).setView([22,12],1.35);mapRef.current=map;
   L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:8,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
   try{
    const response=await fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson");if(!response.ok)throw new Error("国家边界数据暂不可用");
    const geo=await response.json();if(cancelled)return;
    layerRef.current=L.geoJSON(geo,{style:(feature:any)=>{const code=feature?.properties?.["ISO3166-1-Alpha-2"]||feature?.properties?.ISO_A2||feature?.properties?.iso_a2;const active=selected.includes(code==="CN"?"CN-MAINLAND":code);return{color:active?"#0f62fe":"#8d8d8d",weight:active?2:0.7,fillColor:"#0f62fe",fillOpacity:active?0.5:0.025};},onEachFeature:(feature:any,layer:any)=>{const p=feature.properties||{},code=p["ISO3166-1-Alpha-2"]||p.ISO_A2||p.iso_a2;if(code)layer.on({click:()=>onToggle(code==="CN"?"CN-MAINLAND":code)}).bindTooltip(p.ADMIN||p.name||code);}}).addTo(map);
   }catch(e){setMapError(e instanceof Error?e.message:"地图边界加载失败");}
   window.setTimeout(()=>map.invalidateSize(),150);
  }).catch(e=>setMapError(e instanceof Error?e.message:"地图加载失败"));
  return()=>{cancelled=true;if(mapRef.current){mapRef.current.remove();mapRef.current=null;layerRef.current=null;}};
 },[]);
 useEffect(()=>{if(!layerRef.current)return;layerRef.current.setStyle((feature:any)=>{const code=feature?.properties?.["ISO3166-1-Alpha-2"]||feature?.properties?.ISO_A2||feature?.properties?.iso_a2;const active=selected.includes(code==="CN"?"CN-MAINLAND":code);return{color:active?"#0f62fe":"#8d8d8d",weight:active?2:0.7,fillColor:"#0f62fe",fillOpacity:active?0.5:0.025};});},[selected]);
 return <div className="world-map-wrap"><div ref={element} className="world-map" aria-label="OpenStreetMap 全球国家地图"/>{mapError&&<div className="map-error">{mapError}</div>}<div className="map-legend"><span/>已选市场 · IBM Carbon 蓝</div></div>;
}

export default function GlobalIntelligence(){
 const [session,setSession]=useState<Session|null>(null),[ready,setReady]=useState(false),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[authError,setAuthError]=useState("");
 const [organizationId,setOrganizationId]=useState<string|null>(null),[selectedSourceIds,setSelectedSourceIds]=useState<string[]>([]);
 const [products,setProducts]=useState<Product[]>([]),[productId,setProductId]=useState(""),[attributes,setAttributes]=useState<Attribute[]>([]),[selectedValues,setSelectedValues]=useState<Record<string,string[]>>({}),[variants,setVariants]=useState<Variant[]>([]),[selectedVariants,setSelectedVariants]=useState<string[]>([]);
 const [keywords,setKeywords]=useState(""),[selectedMarkets,setSelectedMarkets]=useState<string[]>([]),[marketQuery,setMarketQuery]=useState(""),[period,setPeriod]=useState("12m");
 const [activeTab,setActiveTab]=useState("overview"),[analyzed,setAnalyzed]=useState(false),[task,setTask]=useState<{title:string;filters:string[]}|null>(null),[loading,setLoading]=useState(false),[collecting,setCollecting]=useState(false),[error,setError]=useState("");
 const [translationStatus,setTranslationStatus]=useState(""),[translations,setTranslations]=useState<Record<string,string>>({}),[extraLanguage,setExtraLanguage]=useState("EN"),[targetLanguages,setTargetLanguages]=useState<string[]>([]),[translating,setTranslating]=useState(false);
 const [,setLiveTrendResults]=useState<any[]>([]),[liveTrendMeta,setLiveTrendMeta]=useState<any|null>(null),[trendHistory,setTrendHistory]=useState<any[]>([]),[historyView,setHistoryView]=useState(false);
 const [currentTaskId,setCurrentTaskId]=useState<string|null>(null),[liveEvidence,setLiveEvidence]=useState<any[]>([]),[sourceRuns,setSourceRuns]=useState<any[]>([]);
 const pendingHistorySnapshot=useRef<any>(null);
 useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true);});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setReady(true);});return()=>subscription.unsubscribe();},[]);
 useEffect(()=>{if(!organizationId||!session?.access_token)return;let active=true;supabase.functions.invoke("global-intelligence",{body:{action:"list_history",organization_id:organizationId}}).then(({data,error})=>{if(active&&!error)setTrendHistory(data?.history||[]);});return()=>{active=false;};},[organizationId,session?.access_token]);
 useEffect(()=>{if(!session?.user){setProducts([]);setProductId("");setOrganizationId(null);return;}(async()=>{const {data:member,error:memberError}=await supabase.from("organization_members").select("organization_id").eq("user_id",session.user.id).limit(1).maybeSingle();if(memberError)throw memberError;if(!member)throw new Error("当前账号尚未加入企业工作区。");setOrganizationId(member.organization_id);const {data,error:productError}=await supabase.from("products").select("id,name,brand,model,category_path").eq("organization_id",member.organization_id).order("updated_at",{ascending:false});if(productError)throw productError;setProducts((data||[]) as Product[]);})().catch(e=>setError(e instanceof Error?e.message:"产品档案加载失败。"));},[session]);
 useEffect(()=>{if(!productId){setAttributes([]);setSelectedValues({});setVariants([]);setSelectedVariants([]);return;}(async()=>{setLoading(true);setError("");const [attributeResult,variantResult]=await Promise.all([supabase.from("product_attributes").select("id,name,unit,include_in_analysis,product_attribute_values(id,value_text,unit,include_in_analysis)").eq("product_id",productId).eq("include_in_analysis",true).order("sort_order"),supabase.from("product_variants").select("id,sku,title,model,price,currency").eq("product_id",productId)]);if(attributeResult.error)throw attributeResult.error;if(variantResult.error)throw variantResult.error;const rows=((attributeResult.data||[]) as Attribute[]).map(a=>({...a,product_attribute_values:(a.product_attribute_values||[]).filter(v=>v.include_in_analysis!==false)}));const variantRows=(variantResult.data||[]) as Omit<Variant,"attribute_value_ids">[];const variantIds=variantRows.map(v=>v.id);let valueRows:{variant_id:string;attribute_value_id:string}[]=[];if(variantIds.length){const {data,error:valueError}=await supabase.from("product_variant_values").select("variant_id,attribute_value_id").eq("product_id",productId);if(valueError)throw valueError;valueRows=(data||[]) as typeof valueRows;}const mapped=variantRows.map(v=>({...v,attribute_value_ids:valueRows.filter(x=>x.variant_id===v.id).map(x=>x.attribute_value_id)}));const defaults=Object.fromEntries(rows.map(a=>[a.id,(a.product_attribute_values||[]).map(v=>v.id)]));const restore=pendingHistorySnapshot.current?.product_id===productId?pendingHistorySnapshot.current:null;setAttributes(rows);setSelectedValues(restore?.selected_values||defaults);setVariants(mapped);setSelectedVariants(restore?.selected_variants||mapped.map(v=>v.id));if(restore)pendingHistorySnapshot.current=null;})().catch(e=>setError(e instanceof Error?e.message:"产品参数与规格加载失败。")).finally(()=>setLoading(false));},[productId]);
 useEffect(()=>{if(historyView)return;setTargetLanguages(Array.from(new Set(selectedMarkets.flatMap(code=>languageByMarket[code]||[]))));setTranslations({});},[selectedMarkets.join("|"),historyView]);
 const selectedProduct=products.find(p=>p.id===productId)||null,selectedCount=useMemo(()=>Object.values(selectedValues).reduce((n,v)=>n+v.length,0),[selectedValues]);
 const keywordList=useMemo(()=>keywords.split(/[\n,，;；]+/).map(x=>x.trim()).filter(Boolean),[keywords]);
 const resetAnalysis=()=>{setAnalyzed(false);setTask(null);setCurrentTaskId(null);setLiveEvidence([]);setLiveTrendResults([]);setLiveTrendMeta(null);setSourceRuns([]);setHistoryView(false);setError("");};
 const visibleMarkets=useMemo(()=>markets.filter(m=>m.name.toLowerCase().includes(marketQuery.toLowerCase())||m.code.toLowerCase().includes(marketQuery.toLowerCase())),[marketQuery]);
 const toggleValue=(attributeId:string,valueId:string)=>{setSelectedValues(current=>{const values=current[attributeId]||[];return{...current,[attributeId]:values.includes(valueId)?values.filter(x=>x!==valueId):[...values,valueId]};});resetAnalysis();};
 const selectAllValues=(attributeId:string,values:Value[])=>{setSelectedValues(current=>({...current,[attributeId]:values.map(v=>v.id)}));resetAnalysis();};
 const toggleMarket=(code:string)=>{setSelectedMarkets(current=>current.includes(code)?current.filter(x=>x!==code):[...current,code]);resetAnalysis();};
 const translate=async()=>{if(!keywordList.length){setTranslationStatus("请先输入需要翻译的关键词。");return;}if(!targetLanguages.length){setTranslationStatus("请先选择目标市场，或手动添加翻译语言。");return;}setTranslating(true);setTranslationStatus("");try{const next={...translations};for(const lang of targetLanguages){const response=await fetch("/api/translate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:keywordList,target_lang:lang})});const payload=await response.json();if(!response.ok)throw new Error(payload.error||"DeepL 翻译服务暂不可用");next[lang]=(payload.translations||[]).map((item:{text:string})=>item.text).join("；");}setTranslations(next);resetAnalysis();setTranslationStatus("翻译完成，可直接编辑各语言译词。");}catch(e){setTranslationStatus(e instanceof Error?e.message:"翻译失败，请检查 DeepL 服务配置。");}finally{setTranslating(false);}};
 useEffect(()=>{if(historyView||!keywordList.length||!targetLanguages.length)return;const timer=window.setTimeout(()=>{void translate();},900);return()=>window.clearTimeout(timer);},[keywords,targetLanguages.join("|"),historyView]);
 const startAnalysis=async()=>{
  setHistoryView(false);
  if(!selectedProduct&&!keywordList.length){setError("请选择一个产品，或至少输入一个分析关键词。");return;}
  if(!selectedMarkets.length){setError("请至少选择一个目标国家或地区。");return;}
  if(!selectedSourceIds.length){setError("请至少选择一个可执行的数据源。");return;}
  if(!organizationId){setError("当前账号没有可用的企业工作区。");return;}
  const terms=keywordList.length?keywordList:[selectedProduct?.name||""];
  const filters:string[]=[];
  if(selectedProduct)filters.push(selectedProduct.name);
  attributes.forEach(a=>{const chosen=(a.product_attribute_values||[]).filter(v=>(selectedValues[a.id]||[]).includes(v.id));if(chosen.length)filters.push(a.name+"："+chosen.map(v=>v.value_text+(v.unit||"")).join("、"));});
  const chosenVariants=variants.filter(v=>selectedVariants.includes(v.id));
  if(chosenVariants.length)filters.push("产品规格："+chosenVariants.map(v=>[v.title,v.sku,v.model].filter(Boolean).join(" / ")).join("、"));
  filters.push("关键词："+terms.join("、"));
  filters.push("数据源："+selectedSourceIds.length+" 个");
  filters.push("市场："+selectedMarkets.map(code=>markets.find(m=>m.code===code)?.name||code).join("、"),"时间："+({"30d":"近30天","90d":"近90天","12m":"近12个月","5y":"近5年"} as Record<string,string>)[period]);
  setTask({title:selectedProduct?.name||terms[0],filters});
  setAnalyzed(true);setActiveTab("overview");setError("");setCurrentTaskId(null);setLiveEvidence([]);setLiveTrendResults([]);setLiveTrendMeta(null);
  setCollecting(true);
  try{
   const analysisSnapshot={title:selectedProduct?.name||terms[0],product_id:selectedProduct?.id||null,product_name:selectedProduct?.name||null,product_snapshot:selectedProduct,selected_values:selectedValues,selected_variants:selectedVariants,target_languages:targetLanguages,translations,analysis_type:selectedProduct?"product":"keyword"};
   const {data:created,error:createError}=await supabase.functions.invoke("global-intelligence",{body:{action:"create_task",organization_id:organizationId,source_ids:selectedSourceIds,keywords:terms,markets:selectedMarkets,period,product_id:selectedProduct?.id||null,analysis_snapshot:analysisSnapshot}});
   if(createError)throw createError;if(created?.error)throw new Error(created.error);
   const taskId=String(created.task_id||"");if(!taskId)throw new Error("服务端未返回全球情报任务编号。");
   setCurrentTaskId(taskId);
   const sources=(created.sources||[]) as Array<{id:string;slug:string;name:string;channel:string}>;
   setSourceRuns(sources.map(source=>({...source,status:"queued",result_count:0})));
   const collectOne=async(source:{id:string;slug:string;name:string;channel:string})=>{
    setSourceRuns(current=>current.map(row=>row.id===source.id?{...row,status:"running"}:row));
    const {data,error:sourceError}=await supabase.functions.invoke("global-intelligence",{body:{action:"collect_source",organization_id:organizationId,task_id:taskId,source_id:source.id}});
    if(sourceError||data?.error){const message=sourceError?.message||data?.error||"采集失败";setSourceRuns(current=>current.map(row=>row.id===source.id?{...row,status:"failed",error_message:message}:row));return;}
    setSourceRuns(current=>current.map(row=>row.id===source.id?{...row,...data}:row));
   };
   for(let i=0;i<sources.length;i+=2)await Promise.all(sources.slice(i,i+2).map(collectOne));
   const {data:finished,error:finishError}=await supabase.functions.invoke("global-intelligence",{body:{action:"finish_task",organization_id:organizationId,task_id:taskId}});
   if(finishError)throw finishError;if(finished?.error)throw new Error(finished.error);
   const {data:history,error:historyError}=await supabase.functions.invoke("global-intelligence",{body:{action:"get_history",organization_id:organizationId,task_id:taskId}});
   if(historyError)throw historyError;if(history?.error)throw new Error(history.error);
   const evidence=history.evidence||[];
   setLiveEvidence(evidence);setSourceRuns(history.sources||finished.sources||[]);
   const trendResults=evidence.filter((row:any)=>row.evidence_kind==="search_trend").map((row:any)=>({...row.raw_payload,keyword:row.raw_payload?.keyword||row.title,geo:row.raw_payload?.geo||row.market_code||"WORLDWIDE",time_range:row.raw_payload?.time_range||period,interest_over_time:row.raw_payload?.interest_over_time||row.metrics?.interest_over_time||[],interest_by_region:row.raw_payload?.interest_by_region||row.metrics?.interest_by_region||[],related_queries:row.raw_payload?.related_queries||row.metrics?.related_queries||{},related_topics:row.raw_payload?.related_topics||row.metrics?.related_topics||[]}));
   setLiveTrendResults(trendResults);
   setLiveTrendMeta({status:finished.status,result_count:evidence.length,markets:selectedMarkets,task_id:taskId,source_runs:history.sources||[],history:false});
   if(!evidence.length)setError("采集任务已结束，但没有返回可用于分析的真实证据。请查看各数据源状态和错误信息。");
   const {data:historyRows}=await supabase.functions.invoke("global-intelligence",{body:{action:"list_history",organization_id:organizationId}});
   setTrendHistory(historyRows?.history||[]);
  }catch(e){const message=e instanceof Error?e.message:"全球情报采集失败，请检查数据源连接。";setError(message);setLiveTrendMeta({status:"failed",error:message,result_count:0});}
  finally{setCollecting(false);}
 };
 const openHistory=async(row:any)=>{
  if(!organizationId)return;
  setHistoryView(true);setError("");setCollecting(false);setLoading(true);
  try{
   const {data:history,error:historyError}=await supabase.functions.invoke("global-intelligence",{body:{action:"get_history",organization_id:organizationId,task_id:row.id}});
   if(historyError)throw historyError;if(history?.error)throw new Error(history.error);
   const taskRow=history.task||row,snapshot=taskRow.input_snapshot||{};
   const productTargetId=snapshot.product_id||products.find(p=>p.name===(snapshot.product_name||snapshot.product_snapshot?.name))?.id||"";
   const restore={...snapshot,product_id:productTargetId};pendingHistorySnapshot.current=productTargetId?restore:null;setProductId(productTargetId);
   if(productTargetId===productId){if(snapshot.selected_values)setSelectedValues(snapshot.selected_values);if(snapshot.selected_variants)setSelectedVariants(snapshot.selected_variants);pendingHistorySnapshot.current=null;}
   const terms=Array.isArray(snapshot.keywords)?snapshot.keywords:[];setKeywords(terms.join(", "));
   const marketsFromHistory=Array.isArray(snapshot.markets)?snapshot.markets:[];setSelectedMarkets(marketsFromHistory);setPeriod(snapshot.period||"12m");
   setSelectedSourceIds(snapshot.selected_source_ids||[]);setTargetLanguages(snapshot.target_languages||[]);setTranslations(snapshot.translations||{});
   const filters:string[]=[];if(snapshot.product_name)filters.push(snapshot.product_name);if(terms.length)filters.push("关键词："+terms.join("、"));if(marketsFromHistory.length)filters.push("市场："+marketsFromHistory.map((code:string)=>markets.find(m=>m.code===code)?.name||code).join("、"));if(snapshot.period)filters.push("时间："+snapshot.period);if(snapshot.selected_source_slugs?.length)filters.push("数据源："+snapshot.selected_source_slugs.join("、"));
   setTask({title:taskRow.title||snapshot.product_name||terms[0]||"历史分析任务",filters});
   setCurrentTaskId(taskRow.id);setLiveEvidence(history.evidence||[]);setSourceRuns(history.sources||[]);
   const evidence=history.evidence||[];
   setLiveTrendResults(evidence.filter((item:any)=>item.evidence_kind==="search_trend").map((item:any)=>({...item.raw_payload,keyword:item.raw_payload?.keyword||item.title,geo:item.raw_payload?.geo||item.market_code||"WORLDWIDE",time_range:item.raw_payload?.time_range||snapshot.period||"12m",interest_over_time:item.raw_payload?.interest_over_time||item.metrics?.interest_over_time||[],interest_by_region:item.raw_payload?.interest_by_region||item.metrics?.interest_by_region||[],related_queries:item.raw_payload?.related_queries||item.metrics?.related_queries||{},related_topics:item.raw_payload?.related_topics||item.metrics?.related_topics||[]})));
   setLiveTrendMeta({status:taskRow.status,result_count:taskRow.result_count,task_id:taskRow.id,history:true,markets:marketsFromHistory,source_runs:history.sources||[]});
   setAnalyzed(true);setActiveTab("overview");
  }catch(e){setError(e instanceof Error?e.message:"读取历史情报任务失败。");}
  finally{setLoading(false);}
 };
 const login=async(e:React.FormEvent)=>{e.preventDefault();setAuthError("");const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setAuthError(error.message);};
 if(!ready)return <div className="boot-screen">正在连接全球情报中心…</div>;
 if(!session)return <form className="auth-card product-auth" onSubmit={login}><div className="eyebrow">全球情报中心</div><h2>登录企业工作区</h2><p>登录后选择产品档案，或直接输入关键词开展市场研究。</p><TextInput id="gi-login-email" type="email" labelText="邮箱" value={email} onChange={e=>setEmail(e.target.value)} required/><PasswordInput id="gi-login-password" labelText="密码" value={password} onChange={e=>setPassword(e.target.value)} required/>{authError&&<InlineNotification kind="error" lowContrast title="登录失败" subtitle={authError} hideCloseButton/>}<Button kind="primary" type="submit">登录</Button></form>;
 return <section className="global-intelligence">
  <div className="gi-history-top"><HistoryTasksAccordion history={trendHistory} onSelectHistory={openHistory}/></div>
  <section className="analysis-source">
   <div className="analysis-source-heading"><div><span className="eyebrow">01 / 分析来源</span><h2>分析对象与关键词</h2><p>选择企业产品并复用参数规格，或直接输入关键词；可使用 DeepL 生成多语言关键词。</p></div><span className="source-note">产品档案自动同步</span></div>
   <div className="source-grid"><div className="source-main">
    <label className="field-label">选择产品</label>
    <CarbonSelect value={productId} onChange={v=>{setProductId(v);resetAnalysis();}} placeholder="不选择产品，直接进行关键词分析">{products.map(p=><option key={p.id} value={p.id}>{p.name}{p.brand?" · "+p.brand:""}{p.model?" · "+p.model:""}</option>)}</CarbonSelect>
    {selectedProduct&&<div className="selected-product-summary"><div className="selected-product-mark">▣</div><div><strong>{selectedProduct.name}</strong><span>{[selectedProduct.brand,selectedProduct.model,...(selectedProduct.category_path||[])].filter(Boolean).join(" · ")||"企业产品档案"}</span></div><button type="button" className="text-action" onClick={()=>{setProductId("");resetAnalysis();}}>清除</button></div>}
    {selectedProduct&&<div className="parameter-area"><div className="parameter-heading"><div><strong>产品参数与规格</strong><span>默认选中全部已配置值，可按需取消或组合</span></div><span>{selectedCount} 个值已选</span></div>{loading?<div className="inline-loading">正在读取产品参数…</div>:attributes.length===0?<div className="inline-empty">该产品尚未配置参数，可直接分析整个产品。</div>:<div className="parameter-list">{attributes.map(a=><div className="parameter-row" key={a.id}><div className="parameter-name">{a.name}{a.unit?<small>单位：{a.unit}</small>:null}</div><div className="parameter-values">{(a.product_attribute_values||[]).map(v=><label className="parameter-chip" key={v.id}><Checkbox id={`parameter-${a.id}-${v.id}`} labelText={`${v.value_text}${v.unit||""}`} checked={(selectedValues[a.id]||[]).includes(v.id)} onChange={()=>toggleValue(a.id,v.id)}/><span>{v.value_text}{v.unit||""}</span></label>)}{!(a.product_attribute_values||[]).length&&<small className="muted">未配置参数值</small>}</div><button type="button" className="text-action" onClick={()=>selectAllValues(a.id,a.product_attribute_values||[])}>全选</button></div>)}</div>}</div>}
    {selectedProduct&&variants.length>0&&<div className="variant-selection"><div className="parameter-heading"><div><strong>SKU / 实际规格组合</strong><span>默认选中全部已建立规格，可按需筛选</span></div><span>{selectedVariants.length} / {variants.length} 个已选</span></div><div className="variant-selection-list">{variants.map(v=><label className="variant-selection-item" key={v.id}><Checkbox id={`variant-${v.id}`} labelText={`${v.title||v.model||"未命名规格"} · ${[v.sku,v.model,v.price===null?null:(v.currency||"USD")+" "+v.price].filter(Boolean).join(" · ")||"未配置 SKU 信息"}`} checked={selectedVariants.includes(v.id)} onChange={()=>{setSelectedVariants(current=>current.includes(v.id)?current.filter(x=>x!==v.id):[...current,v.id]);resetAnalysis();}}/><span><strong>{v.title||v.model||"未命名规格"}</strong><small>{[v.sku,v.model,v.price===null?null:(v.currency||"USD")+" "+v.price].filter(Boolean).join(" · ")||"未配置 SKU 信息"}</small></span></label>)}</div></div>}
    <div className="keyword-area"><label className="field-label" htmlFor="analysis-keywords">分析关键词 <span>可选，支持多个</span></label><TextArea id="analysis-keywords" labelText="分析关键词" hideLabel value={keywords} onChange={e=>{setKeywords(e.target.value);resetAnalysis();}} placeholder={"例如：GaN charger、fast charging、travel adapter\n多个关键词可用逗号或换行分隔"} rows={3}/><small>可与产品组合，用于补充竞品词、场景词、需求词或技术词。</small></div>
    <div className="translation-panel"><div className="translation-head"><div><strong>DeepL 多语言关键词</strong><span>根据所选市场推荐语言，可手动添加其他语言</span></div><Button kind="secondary" type="button" onClick={translate} disabled={translating}>{translating?"翻译中…":"DeepL 翻译"}</Button></div>
     <div className="language-chips">{targetLanguages.map(lang=><span className="language-chip" key={lang}>{languageNames[lang]||lang}<button type="button" aria-label={"移除"+lang} onClick={()=>{setTargetLanguages(current=>current.filter(x=>x!==lang));resetAnalysis();}}>×</button></span>)}</div>
     <div className="add-language-row"><CarbonSelect value={extraLanguage} onChange={setExtraLanguage}>{extraLanguages.map(lang=><option key={lang} value={lang}>{languageNames[lang]||lang}</option>)}</CarbonSelect><Button kind="secondary" type="button" onClick={()=>{setTargetLanguages(current=>current.includes(extraLanguage)?current:[...current,extraLanguage]);resetAnalysis();}}>添加语言</Button></div>
     {targetLanguages.map(lang=><div className="translation-field" key={lang}><span>{languageNames[lang]||lang}</span><TextArea id={"translation-"+lang} labelText={languageNames[lang]||lang} hideLabel rows={2} value={translations[lang]||""} onChange={e=>{setTranslations(current=>({...current,[lang]:e.target.value}));resetAnalysis();}} placeholder="翻译结果将在这里显示，也可以手动编辑"/></div>)}
     {translationStatus&&<div className="translation-status">{translationStatus}</div>}<small className="translation-footnote">DeepL 密钥仅在服务端使用。启用前需在 Cloudflare Pages 项目中配置 DEEPL_AUTH_KEY Secret。</small>
    </div>
   </div><aside className="source-options"><div className="field-label">分析时间范围</div><label>时间范围<CarbonSelect value={period} onChange={v=>{setPeriod(v);resetAnalysis();}}><option value="30d">近 30 天</option><option value="90d">近 90 天</option><option value="12m">近 12 个月</option><option value="5y">近 5 年</option></CarbonSelect></label><div className="source-option-foot"><span>分析对象</span><strong>{selectedProduct?"产品档案"+(keywordList.length?" + 关键词":""):"关键词"}</strong><span>目标市场：{selectedMarkets.length} 个国家 / 地区</span></div></aside></div>
  </section>
  <section className="market-section"><div className="analysis-source-heading"><div><span className="eyebrow">02 / 目标市场</span><h2>选择全球市场</h2><p>左侧选择国家和地区，右侧地图同步高亮；也可以直接点击地图选择市场。</p></div><span className="source-note">{selectedMarkets.length} / {markets.length} 个市场已选</span></div>
   <div className="market-layout"><div className="market-picker"><div className="market-list-heading"><strong>国家 / 地区</strong><span>{selectedMarkets.length} 个已选</span></div>
    <div className="market-search"><Search size="lg" labelText="搜索国家或地区" value={marketQuery} onChange={e=>setMarketQuery(e.target.value)} placeholder="搜索国家或地区"/></div><div className="market-actions"><button type="button" onClick={()=>setSelectedMarkets(markets.map(m=>m.code))}>全选</button><button type="button" onClick={()=>setSelectedMarkets([])}>清空</button><span>{visibleMarkets.length} 个结果</span></div><div className="market-options">{visibleMarkets.map(m=><button type="button" key={m.code} className={selectedMarkets.includes(m.code)?"market-option selected":"market-option"} aria-pressed={selectedMarkets.includes(m.code)} onClick={()=>toggleMarket(m.code)}><span className="flag-circle">{m.flag}</span><span>{m.name}</span><span className="market-check">{selectedMarkets.includes(m.code)?"✓":""}</span></button>)}{!visibleMarkets.length&&<div className="carbon-select-empty">没有匹配的国家或地区</div>}</div><div className="market-dropdown-foot">列表固定显示，可在此区域内独立滚动选择</div>
   </div><div className="market-map-panel"><div className="map-heading"><strong>全球市场分布</strong><span>OpenStreetMap · 点击国家可选择</span></div><WorldMarketMap selected={selectedMarkets} onToggle={toggleMarket}/></div></div>
  </section>
  <DataSourceSelector organizationId={organizationId} selectedMarkets={selectedMarkets} selectedSourceIds={selectedSourceIds} onChange={ids=>{setSelectedSourceIds(ids);resetAnalysis();}} onLoadDemo={()=>{setKeywords("AI 主动降噪无线耳机, ANC headphones");setSelectedMarkets(["US","JP","DE","GB"]);resetAnalysis();}}/>
  <section className="analysis-results"><div className="results-heading"><div><span className="eyebrow">04 / 情报分析结果</span><h2>多维度情报分析</h2><p>同一分析任务下切换不同维度，分析对象、关键词、语言和目标市场保持不变。</p></div>{task&&<span className="task-state"><i/>分析条件已就绪</span>}</div>
   {task&&<div className="analysis-context"><div><small>当前分析对象</small><strong>{task.title}</strong></div><div className="context-filters">{task.filters.map((f,i)=><span key={i}>{f}</span>)}</div></div>}
   {sourceRuns.length>0&&<div className="gi-source-run-list" aria-live="polite">{sourceRuns.map((source:any)=><div className="gi-source-run-item" key={source.id||source.source_id}><div><strong>{source.name||source.source_slug}</strong><small>{source.error_message||((source.result_count??0)+" 条")}</small></div><span className={"gi-status "+(source.status==="succeeded"?"ready":source.status==="failed"?"error":source.status==="running"?"limited":"planned")}>{source.status==="succeeded"?"已完成":source.status==="failed"?"失败":source.status==="running"?"执行中":source.status==="queued"?"排队中":source.status==="partial"?"部分完成":source.status||"待处理"}</span></div>)}</div>}
   {error&&<InlineNotification kind="error" lowContrast title="分析未完成" subtitle={error} hideCloseButton/>}<div className="analysis-submit-row"><span>提交后会按所选平台启动真实采集任务，可能产生第三方 Actor 用量费用；切换下方 Tab 不会重置当前条件。</span><Button kind="primary" type="button" onClick={startAnalysis}>开始全球采集 <span aria-hidden="true">→</span></Button></div>
   <div className="intelligence-tabs"><CarbonTabs
    ariaLabel="情报分析维度"
    activeTabId={activeTab}
    onChange={setActiveTab}
    items={tabs.map(tab=>({id:tab.id,label:tab.label,content:<div className="intelligence-panel"><IntelligenceDataExperience activeTab={tab.id} analyzed={analyzed} liveMeta={liveTrendMeta} collectionLoading={collecting} evidence={liveEvidence}/></div>}))}
   /></div>
  </section>
  <AIAnalysisPanel accessToken={session?.access_token||""} context={task?.filters.join("；")||""} activeTab={activeTab} taskId={currentTaskId} organizationId={organizationId} evidenceCount={liveEvidence.length}/>
 </section>;
}
