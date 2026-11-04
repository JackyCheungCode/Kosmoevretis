import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import CarbonSelect from "./components/CarbonSelect";
import TradeAccessAnalysis from "./components/TradeAccessAnalysis";

type Product={id:string;name:string;brand:string|null;model:string|null;category_path:string[]|null};
const marketOptions=[
 {code:"US",name:"美国"},{code:"CA",name:"加拿大"},{code:"MX",name:"墨西哥"},{code:"GB",name:"英国"},{code:"DE",name:"德国"},{code:"FR",name:"法国"},{code:"NL",name:"荷兰"},{code:"IT",name:"意大利"},{code:"ES",name:"西班牙"},{code:"JP",name:"日本"},{code:"KR",name:"韩国"},{code:"CN",name:"中国大陆"},{code:"TW",name:"中国台湾"},{code:"HK",name:"中国香港"},{code:"AU",name:"澳大利亚"},{code:"SG",name:"新加坡"},{code:"IN",name:"印度"},{code:"BR",name:"巴西"},{code:"AE",name:"阿联酋"},{code:"CH",name:"瑞士"},{code:"SE",name:"瑞典"},{code:"PL",name:"波兰"},{code:"TH",name:"泰国"},{code:"VN",name:"越南"},{code:"MY",name:"马来西亚"},{code:"ID",name:"印度尼西亚"},{code:"PH",name:"菲律宾"},{code:"NZ",name:"新西兰"},{code:"ZA",name:"南非"},{code:"TR",name:"土耳其"}
];
export default function TradeAccessPage(){
 const [session,setSession]=useState<Session|null>(null);
 const [products,setProducts]=useState<Product[]>([]),[productId,setProductId]=useState(""),[keywords,setKeywords]=useState(""),[hsCode,setHsCode]=useState(""),[market,setMarket]=useState("US"),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session));const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));return()=>subscription.unsubscribe();},[]);
 useEffect(()=>{if(!session?.user){setLoading(false);setProducts([]);return;}let active=true;(async()=>{setLoading(true);const {data:member,error:memberError}=await supabase.from("organization_members").select("organization_id").eq("user_id",session.user.id).limit(1).maybeSingle();if(memberError)throw memberError;if(!member)throw new Error("当前账号尚未加入企业工作区。");if(!active)return;const {data,error:productError}=await supabase.from("products").select("id,name,brand,model,category_path").eq("organization_id",member.organization_id).order("updated_at",{ascending:false});if(productError)throw productError;if(active)setProducts((data||[]) as Product[]);})().catch(e=>{if(active)setError(e instanceof Error?e.message:"产品档案加载失败。");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[session]);
 const selectedProduct=products.find(p=>p.id===productId)||null;
 const terms=useMemo(()=>keywords.split(/[\n,，;；]+/).map(x=>x.trim()).filter(Boolean),[keywords]);
 const accessToken=session?.access_token||"";
 if(!session)return <div className="trade-page-auth"><h2>请先登录企业工作区</h2><p>登录后可使用企业产品档案和贸易情报数据源。</p></div>;
 return <section className="global-intelligence trade-page">
  <section className="analysis-source trade-page-source">
   <div className="analysis-source-heading trade-page-source-head"><div><span className="eyebrow">01 / TRADE ANALYSIS SCOPE</span><h2>配置贸易分析对象</h2><p>选择产品或输入关键词，并指定目标市场。此页面独立于全球情报中心运行。</p></div><span className="trade-page-badge">独立分析工作区</span></div>
   {error&&<div className="trade-page-error">{error}</div>}
   <div className="trade-page-form">
    <label>企业产品档案<CarbonSelect value={productId} onChange={setProductId} placeholder="不选择产品，直接输入关键词"><option value="">不选择产品</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}{p.brand?" · "+p.brand:""}{p.model?" · "+p.model:""}</option>)}</CarbonSelect></label>
    <label>目标市场<CarbonSelect value={market} onChange={setMarket}>{marketOptions.map(m=><option key={m.code} value={m.code}>{String.fromCodePoint(...[...m.code].map(c=>c.charCodeAt(0)+127397))} {m.name} · {m.code}</option>)}</CarbonSelect></label>
    <label className="trade-page-wide">产品 / 市场关键词<textarea rows={2} value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="例如：wireless earbuds, ANC headphones；多个关键词用逗号或换行分隔"/></label>
    <label>HS / HTS 编码（可选）<input value={hsCode} onChange={e=>setHsCode(e.target.value)} placeholder="例如：851830"/></label>
   </div>
   <p className="trade-page-help">{loading?"正在读取企业产品档案…":"产品信息来自产品中心；HS 编码可留空，系统不会将 AI 推测编码当作正式归类结果。"}</p>
  </section>
  <TradeAccessAnalysis productName={selectedProduct?.name||""} keywords={terms.length?terms:selectedProduct?[selectedProduct.name]:[]} markets={[market]} hsCode={hsCode} accessToken={accessToken}/>
 </section>;
}
