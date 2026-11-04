import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

type Product = { id:string; name:string; brand:string|null; model:string|null; category_path:string[]|null };
type Value = { id:string; value_text:string; unit:string|null };
type Attribute = { id:string; name:string; unit:string|null; product_attribute_values:Value[] };
type Tab = { id:string; label:string; eyebrow:string; description:string };
const tabs:Tab[] = [
  {id:"overview",label:"情报总览",eyebrow:"INTELLIGENCE OVERVIEW",description:"汇总商品热度、搜索需求、社交声量、消费者反馈与竞争态势。"},
  {id:"bestsellers",label:"全球热销榜",eyebrow:"GLOBAL BESTSELLERS",description:"跨电商平台观察热销排名、价格带、评论表现及可获得的销售动能信号。"},
  {id:"search",label:"搜索趋势",eyebrow:"SEARCH TRENDS",description:"观察 Google 搜索兴趣、地区差异、增长查询与季节性需求。"},
  {id:"social",label:"社交媒体趋势",eyebrow:"SOCIAL MOMENTUM",description:"追踪社媒内容热度、互动增长、创作者讨论与产品传播。"},
  {id:"consumer",label:"消费者洞察",eyebrow:"CONSUMER VOICE",description:"归纳评论与社区讨论中的购买动机、使用场景、痛点和未满足需求。"},
  {id:"competitors",label:"品牌与竞品",eyebrow:"BRAND & COMPETITORS",description:"比较品牌、型号、产品规格、价格定位与竞品动态。"},
  {id:"categories",label:"品类分析",eyebrow:"CATEGORY INTELLIGENCE",description:"分析细分品类规模信号、增长方向、产品结构与机会空间。"},
  {id:"markets",label:"国家市场",eyebrow:"COUNTRY MARKETS",description:"比较不同国家和地区的需求、价格、竞争与渠道特征。"}
];
const markets = ["全球","美国","英国","德国","法国","日本","韩国","中国","加拿大","澳大利亚","印度","巴西"];
const languages = [{value:"auto",label:"自动识别"},{value:"en",label:"英语"},{value:"zh",label:"中文"},{value:"ja",label:"日语"},{value:"de",label:"德语"},{value:"fr",label:"法语"},{value:"es",label:"西班牙语"}];

export default function GlobalIntelligence() {
  const [session,setSession] = useState<Session|null>(null);
  const [ready,setReady] = useState(false);
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [authError,setAuthError] = useState("");
  const [products,setProducts] = useState<Product[]>([]);
  const [productId,setProductId] = useState("");
  const [attributes,setAttributes] = useState<Attribute[]>([]);
  const [selectedValues,setSelectedValues] = useState<Record<string,string[]>>({});
  const [keywords,setKeywords] = useState("");
  const [market,setMarket] = useState("全球");
  const [language,setLanguage] = useState("auto");
  const [period,setPeriod] = useState("12m");
  const [activeTab,setActiveTab] = useState("overview");
  const [analyzed,setAnalyzed] = useState(false);
  const [task,setTask] = useState<{title:string;filters:string[];createdAt:string}|null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setReady(true);});
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!session?.user){setProducts([]);setProductId("");return;}
    (async()=>{
      const {data:member,error:memberError}=await supabase.from("organization_members").select("organization_id").eq("user_id",session.user.id).limit(1).maybeSingle();
      if(memberError)throw memberError;
      if(!member)throw new Error("当前账号尚未加入企业工作区。");
      const {data,error:productError}=await supabase.from("products").select("id,name,brand,model,category_path").eq("organization_id",member.organization_id).order("updated_at",{ascending:false});
      if(productError)throw productError;
      setProducts((data||[]) as Product[]);
    })().catch(e=>setError(e instanceof Error?e.message:"产品档案加载失败。"));
  },[session]);

  useEffect(()=>{
    if(!productId){setAttributes([]);setSelectedValues({});return;}
    (async()=>{
      setLoading(true);setError("");
      const {data,error:attributeError}=await supabase.from("product_attributes").select("id,name,unit,product_attribute_values(id,value_text,unit)").eq("product_id",productId).order("sort_order");
      if(attributeError)throw attributeError;
      const rows=(data||[]) as Attribute[];
      setAttributes(rows);
      setSelectedValues(Object.fromEntries(rows.map(a=>[a.id,(a.product_attribute_values||[]).map(v=>v.id)])));
    })().catch(e=>setError(e instanceof Error?e.message:"产品参数加载失败。")).finally(()=>setLoading(false));
  },[productId]);

  const selectedProduct=products.find(p=>p.id===productId)||null;
  const selectedCount=useMemo(()=>Object.values(selectedValues).reduce((n,values)=>n+values.length,0),[selectedValues]);
  const keywordList=useMemo(()=>keywords.split(/[\\n,，;；]+/).map(x=>x.trim()).filter(Boolean),[keywords]);
  const toggleValue=(attributeId:string,valueId:string)=>{
    setSelectedValues(current=>{
      const values=current[attributeId]||[];
      return {...current,[attributeId]:values.includes(valueId)?values.filter(x=>x!==valueId):[...values,valueId]};
    });
  };
  const selectAllValues=(attributeId:string,values:Value[])=>{
    setSelectedValues(current=>({...current,[attributeId]:values.map(v=>v.id)}));
  };
  const startAnalysis=()=>{
    if(!selectedProduct&&!keywordList.length){setError("请选择一个产品，或至少输入一个分析关键词。");return;}
    const filters:string[]=[];
    if(selectedProduct)filters.push(selectedProduct.name);
    attributes.forEach(a=>{
      const chosen=(a.product_attribute_values||[]).filter(v=>(selectedValues[a.id]||[]).includes(v.id));
      if(chosen.length)filters.push(a.name+"："+chosen.map(v=>v.value_text+(v.unit||"")).join("、"));
    });
    if(keywordList.length)filters.push("关键词："+keywordList.join("、"));
    filters.push("市场："+market,"语言："+(languages.find(x=>x.value===language)?.label||language),"时间："+({ "30d":"近30天","90d":"近90天","12m":"近12个月","5y":"近5年"} as Record<string,string>)[period]);
    setTask({title:selectedProduct?.name||keywordList[0],filters,createdAt:new Date().toLocaleString()});
    setAnalyzed(true);setActiveTab("overview");setError("");
  };
  const login=async(e:React.FormEvent)=>{
    e.preventDefault();setAuthError("");
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error)setAuthError(error.message);
  };

  if(!ready)return <div className="boot-screen">正在连接全球情报中心…</div>;
  if(!session)return <form className="auth-card product-auth" onSubmit={login}><div className="eyebrow">GLOBAL INTELLIGENCE</div><h2>登录企业工作区</h2><p>登录后选择产品档案，或直接输入关键词开展市场研究。</p><label>邮箱<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>密码<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{authError&&<div className="notice error">{authError}</div>}<button className="primary-button">登录</button></form>;

  return <section className="global-intelligence">
    <section className="analysis-source">
      <div className="analysis-source-heading"><div><span className="eyebrow">01 / ANALYSIS SOURCE</span><h2>配置分析源</h2><p>选择企业产品并复用已配置参数，也可以直接输入关键词，或组合使用。</p></div><span className="source-note">产品档案自动同步</span></div>
      <div className="source-grid">
        <div className="source-main">
          <label className="field-label" htmlFor="analysis-product">选择产品</label>
          <select id="analysis-product" className="source-select" value={productId} onChange={e=>{setProductId(e.target.value);setAnalyzed(false);}}><option value="">不选择产品，直接进行关键词分析</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}{p.brand?" · "+p.brand:""}{p.model?" · "+p.model:""}</option>)}</select>
          {selectedProduct&&<div className="selected-product-summary"><div className="selected-product-mark">▣</div><div><strong>{selectedProduct.name}</strong><span>{[selectedProduct.brand,selectedProduct.model,...(selectedProduct.category_path||[])].filter(Boolean).join(" · ")||"企业产品档案"}</span></div><button type="button" className="text-action" onClick={()=>{setProductId("");setAnalyzed(false);}}>清除</button></div>}
          {selectedProduct&&<div className="parameter-area"><div className="parameter-heading"><div><strong>产品参数与规格</strong><span>默认选中全部已配置值，可按需取消或组合</span></div><span>{selectedCount} 个值已选</span></div>
            {loading?<div className="inline-loading">正在读取产品参数…</div>:attributes.length===0?<div className="inline-empty">该产品尚未配置参数，可直接分析整个产品。</div>:<div className="parameter-list">{attributes.map(a=><div className="parameter-row" key={a.id}><div className="parameter-name">{a.name}{a.unit?<small>单位：{a.unit}</small>:null}</div><div className="parameter-values">{(a.product_attribute_values||[]).map(v=><label className="parameter-chip" key={v.id}><input type="checkbox" checked={(selectedValues[a.id]||[]).includes(v.id)} onChange={()=>toggleValue(a.id,v.id)}/><span>{v.value_text}{v.unit||""}</span></label>)}{!(a.product_attribute_values||[]).length&&<small className="muted">未配置参数值</small>}</div><button type="button" className="text-action" onClick={()=>selectAllValues(a.id,a.product_attribute_values||[])}>全选</button></div>)}</div>}
          </div>}
          <div className="keyword-area"><label className="field-label" htmlFor="analysis-keywords">添加分析关键词 <span>可选，支持多个</span></label><textarea id="analysis-keywords" value={keywords} onChange={e=>{setKeywords(e.target.value);setAnalyzed(false);}} placeholder={"例如：GaN charger、fast charging、travel adapter\\n多个关键词可用逗号或换行分隔"} rows={3}/><small>可与已选产品组合，用于补充竞品词、场景词、需求词或技术词。</small></div>
        </div>
        <aside className="source-options"><div className="field-label">市场与分析范围</div><label>目标市场<select value={market} onChange={e=>{setMarket(e.target.value);setAnalyzed(false);}}>{markets.map(x=><option key={x}>{x}</option>)}</select></label><label>分析语言<select value={language} onChange={e=>{setLanguage(e.target.value);setAnalyzed(false);}}>{languages.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label><label>时间范围<select value={period} onChange={e=>{setPeriod(e.target.value);setAnalyzed(false);}}><option value="30d">近 30 天</option><option value="90d">近 90 天</option><option value="12m">近 12 个月</option><option value="5y">近 5 年</option></select></label><div className="source-option-foot"><span>分析对象</span><strong>{selectedProduct?"产品档案"+(keywordList.length?" + 关键词":""):"关键词"}</strong></div></aside>
      </div>
      {error&&<div className="notice error">{error}</div>}
      <div className="analysis-submit-row"><span>分析条件会在下方所有情报维度中保持一致。</span><button className="primary-button" type="button" onClick={startAnalysis}>开始分析 <span aria-hidden="true">→</span></button></div>
    </section>

    <section className="analysis-results">
      <div className="results-heading"><div><span className="eyebrow">02 / INTELLIGENCE RESULTS</span><h2>多维度情报分析</h2><p>同一分析任务下切换不同维度，分析对象和筛选条件保持不变。</p></div>{task&&<span className="task-state"><i/>分析条件已就绪</span>}</div>
      {task&&<div className="analysis-context"><div><small>当前分析对象</small><strong>{task.title}</strong></div><div className="context-filters">{task.filters.map((f,i)=><span key={i}>{f}</span>)}</div></div>}
      <div className="intelligence-tabs" role="tablist" aria-label="情报分析维度">{tabs.map(tab=><button key={tab.id} type="button" role="tab" aria-selected={activeTab===tab.id} className={activeTab===tab.id?"intelligence-tab selected":"intelligence-tab"} onClick={()=>setActiveTab(tab.id)}>{tab.label}</button>)}</div>
      <div className="intelligence-panel" role="tabpanel"><div className="panel-title"><div><span className="eyebrow">{tabs.find(t=>t.id===activeTab)?.eyebrow}</span><h3>{tabs.find(t=>t.id===activeTab)?.label}</h3><p>{tabs.find(t=>t.id===activeTab)?.description}</p></div></div>
        {!analyzed?<div className="results-empty"><div className="results-empty-icon">⌁</div><strong>等待配置分析源</strong><p>先在上方选择产品或输入关键词，然后点击「开始分析」。所有 Tab 将共享这组分析条件。</p></div>:<div className="results-empty"><div className="results-empty-icon">◷</div><strong>分析条件已提交，等待数据引擎接入</strong><p>当前已保存本页分析上下文并支持维度切换；真实电商、搜索、社交与消费者数据采集任务尚未连接，因此不会展示虚构的热度、销量或趋势数值。</p><span className="evidence-note">数据状态：尚未采集 · 无虚构数据</span></div>}
      </div>
    </section>
  </section>;
}
