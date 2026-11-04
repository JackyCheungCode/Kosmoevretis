import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Button, Checkbox, ComboBox, InlineNotification, NumberInput, Tag, TextInput,
  Tabs, TabList, Tab, TabPanels, TabPanel, Table, TableHead, TableRow, TableHeader, TableBody, TableCell, TableContainer,
} from "@carbon/react";
import { Search, Download } from "@carbon/icons-react";
import { supabase } from "./lib/supabase";
import { PageHeader } from "./design-system";
import "./google-maps-discovery.css";

type Row = Record<string, any>;
type Option = { id: string; label: string };
type History = { id:string; title:string; status:string; result_count:number; created_at:string; actor_id:string; error_message?:string|null; input_snapshot?:Record<string,any> };
type Log = { id:number; time:string; level:"info"|"success"|"warning"|"error"; message:string };
declare global { interface Window { maplibregl?: any } }

const countries:Option[] = [
  ["US","United States"],["CA","Canada"],["GB","United Kingdom"],["DE","Germany"],["FR","France"],["IT","Italy"],["ES","Spain"],["NL","Netherlands"],["CH","Switzerland"],["SE","Sweden"],["NO","Norway"],["DK","Denmark"],["PL","Poland"],["PT","Portugal"],["IE","Ireland"],["JP","Japan"],["KR","South Korea"],["CN","China"],["HK","Hong Kong"],["TW","Taiwan"],["SG","Singapore"],["MY","Malaysia"],["TH","Thailand"],["VN","Vietnam"],["ID","Indonesia"],["PH","Philippines"],["IN","India"],["AU","Australia"],["NZ","New Zealand"],["AE","United Arab Emirates"],["SA","Saudi Arabia"],["TR","Turkey"],["BR","Brazil"],["MX","Mexico"],["AR","Argentina"],["ZA","South Africa"]
].map(([id,label])=>({id,label}));

const cityOptions:Option[] = [
  ["Guangyuan, Sichuan, China","广元 · 四川 · 中国"],["Chengdu, Sichuan, China","成都 · 四川 · 中国"],["Mianyang, Sichuan, China","绵阳 · 四川 · 中国"],["Deyang, Sichuan, China","德阳 · 四川 · 中国"],["Nanchong, Sichuan, China","南充 · 四川 · 中国"],["Chongqing, China","重庆 · 中国"],["Beijing, China","北京 · 中国"],["Shanghai, China","上海 · 中国"],["Shenzhen, Guangdong, China","深圳 · 广东 · 中国"],["Guangzhou, Guangdong, China","广州 · 广东 · 中国"],["Hangzhou, Zhejiang, China","杭州 · 浙江 · 中国"],["Ningbo, Zhejiang, China","宁波 · 浙江 · 中国"],["Suzhou, Jiangsu, China","苏州 · 江苏 · 中国"],["Nanjing, Jiangsu, China","南京 · 江苏 · 中国"],["Wuhan, Hubei, China","武汉 · 湖北 · 中国"],["Xi'an, Shaanxi, China","西安 · 陕西 · 中国"],["Zhengzhou, Henan, China","郑州 · 河南 · 中国"],["Qingdao, Shandong, China","青岛 · 山东 · 中国"],["Xiamen, Fujian, China","厦门 · 福建 · 中国"],["Hong Kong, China","香港 · 中国"],["Taipei, Taiwan","台北 · 台湾"],["Tokyo, Japan","东京 · 日本"],["Osaka, Japan","大阪 · 日本"],["Seoul, South Korea","首尔 · 韩国"],["Singapore","新加坡"],["Kuala Lumpur, Malaysia","吉隆坡 · 马来西亚"],["Bangkok, Thailand","曼谷 · 泰国"],["Ho Chi Minh City, Vietnam","胡志明市 · 越南"],["Jakarta, Indonesia","雅加达 · 印度尼西亚"],["Manila, Philippines","马尼拉 · 菲律宾"],["Mumbai, India","孟买 · 印度"],["Delhi, India","新德里 · 印度"],["Dubai, United Arab Emirates","迪拜 · 阿联酋"],["Istanbul, Turkey","伊斯坦布尔 · 土耳其"],["London, United Kingdom","伦敦 · 英国"],["Manchester, United Kingdom","曼彻斯特 · 英国"],["Paris, France","巴黎 · 法国"],["Berlin, Germany","柏林 · 德国"],["Munich, Germany","慕尼黑 · 德国"],["Amsterdam, Netherlands","阿姆斯特丹 · 荷兰"],["Madrid, Spain","马德里 · 西班牙"],["Milan, Italy","米兰 · 意大利"],["Stockholm, Sweden","斯德哥尔摩 · 瑞典"],["New York, NY, USA","纽约 · 美国"],["Los Angeles, CA, USA","洛杉矶 · 美国"],["San Francisco, CA, USA","旧金山 · 美国"],["Seattle, WA, USA","西雅图 · 美国"],["Chicago, IL, USA","芝加哥 · 美国"],["Austin, TX, USA","奥斯汀 · 美国"],["Miami, FL, USA","迈阿密 · 美国"],["Toronto, Canada","多伦多 · 加拿大"],["Vancouver, Canada","温哥华 · 加拿大"],["Mexico City, Mexico","墨西哥城 · 墨西哥"],["São Paulo, Brazil","圣保罗 · 巴西"],["Sydney, Australia","悉尼 · 澳大利亚"],["Melbourne, Australia","墨尔本 · 澳大利亚"],["Auckland, New Zealand","奥克兰 · 新西兰"],["Johannesburg, South Africa","约翰内斯堡 · 南非"]
].map(([id,label])=>({id,label}));

const cityCountryCode=(id:string)=>{if(id.endsWith(", China"))return "CN";if(id.endsWith(", Japan"))return "JP";if(id.endsWith(", South Korea"))return "KR";if(id==="Singapore")return "SG";if(id.endsWith(", Malaysia"))return "MY";if(id.endsWith(", Thailand"))return "TH";if(id.endsWith(", Vietnam"))return "VN";if(id.endsWith(", Indonesia"))return "ID";if(id.endsWith(", Philippines"))return "PH";if(id.endsWith(", India"))return "IN";if(id.endsWith(", United Arab Emirates"))return "AE";if(id.endsWith(", Turkey"))return "TR";if(id.endsWith(", United Kingdom"))return "GB";if(id.endsWith(", France"))return "FR";if(id.endsWith(", Germany"))return "DE";if(id.endsWith(", Netherlands"))return "NL";if(id.endsWith(", Spain"))return "ES";if(id.endsWith(", Italy"))return "IT";if(id.endsWith(", Sweden"))return "SE";if(id.endsWith(", USA"))return "US";if(id.endsWith(", Canada"))return "CA";if(id.endsWith(", Mexico"))return "MX";if(id.endsWith(", Brazil"))return "BR";if(id.endsWith(", Australia"))return "AU";if(id.endsWith(", New Zealand"))return "NZ";if(id.endsWith(", South Africa"))return "ZA";if(id==="Taipei, Taiwan")return "TW";if(id==="Hong Kong, China")return "HK";return "";};

const val=(r:Row,keys:string[])=>{for(const k of keys){const v=k.split(".").reduce<any>((o,p)=>o?.[p],r as any);if(v!==undefined&&v!==null&&v!=="")return v;}return null;};
const text=(v:any)=>v==null?"—":typeof v==="object"?JSON.stringify(v):String(v);
const coords=(r:Row):[number,number]|null=>{
 const lat=Number(val(r,["location.lat","location.latitude","latitude","lat","gpsCoordinates.lat","gpsCoordinates.latitude"]));
 const lng=Number(val(r,["location.lng","location.lon","location.longitude","longitude","lng","lon","gpsCoordinates.lng","gpsCoordinates.longitude"]));
 return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?[lng,lat]:null;
};
const statusLabel=(s:string)=>s==="succeeded"?"已完成":s==="failed"?"失败":s==="partial"?"部分完成":s==="running"?"执行中":s||"未知";
const fields=[
 {key:"title",label:"企业名称",aliases:["title","name","placeName","businessName"]},
 {key:"categoryName",label:"行业类别",aliases:["categoryName","category","primaryType","types"]},
 {key:"address",label:"地址",aliases:["address","fullAddress","street"]},
 {key:"phone",label:"电话",aliases:["phone","phoneNumber","nationalPhoneNumber"]},
 {key:"website",label:"网站",aliases:["website","url","websiteUrl"]},
 {key:"totalScore",label:"评分",aliases:["totalScore","rating","stars"]},
 {key:"reviewsCount",label:"评论数",aliases:["reviewsCount","reviews_count","reviewCount"]},
 {key:"url",label:"Google Maps",aliases:["url","googleMapsUrl","placeUrl"]},
];
function cellValue(row:Row,key:string){const f=fields.find(x=>x.key===key);return val(row,f?.aliases||[key]);}
function ResultsTable({rows,onSelect}:{rows:Row[];onSelect:(row:Row,index:number)=>void}) {
 if(!rows.length)return <div className="gm-empty">暂无企业结果。配置关键词和地区后开始采集。</div>;
 return <TableContainer className="gm-table" title="Google Maps 商家结果">
  <Table size="lg" useZebraStyles>
   <TableHead><TableRow>{fields.map(f=><TableHeader key={f.key}>{f.label}</TableHeader>)}</TableRow></TableHead>
   <TableBody>{rows.map((r,i)=><TableRow key={String(r.placeId||r.place_id||r.url||i)+"-"+i}>{fields.map(f=>{const v=cellValue(r,f.key);const href=f.key==="website"?val(r,["website","websiteUrl"]):f.key==="url"?val(r,["url","googleMapsUrl","placeUrl"]):null;return <TableCell key={f.key}>{f.key==="title"?<button type="button" className="gm-customer-link" onClick={()=>onSelect(r,i)}>{text(v)}</button>:href?<a className="gm-link" href={String(href)} target="_blank" rel="noreferrer">{text(v)}</a>:<span title={text(v)}>{text(v)}</span>}</TableCell>;})}</TableRow>)}</TableBody>
  </Table>
 </TableContainer>;
}
export default function GoogleMapsDiscovery(){
 const [session,setSession]=useState<any>(null),[ready,setReady]=useState(false),[org,setOrg]=useState(""),[orgName,setOrgName]=useState("");
 const [terms,setTerms]=useState("electronics distributor"),[country,setCountry]=useState<Option|null>(null),[city,setCity]=useState(""),[selectedCustomerId,setSelectedCustomerId]=useState(""),[limit,setLimit]=useState(30),[language,setLanguage]=useState<Option>({id:"en",label:"English"});
 const [details,setDetails]=useState(false),[contacts,setContacts]=useState(false),[skipClosed,setSkipClosed]=useState(true);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[rows,setRows]=useState<Row[]>([]),[history,setHistory]=useState<History[]>([]),[historyId,setHistoryId]=useState(""),[activeTab,setActiveTab]=useState(0),[logs,setLogs]=useState<Log[]>([]);
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[authError,setAuthError]=useState("");
 const mapNode=useRef<HTMLDivElement|null>(null),mapRef=useRef<any>(null),mapLoaded=useRef(false);
 const addLog=(message:string,level:Log["level"]="info")=>setLogs(old=>[...old,{id:Date.now()+Math.random(),time:new Date().toLocaleTimeString(),level,message}].slice(-150));
 const termsList=useMemo(()=>terms.split(/[\n,，;；]+/).map(x=>x.trim()).filter(Boolean),[terms]);
 const located=useMemo(()=>rows.filter(r=>coords(r)),[rows]);
 const websites=useMemo(()=>rows.filter(r=>val(r,["website","websiteUrl"])).length,[rows]);
 const phones=useMemo(()=>rows.filter(r=>val(r,["phone","phoneNumber","nationalPhoneNumber"])).length,[rows]);
 const avgRating=useMemo(()=>{const a=rows.map(r=>val(r,["totalScore","rating","stars"])).filter(v=>v!==null).map(Number).filter(Number.isFinite);return a.length?(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1):"—";},[rows]);
 useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setSession(data.session);setReady(true);}});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);setReady(true);});return()=>{alive=false;subscription.unsubscribe();};},[]);
 useEffect(()=>{if(!session?.user){setOrg("");return;}(async()=>{const {data:m,error:me}=await supabase.from("organization_members").select("organization_id").eq("user_id",session.user.id).limit(1).maybeSingle();if(me)throw me;if(!m)throw new Error("当前账号尚未加入企业工作区。");const {data:o,error:oe}=await supabase.from("organizations").select("id,name").eq("id",m.organization_id).single();if(oe)throw oe;setOrg(o.id);setOrgName(o.name);})().catch(e=>setError(e instanceof Error?e.message:"无法读取企业工作区。"));},[session]);
 const loadHistory=async(id:string)=>{const {data,error:e}=await supabase.functions.invoke("google-maps-discovery",{body:{action:"list_history",organization_id:id}});if(e)throw e;if(data?.error)throw new Error(data.error);setHistory(data.history||[]);};
 useEffect(()=>{if(org)void loadHistory(org).catch(e=>setError(e instanceof Error?e.message:"无法读取历史任务。"));},[org]);
 useEffect(()=>{
  let cancelled=false;
  const ensure=async()=>{
   if(!window.maplibregl){
    if(!document.querySelector('link[data-maplibre="true"]')){const link=document.createElement("link");link.rel="stylesheet";link.href="https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.css";link.dataset.maplibre="true";document.head.appendChild(link);}
    await new Promise<void>((resolve,reject)=>{const existing=document.querySelector('script[data-maplibre="true"]') as HTMLScriptElement|null;if(existing){if(window.maplibregl){resolve();return;}existing.addEventListener("load",()=>resolve(),{once:true});existing.addEventListener("error",()=>reject(new Error("地图引擎加载失败。")),{once:true});return;}const script=document.createElement("script");script.src="https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.js";script.dataset.maplibre="true";script.onload=()=>resolve();script.onerror=()=>reject(new Error("地图引擎加载失败。"));document.head.appendChild(script);});
   }
   if(cancelled||!mapNode.current||!window.maplibregl||mapRef.current)return;
   const map=new window.maplibregl.Map({container:mapNode.current,style:"https://tiles.openfreemap.org/styles/positron",center:[105.8896,32.6424],zoom:10.2,attributionControl:true});
   map.addControl(new window.maplibregl.NavigationControl({showCompass:true}),"top-right");
   map.on("load",()=>{
    if(cancelled)return;
    map.addSource("businesses",{type:"geojson",data:{type:"FeatureCollection",features:[]},cluster:true,clusterRadius:48,clusterMaxZoom:13});
    map.addLayer({id:"business-clusters",type:"circle",source:"businesses",filter:["has","point_count"],paint:{"circle-color":"#0f62fe","circle-radius":["step",["get","point_count"],18,20,24,80,31],"circle-opacity":0.84,"circle-stroke-width":2,"circle-stroke-color":"#ffffff"}});
    map.addLayer({id:"business-cluster-count",type:"symbol",source:"businesses",filter:["has","point_count"],layout:{"text-field":["get","point_count_abbreviated"],"text-size":12},paint:{"text-color":"#ffffff"}});
    map.addLayer({id:"business-point",type:"circle",source:"businesses",filter:["!",["has","point_count"]],paint:{"circle-color":["case",["boolean",["get","selected"],false],"#0f62fe","#24a148"],"circle-radius":["case",["boolean",["get","selected"],false],11,7],"circle-stroke-width":2,"circle-stroke-color":"#ffffff"}});
    map.on("click","business-clusters",(e:any)=>{const features=map.queryRenderedFeatures(e.point,{layers:["business-clusters"]});const id=features[0]?.properties?.cluster_id;if(id!==undefined)map.getSource("businesses").getClusterExpansionZoom(id,(err:any,zoom:number)=>{if(!err)map.easeTo({center:features[0].geometry.coordinates,zoom});});});
    map.on("click","business-point",(e:any)=>{const f=e.features?.[0];if(!f)return;const p=f.properties||{};const node=document.createElement("div");node.className="gm-map-popup";const name=document.createElement("strong");name.textContent=String(p.name||"未命名商家");const address=document.createElement("span");address.textContent=String(p.address||"");node.append(name,address);new window.maplibregl.Popup({offset:12,maxWidth:"260px"}).setLngLat(e.lngLat).setDOMContent(node).addTo(map);});
    map.on("mouseenter","business-clusters",()=>map.getCanvas().style.cursor="pointer");map.on("mouseleave","business-clusters",()=>map.getCanvas().style.cursor="");map.on("mouseenter","business-point",()=>map.getCanvas().style.cursor="pointer");map.on("mouseleave","business-point",()=>map.getCanvas().style.cursor="");
    mapLoaded.current=true;
    const features=rows.map((r,i)=>{const c=coords(r);if(!c)return null;return {type:"Feature",geometry:{type:"Point",coordinates:c},properties:{id:String(r.placeId||r.place_id||r.cid||r.url||i),name:String(val(r,["title","name","placeName"])||"未命名商家"),address:String(val(r,["address","fullAddress"])||""),selected:String(r.placeId||r.place_id||r.cid||r.url||i)===selectedCustomerId}};}).filter(Boolean);
    (map.getSource("businesses") as any).setData({type:"FeatureCollection",features});
   });
   mapRef.current=map;
  };
  ensure().catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:"地图初始化失败。");});
  return()=>{cancelled=true;};
 },[]);
 useEffect(()=>{const map=mapRef.current;if(!map||!mapLoaded.current)return;const features=rows.map((r,i)=>{const c=coords(r);if(!c)return null;return {type:"Feature",geometry:{type:"Point",coordinates:c},properties:{id:String(r.placeId||r.place_id||r.cid||r.url||i),name:String(val(r,["title","name","placeName"])||"未命名商家"),address:String(val(r,["address","fullAddress"])||""),selected:String(r.placeId||r.place_id||r.cid||r.url||i)===selectedCustomerId}};}).filter(Boolean);const source=map.getSource("businesses");if(source)source.setData({type:"FeatureCollection",features});if(features.length){const bounds=new window.maplibregl.LngLatBounds();features.forEach((f:any)=>bounds.extend(f.geometry.coordinates));map.fitBounds(bounds,{padding:60,maxZoom:12,duration:700});}},[rows]);
 useEffect(()=>{const map=mapRef.current;if(!map||!mapLoaded.current)return;const features=rows.map((r,i)=>{const c=coords(r);if(!c)return null;return {type:"Feature",geometry:{type:"Point",coordinates:c},properties:{id:String(r.placeId||r.place_id||r.cid||r.url||i),name:String(val(r,["title","name","placeName"])||"未命名商家"),address:String(val(r,["address","fullAddress"])||""),selected:String(r.placeId||r.place_id||r.cid||r.url||i)===selectedCustomerId}};}).filter(Boolean);const source=map.getSource("businesses");if(source)source.setData({type:"FeatureCollection",features});},[selectedCustomerId]);
 useEffect(()=>()=>{mapRef.current?.remove();mapRef.current=null;},[]);
 const focusCustomer=(row:Row,index:number)=>{const point=coords(row);if(!point){setNotice("该企业没有返回有效经纬度，无法在地图上定位。");return;}const id=String(row.placeId||row.place_id||row.cid||row.url||index);setSelectedCustomerId(id);setNotice("地图已定位到："+String(val(row,["title","name","placeName"])||"所选企业"));const map=mapRef.current;if(map&&mapLoaded.current){map.flyTo({center:point,zoom:15,speed:1.2,curve:1.4});const node=document.createElement("div");node.className="gm-map-popup";const name=document.createElement("strong");name.textContent=String(val(row,["title","name","placeName"])||"未命名商家");const address=document.createElement("span");address.textContent=String(val(row,["address","fullAddress"])||"");node.append(name,address);new window.maplibregl.Popup({offset:12,maxWidth:"260px"}).setLngLat(point).setDOMContent(node).addTo(map);}};
 const run=async()=>{
  setError("");setNotice("");setHistoryId("");
  if(!termsList.length){setError("请至少输入一个搜索关键词。");return;}
  if(!org){setError("当前账号没有可用的企业工作区。");return;}
  setBusy(true);setRows([]);setSelectedCustomerId("");setActiveTab(0);setLogs([]);
  addLog("已创建 Google Maps 发现请求。");addLog("正在校验登录状态、组织权限与 Apify 连接。");addLog("Actor：compass/crawler-google-places");
  const selectedCity=cityOptions.find(x=>x.id===city)||null;
  if(city&&(!country||!selectedCity||cityCountryCode(selectedCity.id)!==country.id)){setError("所选城市与国家 / 地区不匹配，请重新选择。");return;}
  const locationQuery=[city.trim(),country?.label||""].filter(Boolean).join(", ");
  try{
   const {data,error:e}=await supabase.functions.invoke("google-maps-discovery",{body:{action:"collect",organization_id:org,search_terms:termsList,location_query:locationQuery,country_code:country?.id||"",city:city.trim(),max_results:limit,language:language.id,scrape_details:details,scrape_contacts:contacts,skip_closed:skipClosed}});
   if(e)throw e;if(data?.error)throw new Error(data.error);
   setRows(data.results||[]);addLog("Actor 已完成，Dataset 已读取。","success");
   for(const a of data.actor_meta?.actors||[]){addLog("完成 "+a.actor_id+" · "+a.status+" · Dataset "+a.dataset_id,"success");if(a.run_log){addLog("Apify Run 原始日志："+a.actor_id);String(a.run_log).split(/\r?\n/).filter(Boolean).slice(-100).forEach((line:string)=>addLog(line));}}
   addLog("已保存 "+(data.result_count||0)+" 条结果。","success");setNotice("发现任务完成，共返回 "+(data.result_count||0)+" 家商家。");await loadHistory(org);
  }catch(e){let msg=e instanceof Error?e.message:"Google Maps 发现任务失败。";const context=(e as any)?.context;if(context&&typeof context.json==="function"){try{const payload=await context.json();if(payload?.error)msg=String(payload.error);}catch{}}setError(msg);addLog("任务失败："+msg,"error");}
  finally{setBusy(false);}
 };
 const openHistory=async(h:History)=>{setBusy(true);setError("");setNotice("");setHistoryId(h.id);setLogs([]);addLog("正在载入历史任务 "+h.id);try{const {data,error:e}=await supabase.functions.invoke("google-maps-discovery",{body:{action:"get_history",organization_id:org,task_id:h.id}});if(e)throw e;if(data?.error)throw new Error(data.error);const x=data.history;setRows(x.raw_items||[]);setSelectedCustomerId("");for(const a of x.actor_meta?.actors||[]){addLog("历史 Actor："+a.actor_id+" · Run "+a.run_id,"success");if(a.run_log)String(a.run_log).split(/\r?\n/).filter(Boolean).slice(-100).forEach((line:string)=>addLog(line));}const s=x.input_snapshot||{};setTerms((s.search_terms||[]).join("\n"));setCity(s.city||"");setCountry(countries.find(c=>c.id===s.country_code)||null);setLimit(s.max_results||30);setNotice("已载入历史任务结果。");addLog("历史数据读取完成。","success");}catch(e){const msg=e instanceof Error?e.message:"读取历史任务失败。";setError(msg);addLog(msg,"error");}finally{setBusy(false);}};
 const login=async(e:FormEvent)=>{e.preventDefault();setAuthError("");const {error:e2}=await supabase.auth.signInWithPassword({email,password});if(e2)setAuthError(e2.message);};
 const exportCsv=()=>{const headers=fields.map(f=>f.label);const lines=rows.map(r=>fields.map(f=>{const v=cellValue(r,f.key);return '"'+String(v??"").replace(/"/g,'""')+'"';}));const csv=[headers.join(","),...lines.map(x=>x.join(","))].join("\r\n");const url=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="google-maps-discovery.csv";a.click();URL.revokeObjectURL(url);};
 if(!ready)return <div className="gm-boot">正在连接 Google Maps 发现工作台…</div>;
 if(!session)return <form className="gm-login" onSubmit={login}><h2>登录企业工作区</h2><TextInput id="gm-email" labelText="邮箱" value={email} onChange={e=>setEmail(e.target.value)}/><TextInput id="gm-password" labelText="密码" type="password" value={password} onChange={e=>setPassword(e.target.value)}/>{authError&&<InlineNotification kind="error" title="登录失败" subtitle={authError} hideCloseButton/>}<Button type="submit">登录</Button></form>;
 return <section className="google-maps-discovery">
  <PageHeader title="Google Maps 企业发现" description="通过全球地图搜索企业与门店，采集公开商家档案，并将地理位置与企业结果联动展示。" actions={<Tag type="blue">{orgName||"企业工作区"}</Tag>} />
  <section className="gm-panel gm-config"><div className="gm-section-head"><div><span className="eyebrow">DISCOVERY OBJECT</span><h3>选择发现对象</h3><p>使用 Apify Google Maps Scraper，按关键词和地理范围搜索公开商家。</p></div></div>
   <div className="gm-form-grid">
    <div className="gm-field gm-wide"><TextInput id="gm-terms" labelText="搜索关键词（支持多个）" placeholder="例如：electronics distributor, computer accessories wholesaler" value={terms} onChange={e=>setTerms(e.target.value)}/><small>{termsList.length} 个关键词 · 使用逗号或换行分隔</small></div>
    <div className="gm-field"><ComboBox id="gm-country" titleText="国家 / 地区" placeholder="选择国家或地区" items={countries} itemToString={x=>x?.label||""} selectedItem={country} onChange={({selectedItem})=>{const next=selectedItem||null;setCountry(next);if(city&&(!next||cityCountryCode(city)!==next.id))setCity("");}}/></div>
    <div className="gm-field"><ComboBox id="gm-city" titleText="城市 / 地区" placeholder={country?"选择该国家 / 地区内的城市（可留空）":"请先选择国家 / 地区"} items={country?cityOptions.filter(x=>cityCountryCode(x.id)===country.id):[]} itemToString={x=>x?.label||""} selectedItem={cityOptions.find(x=>x.id===city)||null} disabled={!country} onChange={({selectedItem})=>setCity(selectedItem?.id||"")}/><small>{country?"仅显示所选国家 / 地区的城市；提交使用英文标准地名。":"先选择国家 / 地区，再选择对应城市。"}</small></div>
    <div className="gm-field"><NumberInput id="gm-limit" label="每个关键词最多商家数" min={1} max={200} value={limit} onChange={(_e,{value})=>setLimit(Number(value)||30)}/><small>最大 200；多个关键词会分别执行该数量上限。</small></div>
    <div className="gm-field"><ComboBox id="gm-language" titleText="结果语言" items={[{id:"en",label:"English"},{id:"ja",label:"日本語"},{id:"zh-CN",label:"简体中文"},{id:"zh-TW",label:"繁體中文"},{id:"de",label:"Deutsch"},{id:"fr",label:"Français"},{id:"es",label:"Español"},{id:"ko",label:"한국어"}]} itemToString={x=>x?.label||""} selectedItem={language} onChange={({selectedItem})=>setLanguage(selectedItem||{id:"en",label:"English"})}/></div>
   </div>
   <div className="gm-options"><Checkbox id="gm-skip-closed" labelText="跳过已关闭商家" checked={skipClosed} onChange={(_e,{checked})=>setSkipClosed(checked)}/><Checkbox id="gm-details" labelText="采集详细商家资料（可能产生额外费用）" checked={details} onChange={(_e,{checked})=>setDetails(checked)}/><Checkbox id="gm-contacts" labelText="从商家网站补全邮箱与社交账号（付费增强项）" checked={contacts} onChange={(_e,{checked})=>setContacts(checked)}/></div>
   <div className="gm-submit"><span>Actor 固定为 compass/crawler-google-places。Apify 按实际运行与增强项计费；默认关闭额外详情和联系人补全。</span><Button onClick={run} disabled={busy} renderIcon={Search}>{busy?"正在采集…":"开始 Google Maps 发现"}</Button></div>
   {error&&<InlineNotification kind="error" title="任务未完成" subtitle={error} onCloseButtonClick={()=>setError("")}/>}
   {notice&&<InlineNotification kind="success" title="任务状态" subtitle={notice} onCloseButtonClick={()=>setNotice("")}/>}
  </section>
  <section className="gm-overview">
   <div className="gm-kpi"><span>发现商家</span><strong>{rows.length.toLocaleString()}</strong><small>当前任务结果</small></div>
   <div className="gm-kpi"><span>包含网站</span><strong>{websites.toLocaleString()}</strong><small>可进一步补全企业信息</small></div>
   <div className="gm-kpi"><span>包含电话</span><strong>{phones.toLocaleString()}</strong><small>公开商家联系电话</small></div>
   <div className="gm-kpi"><span>平均评分</span><strong>{avgRating}</strong><small>有评分记录的商家</small></div>
  </section>
  <section className="gm-panel gm-map-panel"><div className="gm-section-head"><div><span className="eyebrow">GLOBAL BUSINESS MAP</span><h3>全球商家分布</h3><p>地图聚合 {located.length.toLocaleString()} 个具有经纬度的商家；缩放后可查看单个位置。</p></div><Tag type="gray">{located.length} 个地图点</Tag></div><div className="gm-map-layout"><div className="gm-map-canvas" ref={mapNode}/><aside className="gm-map-legend"><strong>地图图例</strong><span><i className="gm-legend-cluster"/> 商家聚合</span><span><i className="gm-legend-point"/> 单个商家</span><small>底图：OpenFreeMap · © OpenStreetMap contributors</small></aside></div></section>
  <section className="gm-panel gm-results"><div className="gm-section-head"><div><span className="eyebrow">DISCOVERY RESULTS</span><h3>商家发现结果</h3><p>原始数据保留在任务记录中，表格展示常用字段。</p></div><div className="gm-result-actions"><Tag type="blue">{rows.length.toLocaleString()} 条</Tag><Button kind="ghost" size="sm" renderIcon={Download} disabled={!rows.length} onClick={exportCsv}>导出 CSV</Button></div></div>
   <Tabs className="kosmo-results-tabs" selectedIndex={activeTab} onChange={({selectedIndex})=>setActiveTab(selectedIndex)}><TabList aria-label="Google Maps 结果分类"><Tab id="gm-tab-businesses">企业列表</Tab><Tab id="gm-tab-raw">原始数据</Tab><Tab id="gm-tab-history">历史任务</Tab></TabList>
    <TabPanels>
     <TabPanel><ResultsTable rows={rows} onSelect={focusCustomer}/></TabPanel>
     <TabPanel><pre className="gm-raw">{rows.length?JSON.stringify(rows,null,2):"暂无原始数据。"}</pre></TabPanel>
     <TabPanel><div className="gm-history">{history.length?history.map(h=><button key={h.id} className={historyId===h.id?"gm-history-item active":"gm-history-item"} onClick={()=>openHistory(h)} disabled={busy}><span><strong>{h.title}</strong><small>{new Date(h.created_at).toLocaleString()} · {h.result_count} 条 · {statusLabel(h.status)}</small></span><span>{statusLabel(h.status)}　›</span></button>):<div className="gm-empty">暂无历史任务。</div>}</div></TabPanel>
    </TabPanels>
   </Tabs>
  </section>
  <section className="gm-panel gm-logs"><div className="gm-section-head"><div><span className="eyebrow">RUN ACTIVITY</span><h3>采集日志</h3><p>显示页面阶段事件与 Apify Run 原始日志；原始日志仅在 Actor 运行结束后读取。</p></div><div className="gm-log-tools"><Tag type={busy?"blue":"gray"}>{busy?"执行中":"空闲"}</Tag><Button kind="ghost" size="sm" onClick={()=>setLogs([])}>清空日志</Button></div></div><div className="gm-console" aria-live="polite">{logs.length?logs.map(l=><div className={"gm-log "+l.level} key={l.id}><time>{l.time}</time><i/><span>{l.message}</span></div>):<div className="gm-log-empty">等待任务事件。开始采集后将在此处显示执行日志。</div>}</div></section>
  <div className="gm-footnote">数据来源：Google Maps 公开商家信息 · 采集器：Apify compass/crawler-google-places · 地图底图：OpenFreeMap / OpenStreetMap。地图点仅展示 Actor 返回且包含有效经纬度的记录。</div>
 </section>;
}
