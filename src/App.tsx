import React from "react";
import { Theme } from "@carbon/react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ProductCenter from "./ProductCenter";
import GlobalIntelligence from "./GlobalIntelligence";
import TradeAccessPage from "./TradeAccessPage";
import Settings from "./Settings";
import FacebookDiscovery from "./FacebookDiscovery";
import LinkedInDiscovery from "./LinkedInDiscovery";
import GoogleMapsDiscovery from "./GoogleMapsDiscovery";

const enterpriseItems = [["products","产品中心","▣"]] as const;
const items = [["intelligence","情报总览","◎"],["trade","贸易与市场准入","▤"]] as const;
const settingsItems = [["sources","设置中心","⌘"]] as const;
const leadItems = [["facebook","Facebook 发现","f"],["linkedin","LinkedIn 发现","in"],["google-maps","Google Maps 发现","⌖"]] as const;
const validPaths = new Set(["/intelligence","/trade-access","/leads/facebook","/leads/linkedin","/leads/google-maps","/products","/settings/providers","/settings/actors","/settings/channels","/settings/runs","/settings/ai-providers","/settings/models","/settings/routes","/settings/prompts","/settings/organization","/settings/members","/settings/locale","/settings/notifications","/settings/governance","/settings/audit","/settings/design-system"]);
function AppShell() {
 const location=useLocation(),navigate=useNavigate(),path=location.pathname.replace(/\/$/,"")||"/",isSettings=path.startsWith("/settings/");
 const [mobileNavOpen,setMobileNavOpen]=React.useState(false);
 if(!validPaths.has(path))return <Navigate to="/intelligence" replace/>;
 const active=isSettings?"sources":path==="/products"?"products":path==="/trade-access"?"trade":path.startsWith("/leads/")?"leads":"intelligence";
 const currentLabel=active==="products"?"产品中心":active==="sources"?"设置中心":active==="trade"?"贸易与市场准入":active==="leads"?"潜在客户":"全球情报中心";
 const selectPage=(id:string)=>{navigate(id==="products"?"/products":id==="sources"?"/settings/providers":id==="trade"?"/trade-access":id==="facebook"?"/leads/facebook":id==="linkedin"?"/leads/linkedin":id==="google-maps"?"/leads/google-maps":"/intelligence");setMobileNavOpen(false);};
 return <div className="shell"><header className="topbar"><button className="mobile-menu-toggle" type="button" aria-label={mobileNavOpen?"关闭导航菜单":"打开导航菜单"} aria-expanded={mobileNavOpen} onClick={()=>setMobileNavOpen(x=>!x)}><span></span><span></span><span></span></button><a className="brand" href="/intelligence"><span className="brand-mark">K</span><b>KOSMOEVRETIS</b></a><span className="top-context">GLOBAL INTELLIGENCE PLATFORM</span><span className="top-status">P0 · 全球市场情报</span></header>
 {mobileNavOpen&&<button className="sidebar-backdrop" aria-label="关闭导航菜单" onClick={()=>setMobileNavOpen(false)}/>}
 <aside className={mobileNavOpen?"sidebar mobile-open":"sidebar"}><div className="nav-caption">企业数据</div><div className="nav-group">{enterpriseItems.map(item=><button key={item[0]} className={active===item[0]?"nav-item active":"nav-item"} onClick={()=>selectPage(item[0])}><span className="nav-icon">{item[2]}</span>{item[1]}</button>)}</div><div className="nav-caption">全球情报中心</div><div className="nav-group">{items.map(item=><button key={item[0]} className={active===item[0]?"nav-item active":"nav-item"} onClick={()=>selectPage(item[0])}><span className="nav-icon">{item[2]}</span>{item[1]}</button>)}</div><div className="nav-caption">潜在客户</div><div className="nav-group lead-nav-group">{leadItems.map(item=><button key={item[0]} className={path===(item[0]==="facebook"?"/leads/facebook":item[0]==="linkedin"?"/leads/linkedin":"/leads/google-maps")?"nav-item active":"nav-item"} onClick={()=>selectPage(item[0])}><span className="nav-icon lead-nav-icon">{item[2]}</span>{item[1]}</button>)}</div><div className="nav-caption settings-caption">系统设置</div><div className="nav-group settings-nav">{settingsItems.map(item=><button key={item[0]} className={active===item[0]?"nav-item active":"nav-item"} onClick={()=>selectPage(item[0])}><span className="nav-icon">{item[2]}</span>{item[1]}</button>)}</div><div className="sidebar-foot">P0 · 全球市场情报</div></aside>
 <main className="content"><div className="eyebrow">KOSMOEVRETIS / GLOBAL INTELLIGENCE</div><div className="page-head"><div><h1>{currentLabel}</h1><p>{active==="intelligence"?"统一配置分析对象，在同一工作台查看全球市场多维情报。":active==="products"?"统一管理产品分类、属性模板、产品模板与 SKU 变体，为全球情报、报价与合同提供统一产品主数据。":active==="trade"?"评估目标市场的关税、贸易条件、产品准入与法规合规要求。":active==="leads"?"通过不同公开渠道发现潜在客户、企业主页、内容与商业机会。":"集中管理平台 API、Apify Actor、AI 模型和系统偏好。"}</p></div><span className="scope">● GLOBAL　全球市场</span></div>
 {active==="intelligence"&&<GlobalIntelligence/>}{active==="trade"&&<TradeAccessPage/>}{active==="products"&&<ProductCenter/>}{path==="/leads/facebook"&&<FacebookDiscovery/>}{path==="/leads/linkedin"&&<LinkedInDiscovery/>}{path==="/leads/google-maps"&&<GoogleMapsDiscovery/>}{isSettings&&<Settings/>}</main></div>;
}
export default function App(){return <Theme theme="g10"><BrowserRouter><Routes><Route path="/" element={<Navigate to="/intelligence" replace/>}/><Route path="*" element={<AppShell/>}/></Routes></BrowserRouter></Theme>;}