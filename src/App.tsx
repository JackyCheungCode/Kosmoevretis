import { useState } from "react";
import ProductCenter from "./ProductCenter";
import GlobalIntelligence from "./GlobalIntelligence";

const items = [
  ["intelligence","全球情报中心","◎"],
  ["products","产品中心","▣"],
] as const;
const settingsItems = [["sources","数据源管理","⌘"]] as const;

export default function App() {
  const [active,setActive] = useState("intelligence");
  const [mobileNavOpen,setMobileNavOpen] = useState(false);
  const currentLabel = active==="products"?"产品中心":active==="sources"?"数据源管理":"全球情报中心";
  const selectPage = (id:string) => { setActive(id); setMobileNavOpen(false); };
  return <div className="shell">
    <header className="topbar">
      <button className="mobile-menu-toggle" type="button" aria-label={mobileNavOpen?"关闭导航菜单":"打开导航菜单"} aria-expanded={mobileNavOpen} onClick={()=>setMobileNavOpen(x=>!x)}><span></span><span></span><span></span></button>
      <a className="brand" href="/"><span className="brand-mark">K</span><b>KOSMOEVRETIS</b></a>
      <span className="top-context">GLOBAL INTELLIGENCE PLATFORM</span><span className="top-status">P0 · 全球市场情报</span>
    </header>
    {mobileNavOpen&&<button className="sidebar-backdrop" aria-label="关闭导航菜单" onClick={()=>setMobileNavOpen(false)}/>}
    <aside className={mobileNavOpen?"sidebar mobile-open":"sidebar"}>
      <div className="nav-caption">情报平台</div>
      <div className="nav-group">
        {items.map(item=><button key={item[0]} className={active===item[0]?"nav-item active":"nav-item"} onClick={()=>selectPage(item[0])}><span className="nav-icon">{item[2]}</span>{item[1]}</button>)}
      </div>
      <div className="nav-caption settings-caption">系统设置</div>
      <div className="nav-group settings-nav">
        {settingsItems.map(item=><button key={item[0]} className={active===item[0]?"nav-item active":"nav-item"} onClick={()=>selectPage(item[0])}><span className="nav-icon">{item[2]}</span>{item[1]}</button>)}
      </div>
      <div className="sidebar-foot">P0 · 全球市场情报</div>
    </aside>
    <main className="content">
      <div className="eyebrow">KOSMOEVRETIS / GLOBAL INTELLIGENCE</div>
      <div className="page-head"><div><h1>{currentLabel}</h1><p>{active==="intelligence"?"统一配置分析对象，在同一工作台查看全球市场多维情报。":active==="products"?"管理企业产品、参数规格、关键词与监测档案。":"配置全球市场数据采集渠道与服务连接。"}</p></div><span className="scope">● GLOBAL　全球市场</span></div>
      {active==="intelligence"&&<GlobalIntelligence/>}
      {active==="products"&&<ProductCenter/>}
      {active==="sources"&&<section className="module"><span className="eyebrow">SYSTEM SETTINGS / DATA SOURCES</span><h2>数据源管理</h2><p>集中管理 Apify、Google Trends、YouTube、Reddit 与电商数据连接器。访问凭证应保存在服务端安全配置中，不在浏览器端展示。</p><div className="source-settings-note"><strong>数据源配置中心</strong><span>现有连接器配置入口将在此集中维护。当前情报工作台尚未启动真实采集任务。</span></div></section>}
    </main>
  </div>;
}
