import {useEffect,useState,type ReactNode} from "react";
import {NavLink,useLocation} from "react-router-dom";
import {Activity,ChevronDown,DataBase,Earth,Home,Menu,Search,Settings,Close,ChartLine} from "@carbon/icons-react";
import {requireSupabase} from "../lib/supabase";
import {useAuth} from "./AuthProvider";

const navigation=[
 {section:"工作台",items:[{label:"总览",to:"/dashboard",icon:Home}]},
 {section:"企业智能",items:[{label:"企业档案与 AI 分析",to:"/enterprise-workflow",icon:Activity}]},
 {section:"市场情报",items:[{label:"市场趋势情报",to:"/market-trends",icon:ChartLine},{label:"关键词研究",to:"/keyword-research",icon:Search}]},
];
export function AppShell({children}:{children:ReactNode}){
 const location=useLocation();const{workspace}=useAuth();const[sidebarOpen,setSidebarOpen]=useState(false);
 useEffect(()=>{setSidebarOpen(false);},[location.pathname]);
 useEffect(()=>{if(!sidebarOpen)return;const f=(e:KeyboardEvent)=>{if(e.key==="Escape")setSidebarOpen(false);};window.addEventListener("keydown",f);return()=>window.removeEventListener("keydown",f);},[sidebarOpen]);
 const path=location.pathname;
 const pageLabel=path==="/dashboard"?"总览":path==="/market-trends"?"市场趋势情报":path==="/keyword-research"?"关键词研究":path.startsWith("/enterprise")||path==="/ai-analysis"||path==="/analysis-results"?"企业档案与 AI 分析":path==="/settings"?"设置":"工作空间";
 return <div className="app-frame">
  <header className="topbar">
   <div className="topbar-left">
    <button className="icon-btn menu-toggle" type="button" aria-label={sidebarOpen?"关闭导航":"打开导航"} aria-expanded={sidebarOpen} onClick={()=>setSidebarOpen(v=>!v)}>{sidebarOpen?<Close size={20}/>:<Menu size={20}/>}</button>
    <NavLink to="/dashboard" className="brand" aria-label="Kosmoevretis 首页"><span className="brand-symbol">K</span><b>kosmoevretis</b></NavLink>
   </div>
   <div className="top-actions">
    <span className="workspace-indicator"><i/>{workspace?.name||"工作空间"}</span>
    <button className="profile-btn" type="button" onClick={()=>void requireSupabase().auth.signOut()} title="退出登录"><span className="avatar">↗</span><span>退出登录</span><ChevronDown size={14}/></button>
   </div>
  </header>
  {sidebarOpen&&<button className="sidebar-backdrop" type="button" aria-label="关闭导航菜单" onClick={()=>setSidebarOpen(false)}/>}
  <aside className={"sidebar"+(sidebarOpen?" sidebar-open":"")} aria-label="主导航">
   <div className="workspace"><span className="workspace-mark">K</span><span><b>{workspace?.name||"工作空间"}</b><small>组织工作空间</small></span><ChevronDown size={14}/></div>
   {navigation.map(group=><div className="nav-group" key={group.section}><div className="nav-caption">{group.section}</div><nav>{group.items.map(({label,to,icon:Icon})=><NavLink key={to} to={to} end className={({isActive})=>"nav-item"+(isActive?" active":"")}><Icon size={18}/><span>{label}</span></NavLink>)}</nav></div>)}
   <div className="sidebar-end"><div className="nav-caption">系统</div><NavLink to="/settings" className={({isActive})=>"nav-item"+(isActive?" active":"")}><Settings size={18}/><span>设置</span></NavLink><div className="sidebar-version"><i/>平台基础版本 <b>v0.2</b></div></div>
  </aside>
  <main className="main"><div className="breadcrumb"><span>工作空间</span><span>/</span><b>{pageLabel}</b></div>{children}</main>
 </div>;
}
