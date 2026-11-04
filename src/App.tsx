import { useState } from "react";
import ProductCenter from "./ProductCenter";

const items = [
  ["overview","情报总览","◫"],["products","产品中心","▣"],["bestsellers","全球热销榜","↗"],
  ["search","Google 趋势","⌕"],["social","社交媒体趋势","◎"],["consumer","消费者洞察","◉"],
  ["competitors","品牌与竞品","▤"],["categories","品类情报","▦"],["markets","国家市场","◇"],["sources","数据源管理","⌘"],
] as const;

export default function App() {
  const [active,setActive] = useState("overview");
  const [mobileNavOpen,setMobileNavOpen] = useState(false);
  const current = items.find(x=>x[0]===active) || items[0];
  const selectPage = (id:string) => { setActive(id); setMobileNavOpen(false); };
  return <div className="shell">
    <header className="topbar">
      <button className="mobile-menu-toggle" type="button" aria-label={mobileNavOpen?"关闭导航菜单":"打开导航菜单"} aria-expanded={mobileNavOpen} onClick={()=>setMobileNavOpen(x=>!x)}><span></span><span></span><span></span></button>
      <a className="brand" href="/"><span className="brand-mark">K</span><b>KOSMOEVRETIS</b></a>
      <span className="top-context">GLOBAL 3C MARKET INTELLIGENCE</span><span className="top-status">P0 · 全球市场情报</span>
    </header>
    {mobileNavOpen&&<button className="sidebar-backdrop" aria-label="关闭导航菜单" onClick={()=>setMobileNavOpen(false)}/>}
    <aside className={mobileNavOpen?"sidebar mobile-open":"sidebar"}>
      <div className="nav-caption">情报平台</div><div className="nav-group">
        <div className="nav-group-title"><span className="nav-group-mark">▦</span><span>全球 3C市场情报</span></div>
        <div className="nav-group-items">{items.map(item=><button key={item[0]} className={active===item[0]?"nav-item active":"nav-item"} onClick={()=>selectPage(item[0])}><span className="nav-icon">{item[2]}</span>{item[1]}</button>)}</div>
      </div><div className="sidebar-foot">P0 · 全球市场情报</div>
    </aside>
    <main className="content">
      <div className="eyebrow">GLOBAL INTELLIGENCE / P0</div>
      <div className="page-head"><div><h1>{current[1]}</h1><p>跨电商、搜索、社交媒体与消费者社区的全球 3C 市场信号。</p></div><span className="scope">● GLOBAL　全球市场</span></div>
      {active==="products"&&<ProductCenter/>}
      {active==="overview"&&<><section className="metrics">{["已接入数据源","累计市场证据","监测商品","待验证机会"].map(label=><article className="metric" key={label}><span>{label}</span><strong>0</strong><small>等待数据接入</small></article>)}</section><section className="section"><div className="section-head"><div><span className="eyebrow">PRODUCT FOUNDATION</span><h2>企业产品数据中心</h2></div><button className="secondary-button" onClick={()=>selectPage("products")}>进入产品中心 →</button></div><div className="empty"><h3>先建立企业产品档案</h3><p>每个产品拥有独立参数、规格组合、关键词和市场监测方案。所有情报模块将复用同一套产品实体。</p><button onClick={()=>selectPage("products")}>进入产品中心　→</button></div></section><section className="section"><div className="section-head"><div><span className="eyebrow">INTELLIGENCE PIPELINE</span><h2>全球情报采集网络</h2></div><small>0 / 6 信号域已启用</small></div><div className="signals">{[["电商交易与热销","商品排名、价格、评论与可获得的销量信号"],["搜索趋势","Google Trends、关键词热度与增长查询"],["社交媒体","视频、内容互动、传播速度与购买意向"],["消费者声音","评论、社区讨论、使用痛点与需求"],["品牌与竞品","新品发布、价格变化、型号与产品动作"],["行业与供应链","技术、专利、认证法规与产业信号"]].map(([title,desc],i)=><article className="signal" key={title}><span className="signal-no">0{i+1}</span><div><b>{title}</b><p>{desc}</p></div><small>待接入</small></article>)}</div></section></>}
      {active!=="overview"&&active!=="products"&&<section className="module"><span className="eyebrow">P0 MODULE</span><h2>{current[1]}</h2><p>模块入口已建立。后续将直接复用产品中心的统一产品实体、规格参数、关键词与监测配置，接入真实市场数据和可追溯证据。</p>{active==="sources"&&<p>集中配置 Apify、Google Trends、YouTube、Reddit 与电商连接器。凭证只存放在服务端安全配置中。</p>}</section>}
    </main>
  </div>;
}
