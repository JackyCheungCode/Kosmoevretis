import { useState } from "react";
import type { ReactNode } from "react";
import "../trade-access.css";
import { Button, InlineNotification, Tag, TextInput, Dropdown, InlineLoading } from "@carbon/react";

type Props={productName:string;keywords:string[];markets:string[];hsCode:string;accessToken:string};
type Payload={generated_at:string;results:Record<string,any>;sources:any[]};
const originOptions=[{id:"CN",text:"中国"},{id:"VN",text:"越南"},{id:"IN",text:"印度"},{id:"TW",text:"中国台湾"},{id:"KR",text:"韩国"}];
const modeOptions=[{id:"ocean",text:"海运"},{id:"air",text:"空运"}];
const originCities:Record<string,string[]>={CN:["Shanghai","Shenzhen (Yantian)","Guangzhou","Qingdao","Xiamen","Tianjin"],VN:["Ho Chi Minh City"],IN:["Mumbai","Chennai"],TW:["Kaohsiung","Taipei"],KR:["Busan","Seoul (Incheon)"]};
const marketNames:Record<string,string>={US:"美国",CN:"中国大陆",JP:"日本",GB:"英国",DE:"德国",FR:"法国",CA:"加拿大",AU:"澳大利亚",KR:"韩国",IN:"印度",IT:"意大利",ES:"西班牙",NL:"荷兰",SG:"新加坡",BR:"巴西",MX:"墨西哥",VN:"越南",TH:"泰国",ID:"印度尼西亚",MY:"马来西亚",PH:"菲律宾",TW:"中国台湾",HK:"中国香港"};
const safeArray=(value:any):any[]=>Array.isArray(value)?value:Array.isArray(value?.data)?value.data:Array.isArray(value?.results)?value.results:value&&typeof value==="object"?Object.entries(value).slice(0,30).map(([key,val])=>({key,...(typeof val==="object"&&val?val as object:{value:val})})):[];

function ResultSection({title,source,status,error,children}:{title:string;source:string;status:string;error?:string|null;children:ReactNode}){
 return <section className="trade-result-section"><div className="trade-result-heading"><div><h3>{title}</h3><span>{source}</span></div><Tag type={status==="success"?"green":status==="not_applicable"||status==="needs_input"?"blue":"cool-gray"}>{status==="success"?"已获取":status==="needs_input"?"待补充条件":status==="not_applicable"?"不适用":"暂无数据"}</Tag></div>{error&&<p className="trade-muted">{error}</p>}{children}</section>;
}
function DataRows({items,kind}:{items:any[];kind:string}){
 if(!items.length)return <p className="trade-muted">该来源暂未返回可展示记录。</p>;
 if(kind==="tariff")return <div className="trade-table-wrap"><table className="trade-table"><thead><tr><th>HTS 编码</th><th>商品描述</th><th>税率 / 税则信息</th></tr></thead><tbody>{items.slice(0,30).map((r,i)=><tr key={i}><td>{r.htsno||r.hts_number||r.hts||r.number||r.key||"—"}</td><td>{r.description||r.articleDescription||r.article_description||r.value||"—"}</td><td>{r.general||r.special||r.other||r.rate||r.units||"请查看官方税则条目"}</td></tr>)}</tbody></table></div>;
 if(kind==="bready")return <div className="trade-table-wrap"><table className="trade-table"><thead><tr><th>经济体</th><th>主题 / 指标</th><th>支柱</th><th>数据值</th></tr></thead><tbody>{items.slice(0,100).map((r,i)=>{const field=(patterns:RegExp[])=>{const key=Object.keys(r||{}).find(k=>patterns.some(p=>p.test(k)));return key?r[key]:null;};const country=field([/^economy( name)?$/i,/^country( name)?$/i,/economy_name/i]);const topic=field([/topic/i,/indicator/i,/dimension/i]);const pillar=field([/pillar/i]);const value=field([/score/i,/^value$/i,/^index$/i,/rating/i]);return <tr key={i}><td>{country??"—"}</td><td>{topic??"—"}</td><td>{pillar??"—"}</td><td>{value===null||value===undefined?"—":String(value)}</td></tr>;})}</tbody></table></div>;
 if(kind==="trade")return <div className="trade-table-wrap">{items.map((group,i)=><div className="trade-country-block" key={i}><h4>{marketNames[group.market]||group.market} · {group.year}</h4>{group.records?.length?<table className="trade-table"><thead><tr><th>贸易伙伴</th><th>贸易额（美元）</th><th>净重 / 数量</th></tr></thead><tbody>{group.records.slice(0,15).map((r:any,j:number)=><tr key={j}><td>{r.partnerDesc||r.partner2Desc||r.partnerCode||"世界"}</td><td>{r.primaryValue!=null?Number(r.primaryValue).toLocaleString("en-US"):"—"}</td><td>{r.netWgt??r.qty??"—"}</td></tr>)}</tbody></table>:<p className="trade-muted">该国家该年度暂无匹配记录。</p>}</div>)}</div>;
 if(kind==="ports")return <div className="trade-port-grid">{items.flatMap((g:any)=>safeArray(g.payload?.data?.results||g.payload?.results||g.payload?.data||g.payload).map((r:any,i:number)=><article className="trade-port-card" key={g.market+"-"+i}><strong>{r.port||r.port_name||"港口"}</strong><Tag type={r.congestion==="high"?"red":r.congestion==="moderate"?"warm-gray":"green"}>{r.congestion||"状态未知"}</Tag><small>{r.country||g.country} · 更新 {r.as_of||"日期未提供"}</small><small>相对基线：{r.metrics?.ratio_vs_baseline??"—"}</small></article>))}</div>;
 return <pre className="trade-json">{JSON.stringify(items,null,2)}</pre>;
}
export default function TradeAccessAnalysis({productName,keywords,markets,hsCode,accessToken}:Props){
 const [origin,setOrigin]=useState("CN"),[originCity,setOriginCity]=useState("Shanghai"),[zip,setZip]=useState(""),[mode,setMode]=useState("ocean"),[payload,setPayload]=useState<Payload|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");\n const [complianceScope,setComplianceScope]=useState<string[]>(["customs","sanctions","export","product-safety","certification","labeling"]);\n const complianceTopics=[{id:"customs",title:"海关归类与申报",detail:"HS 归类、原产地规则、海关估价、申报资料与记录保存"},{id:"sanctions",title:"制裁与贸易限制",detail:"目标市场及交易对手限制、禁运措施、受限实体筛查"},{id:"export",title:"出口管制与两用物项",detail:"出口管制分类、最终用户 / 最终用途及许可要求"},{id:"product-safety",title:"产品安全与技术法规",detail:"目标市场强制安全要求、测试标准及责任主体"},{id:"certification",title:"认证与市场准入",detail:"适用的合格评定、认证注册、进口许可及符合性文件"},{id:"labeling",title:"标签、包装与环保义务",detail:"语言、警示标识、包装材料、回收及生产者责任"}];
 const marketLabel=markets.map(x=>marketNames[x]||x).join("、");
 const cityOptions=(originCities[origin]||[]).map(x=>({id:x,text:x}));
 const analyze=async()=>{setBusy(true);setError("");try{const response=await fetch("/api/trade-intelligence",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+accessToken},body:JSON.stringify({keywords,hsCode,markets,originCountry:origin,originCity,destinationZip:zip,freightMode:mode})});const data=await response.json();if(!response.ok)throw new Error(data.error||"贸易情报请求失败");setPayload(data);}catch(e){setError(e instanceof Error?e.message:"贸易情报请求失败");}finally{setBusy(false);}};
 const results=payload?.results||{};
 return <div className="trade-access">
  <div className="trade-access-intro"><div><span className="eyebrow">TRADE & MARKET ACCESS</span><h2>贸易与市场准入</h2><p>复用当前产品、关键词与目标市场，评估关税、贸易流向、运输环境和营商条件。</p></div><Tag type="green">免费数据源优先</Tag></div>
  <div className="trade-context"><div><small>分析对象</small><strong>{productName||keywords[0]||"当前分析对象"}</strong></div><div><small>目标市场</small><strong>{marketLabel||"尚未选择"}</strong></div><div><small>分析关键词</small><strong>{keywords.join("、")||"使用产品名称"}</strong></div></div>
  <section className="trade-compliance-panel"><div className="trade-input-heading"><h3>法规与合规核查范围</h3><span>按产品与目标市场确认适用义务</span></div><p>跨境贸易不仅涉及税率，还必须核查海关、制裁、出口管制、产品安全、认证和标签等要求。勾选需要纳入本次核查的范围：</p><div className="trade-compliance-grid">{complianceTopics.map(topic=><label className="trade-compliance-item" key={topic.id}><input type="checkbox" checked={complianceScope.includes(topic.id)} onChange={()=>setComplianceScope(current=>current.includes(topic.id)?current.filter(x=>x!==topic.id):[...current,topic.id])}/><span><strong>{topic.title}</strong><small>{topic.detail}</small></span></label>)}</div><div className="trade-compliance-notice"><strong>合规边界</strong><span>当前版本展示核查范围与可用贸易数据，不会自动认定产品“合规 / 不合规”。认证适用性、法规版本、豁免、许可及制裁筛查必须依据产品技术资料、原产地、交易方和官方现行规则逐项核验。</span></div><div className="trade-compliance-links"><a href="https://trade.ec.europa.eu/access-to-markets/en/home" target="_blank" rel="noreferrer">EU Access2Markets</a><a href="https://hts.usitc.gov/" target="_blank" rel="noreferrer">USITC HTS</a><a href="https://www.bis.gov/regulations" target="_blank" rel="noreferrer">US BIS 出口管制</a><a href="https://ofac.treasury.gov/sanctions-list-service" target="_blank" rel="noreferrer">OFAC 制裁名单</a></div></section>\n  <section className="trade-input-panel"><div className="trade-input-heading"><h3>补充贸易参数</h3><span>仅填写已有分析源未提供的信息</span></div>
   <div className="trade-input-grid"><div className="trade-hs-summary"><span>HS / HTS 编码</span><strong>{hsCode||"未填写"}</strong><small>在页面顶部分析对象区域编辑</small></div>
    <Dropdown id="trade-origin-country" titleText="运价起运国家" label="选择起运国家" items={originOptions} selectedItem={originOptions.find(x=>x.id===origin)} onChange={({selectedItem})=>{const next=selectedItem?.id||"CN";setOrigin(next);setOriginCity((originCities[next]||[])[0]||"");}}/>
    <Dropdown id="trade-origin-city" titleText="起运城市" label="选择起运城市" items={cityOptions} selectedItem={cityOptions.find(x=>x.id===originCity)} onChange={({selectedItem})=>setOriginCity(selectedItem?.id||(originCities[origin]||[])[0]||"")}/>
    <TextInput id="trade-destination-zip" labelText="美国目的邮编（可选）" placeholder="例如：90210" value={zip} onChange={e=>setZip(e.target.value)} helperText="仅在目标市场包含美国时，用于查询支持航线的参考运价。"/>
    <Dropdown id="trade-freight-mode" titleText="运输方式" label="选择运输方式" items={modeOptions} selectedItem={modeOptions.find(x=>x.id===mode)} onChange={({selectedItem})=>setMode(selectedItem?.id||"ocean")}/>
   </div>
   <div className="trade-submit-row"><span>目标市场沿用上方已选择的国家 / 地区，无需重复选择。</span><Button kind="primary" onClick={analyze} disabled={busy||!markets.length}>{busy?"正在获取数据…":"开始贸易分析"}</Button></div>
  </section>
  {error&&<InlineNotification kind="error" lowContrast title="数据获取失败" subtitle={error} hideCloseButton/>}
  {!payload&&!busy&&<div className="trade-empty">提交后将在这里展示官方税则、国际贸易统计、B-READY 指标与港口运行数据。不同来源独立返回，单一来源不可用不会阻断其他分析。</div>}
  {busy&&<InlineLoading description="正在连接免费官方数据源…" />}
  {payload&&<><div className="trade-result-meta"><span>数据生成时间：{new Date(payload.generated_at).toLocaleString("zh-CN")}</span><span>每个来源分别显示获取状态，不将估算值混同官方数据。</span></div>
   <div className="trade-results-grid">
    <ResultSection title="关税与 HTS 商品归类" source="USITC · 美国官方协调关税表" status={results.tariff?.status||"unavailable"} error={results.tariff?.error}><DataRows items={safeArray(results.tariff?.data?.items)} kind="tariff"/></ResultSection>
    <ResultSection title="国际贸易流向" source="UN Comtrade · 官方贸易统计（公共预览）" status={results.trade?.status||"unavailable"} error={results.trade?.error||results.trade?.data?.note}><DataRows items={results.trade?.data?.items||[]} kind="trade"/></ResultSection>
    <ResultSection title="营商环境与市场准入" source="World Bank Data Catalog · B-READY 2024" status={results.bready?.status||"unavailable"} error={results.bready?.error||results.bready?.data?.note}><DataRows items={results.bready?.data?.items||[]} kind="bready"/></ResultSection>
    <ResultSection title="港口拥堵与运输环境" source="FreightPulse · IMF PortWatch AIS" status={results.ports?.status||"unavailable"} error={results.ports?.error||results.ports?.data?.note}><DataRows items={results.ports?.data?.items||[]} kind="ports"/></ResultSection>
    <ResultSection title="海运 / 空运参考报价" source="FreightPulse · Warp 参考报价" status={results.freight?.status||"unavailable"} error={results.freight?.error}><DataRows items={results.freight?.data?[results.freight.data]:[]} kind="freight"/>{results.freight?.status==="success"&&<pre className="trade-json">{JSON.stringify(results.freight.data,null,2)}</pre>}</ResultSection>
   </div>
   <div className="trade-source-foot">数据来源与限制：USITC 为美国 HTS 税则查询，目前仅返回美国税则条目，尚未计算按原产国适用的附加税、优惠税率或贸易救济税；UN Comtrade 公共预览每次最多 500 条，年度数据有发布滞后；B-READY 反映制度、公共服务与效率，不等于实时运营成本；港口拥堵指标不是船舶等待时间；运价仅为可用航线的参考报价，不是承运人最终合同价格。</div>
  </>}
 </div>;
}
