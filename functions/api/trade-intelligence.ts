const json = (data: unknown, status = 200, cache = "public, max-age=900, s-maxage=3600") => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache, "X-Content-Type-Options": "nosniff" } });
const ISO3: Record<string,string> = { US:"USA",CN:"CHN",JP:"JPN",GB:"GBR",DE:"DEU",FR:"FRA",CA:"CAN",AU:"AUS",KR:"KOR",IN:"IND",IT:"ITA",ES:"ESP",NL:"NLD",SG:"SGP",BR:"BRA",MX:"MEX",VN:"VNM",TH:"THA",ID:"IDN",MY:"MYS",PH:"PHL",TW:"TWN",HK:"HKG",AE:"ARE",SA:"SAU",TR:"TUR",PL:"POL",SE:"SWE",CH:"CHE",BE:"BEL",AT:"AUT",DK:"DNK",NO:"NOR",FI:"FIN",IE:"IRL",NZ:"NZL",ZA:"ZAF" };
const M49: Record<string,string> = { US:"842",CN:"156",JP:"392",GB:"826",DE:"276",FR:"250",CA:"124",AU:"036",KR:"410",IN:"356",IT:"380",ES:"724",NL:"528",SG:"702",BR:"076",MX:"484",VN:"704",TH:"764",ID:"360",MY:"458",PH:"608",TW:"158",HK:"344",AE:"784",SA:"682",TR:"792",PL:"616",SE:"752",CH:"756",BE:"056",AT:"040",DK:"208",NO:"578",FI:"246",IE:"372",NZ:"554",ZA:"710" };
const COUNTRY: Record<string,string> = { CN:"China",VN:"Vietnam",IN:"India",TW:"Taiwan",KR:"South Korea" };
async function getJson(url: string, timeout = 16000) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout); try { const r = await fetch(url,{signal:controller.signal,headers:{Accept:"application/json"}}); const body = await r.json().catch(()=>null); if(!r.ok) throw new Error("上游服务 HTTP "+r.status); if(body?.success===false) throw new Error(body.error||"上游数据源返回失败"); return body; } finally { clearTimeout(timer); } }
async function settled<T>(fn:()=>Promise<T>) { try { return {status:"success",data:await fn(),error:null}; } catch(e) { return {status:"unavailable",data:null,error:e instanceof Error?e.message:"请求失败"}; } }
export async function onRequestPost({request,env}: {request:Request;env:Record<string,string>}) {
 try {
  const authorization=request.headers.get("Authorization")||"";
  if(!authorization.startsWith("Bearer ")||!env.SUPABASE_URL||!env.SUPABASE_ANON_KEY) return json({error:"请先登录企业工作区。"},401,"no-store");
  const authResponse=await fetch(env.SUPABASE_URL+"/auth/v1/user",{headers:{Authorization:authorization,apikey:env.SUPABASE_ANON_KEY}});
  if(!authResponse.ok) return json({error:"登录状态已失效，请重新登录。"},401,"no-store");
  const body = await request.json() as { keywords?:string[]; hsCode?:string; markets?:string[]; originCountry?:string; destinationZip?:string; freightMode?:string; originCity?:string };
  const keywords = (body.keywords||[]).map(x=>String(x).trim()).filter(Boolean).slice(0,5);
  const hsCode = String(body.hsCode||"").replace(/[^0-9.]/g,"").trim();
  const markets = Array.from(new Set((body.markets||[]).map(x=>String(x).toUpperCase()).filter(x=>/^[A-Z]{2}$/.test(x)))).slice(0,8);
  if(!markets.length) return json({error:"请先在分析源中选择目标市场。"},400,"no-store");
  const searchTerm = hsCode || keywords[0] || "";
  const tasks: Record<string,Promise<any>> = {};
  if(markets.includes("US") && searchTerm) {
   tasks.tariff = settled(async()=>({source:"USITC HTS",url:"https://hts.usitc.gov/",query:searchTerm,items:await getJson("https://hts.usitc.gov/reststop/search?keyword="+encodeURIComponent(searchTerm))}));
  } else tasks.tariff = Promise.resolve({status:"not_applicable",data:null,error:markets.includes("US")?"请输入产品关键词或 HS 编码以查询美国 HTS。":"当前目标市场不包含美国；首期 USITC 仅覆盖美国 HTS。"});
  const iso3 = markets.map(x=>ISO3[x]).filter(Boolean);
  tasks.bready = settled(async()=>{
   const payload=await getJson("https://ddh-openapi.worldbank.org/resources/DR0094718/data?top=1000");
   const rows=Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.value)?payload.value:[];
   const countryNames:Record<string,string>={US:"United States",CN:"China",JP:"Japan",GB:"United Kingdom",DE:"Germany",FR:"France",CA:"Canada",AU:"Australia",KR:"Korea",IN:"India",IT:"Italy",ES:"Spain",NL:"Netherlands",SG:"Singapore",BR:"Brazil",MX:"Mexico",VN:"Vietnam",TH:"Thailand",ID:"Indonesia",MY:"Malaysia",PH:"Philippines",TW:"Taiwan",HK:"Hong Kong"};
   const wanted=markets.map(code=>(countryNames[code]||"").toLowerCase()).filter(Boolean);
   const items=rows.filter((row:any)=>{const key=Object.keys(row||{}).find(k=>/^(economy|economy name|country|country name|economy_name)$/i.test(k));const value=key?String(row[key]).toLowerCase():"";return wanted.some(name=>value===name||value.includes(name));});
   return {items,edition:"B-READY 2024",source:"World Bank Data Catalog · Business Ready (B-READY)",note:"官方公开数据集，当前接入的是 2024 版资源；不是实时数据。若目标市场不在该版已评分经济体中，将显示无匹配记录。",resource_id:"DR0094718",dataset_url:"https://datacatalog.worldbank.org/search/dataset/0066291/business-ready-b-ready"};
  });
  tasks.trade = settled(async()=>{
   if(!hsCode) return {items:[],note:"输入 HS 编码后可查询 UN Comtrade 商品贸易数据。"};
   const code=hsCode.replace(/\./g,"").slice(0,6);
   const year=String(new Date().getUTCFullYear()-2);
   const selected=markets.filter(x=>M49[x]).slice(0,3);
   const items=[];
   for(const market of selected){
    const url=new URL("https://comtradeapi.un.org/public/v1/preview/C/A/HS");
    url.searchParams.set("reporterCode",M49[market]);url.searchParams.set("partnerCode","0");url.searchParams.set("cmdCode",code);url.searchParams.set("flowCode","M");url.searchParams.set("period",year);
    const payload=await getJson(url.toString());
    items.push({market,year,records:payload?.data||[],count:payload?.count??payload?.data?.length??0,source:"UN Comtrade Public Preview"});
   }
   return {items,note:"公共预览每次最多 500 条，且只查询最多 3 个目标市场；年度数据可能存在发布滞后。"};
  });
  tasks.ports = settled(async()=>{
   const selected=markets.slice(0,3);
   const items=[];
   for(const market of selected){
    const country=COUNTRY[market]||ISO3[market];
    if(!country) continue;
    const payload=await getJson("https://freightpulsehq.com/api/v1/port-congestion?country="+encodeURIComponent(country));
    items.push({market,country,payload:payload?.data||payload});
   }
   return {items,note:"港口拥堵来自 IMF PortWatch AIS 港口活动数据，通常滞后约 6–7 天；不是船舶等待时间。"};
  });
  const origin=String(body.originCountry||"").toUpperCase();
  if(markets.includes("US") && body.destinationZip && body.originCity && ["CN","VN","IN","TW","KR"].includes(origin)) {
   const mode=body.freightMode==="air"?"air":"ocean";
   const originCountry=COUNTRY[origin]||"";
   const url="https://freightpulsehq.com/api/v1/freight-rates?mode="+mode+"&origin_country="+encodeURIComponent(originCountry)+"&dest_zip="+encodeURIComponent(String(body.destinationZip).trim())+"&origin_city="+encodeURIComponent(String(body.originCity||"").trim());
   tasks.freight=settled(async()=>getJson(url));
  } else tasks.freight=Promise.resolve({status:"needs_input",data:null,error:markets.includes("US")?"如需查询亚洲至美国的海运/空运参考报价，请补充支持的起运国家、起运城市与美国目的邮编。当前不影响关税、贸易与营商环境分析。":"首期免费运价接口仅支持部分亚洲起运地至美国，当前市场组合暂不支持该报价查询。"});
  const keys=Object.keys(tasks);
  const results=await Promise.all(keys.map(async key=>[key,await tasks[key]] as const));
  return json({generated_at:new Date().toISOString(),markets,hs_code:hsCode||null,keywords,results:Object.fromEntries(results),sources:[{id:"usitc",name:"USITC HTS",type:"official tariff schedule",free:true},{id:"comtrade",name:"UN Comtrade Public Preview",type:"official trade statistics",free:true,limit:"500 rows/request; preview endpoints"},{id:"bready",name:"World Bank B-READY",type:"business environment indicators",free:true},{id:"freightpulse",name:"FreightPulse / IMF PortWatch",type:"port congestion and conditional spot quote",free:true,limit:"guest quota applies"}]},200,"public, max-age=300, s-maxage=900");
 } catch(e) { return json({error:e instanceof Error?e.message:"贸易分析请求失败。"},500,"no-store"); }
}
