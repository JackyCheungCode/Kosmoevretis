import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Activity, ChevronDown, DataBase, Earth, Home, Menu, Search, Settings, UserAvatar, Close } from "@carbon/icons-react";

const items = [
  { label: "总览", to: "/dashboard", icon: Home },
  { label: "企业档案", to: "/enterprise-profile", icon: UserAvatar },
  { label: "市场情报", to: "/market-intelligence", icon: Earth, soon: true },
  { label: "全球发现", to: "/discovery", icon: Search, soon: true },
  { label: "商业关系网络", to: "/network", icon: DataBase, soon: true },
  { label: "AI 智能体中心", to: "/agents", icon: Activity, soon: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setSidebarOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  const pageLabel = location.pathname === "/dashboard" ? "总览" : location.pathname.startsWith("/enterprise-profile") ? "企业档案" : location.pathname === "/settings" ? "设置" : "模块";

  return (
    <div className="app-frame">
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-btn menu-toggle" type="button" aria-label={sidebarOpen ? "隐藏侧边栏" : "展开侧边栏"} aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((open) => !open)}>
            {sidebarOpen ? <Close size={20} /> : <Menu size={20} />}
          </button>
          <div className="brand"><b>kosmoevretis</b></div>
        </div>
        <div className="top-actions">
          <span className="workspace-indicator"><i /> 工作空间</span>
          <button className="profile-btn" type="button"><span className="avatar">J</span><span>工作空间</span><ChevronDown size={14} /></button>
        </div>
      </header>
      {sidebarOpen && <button className="sidebar-backdrop" type="button" aria-label="关闭侧边栏" onClick={() => setSidebarOpen(false)} />}
      <aside className={"sidebar" + (sidebarOpen ? " sidebar-open" : "")} aria-hidden={!sidebarOpen}>
        <div className="workspace"><span className="workspace-mark">K</span><span><b>全球工作空间</b><small>免费工作空间</small></span><ChevronDown size={14} /></div>
        <div className="nav-caption">工作空间</div>
        <nav>
          {items.map(({ label, to, icon: Icon, soon }) => soon
            ? <div className="nav-item disabled" key={to}><Icon size={18} /><span>{label}</span><small>即将推出</small></div>
            : <NavLink key={to} to={to} className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}><Icon size={18} /><span>{label}</span></NavLink>
          )}
        </nav>
        <div className="sidebar-end"><div className="nav-caption">系统</div><NavLink to="/settings" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}><Settings size={18} /><span>设置</span></NavLink><div className="sidebar-version"><i /> 平台基础版本 <b>v0.2</b></div></div>
      </aside>
      <main className="main"><div className="breadcrumb">工作空间 <span>/</span> <b>{pageLabel}</b></div>{children}</main>
    </div>
  );
}
