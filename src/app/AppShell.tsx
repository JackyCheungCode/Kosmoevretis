import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  ChartLine,
  ChevronDown,
  Close,
  Home,
  Menu,
  Search,
  Settings,
} from "@carbon/icons-react";
import { requireSupabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";

const navigation = [
  { section: "工作台", items: [{ label: "总览", to: "/dashboard", icon: Home }] },
  {
    section: "企业智能",
    items: [{ label: "企业档案与 AI 分析", to: "/enterprise-workflow", icon: Activity }],
  },
  {
    section: "市场情报",
    items: [
      { label: "市场趋势情报", to: "/market-trends", icon: ChartLine },
      { label: "关键词研究", to: "/keyword-research", icon: Search },
    ],
  },
  {
    section: "AI 工作中心",
    items: [{ label: "全部任务", to: "/ai-work-center", icon: Activity }],
  },
];

function getPageLabel(path: string) {
  if (path === "/dashboard") return "总览";
  if (path === "/market-trends") return "市场趋势情报";
  if (path === "/keyword-research") return "关键词研究";
  if (path.startsWith("/ai-work-center")) return "AI 工作中心";
  if (
    path.startsWith("/enterprise") ||
    path === "/ai-analysis" ||
    path === "/analysis-results"
  ) {
    return "企业档案与 AI 分析";
  }
  if (path === "/settings") return "设置";
  return "工作空间";
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { workspace } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen]);

  const workspaceName = workspace?.name || "工作空间";
  const pageLabel = getPageLabel(location.pathname);

  return (
    <div className="app-frame app-shell">
      <a className="skip-to-content" href="#main-content">
        跳转到主要内容
      </a>

      <header className="topbar app-shell__header">
        <div className="topbar-left">
          <button
            className="icon-btn menu-toggle"
            type="button"
            aria-label={sidebarOpen ? "关闭导航" : "打开导航"}
            aria-expanded={sidebarOpen}
            aria-controls="primary-navigation"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? <Close size={20} /> : <Menu size={20} />}
          </button>
          <NavLink to="/dashboard" className="brand" aria-label="Kosmoevretis 首页">
            <span className="brand-symbol">K</span>
            <b>kosmoevretis</b>
          </NavLink>
        </div>

        <div className="top-actions">
          <span className="workspace-indicator" title="当前组织工作空间">
            <i />
            {workspaceName}
          </span>
          <button
            className="profile-btn"
            type="button"
            onClick={() => void requireSupabase().auth.signOut()}
            aria-label="退出当前账户"
          >
            <span className="avatar">↗</span>
            <span>退出登录</span>
            <ChevronDown size={14} />
          </button>
        </div>
      </header>

      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="关闭导航菜单"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        id="primary-navigation"
        className={"sidebar app-shell__sidebar" + (sidebarOpen ? " sidebar-open" : "")}
        aria-label="主导航"
      >
        <div className="workspace">
          <span className="workspace-mark">K</span>
          <span>
            <b>{workspaceName}</b>
            <small>组织工作空间</small>
          </span>
          <ChevronDown size={14} />
        </div>

        {navigation.map((group) => (
          <div className="nav-group" key={group.section}>
            <div className="nav-caption">{group.section}</div>
            <nav aria-label={group.section}>
              {group.items.map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}

        <div className="sidebar-end">
          <div className="nav-caption">系统</div>
          <NavLink
            to="/settings"
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
          >
            <Settings size={18} />
            <span>设置</span>
          </NavLink>
          <div className="sidebar-version">
            <i />
            平台基础版本
            <b>v0.2</b>
          </div>
        </div>
      </aside>

      <main className="main app-shell__main" id="main-content" tabIndex={-1}>
        <div className="breadcrumb" aria-label="面包屑导航">
          <span>工作空间</span>
          <span aria-hidden="true">/</span>
          <b>{pageLabel}</b>
        </div>
        <div className="app-shell__content">{children}</div>
      </main>
    </div>
  );
}
