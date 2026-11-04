import React from "react";
import {
  Header,
  Theme,
  HeaderMenuButton,
  HeaderName,
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavMenu,
  SideNavMenuItem,
  SkipToContent,
  Button,
} from "@carbon/react";
import {
  Currency,
  Dashboard,
  Map,
  Product,
  Settings,
  LogoFacebook,
  LogoLinkedin,
  UserMultiple,
  Logout,
} from "@carbon/icons-react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ProductCenter from "./ProductCenter";
import GlobalIntelligence from "./GlobalIntelligence";
import TradeAccessPage from "./TradeAccessPage";
import SettingsPage from "./Settings";
import FacebookDiscovery from "./FacebookDiscovery";
import LinkedInDiscovery from "./LinkedInDiscovery";
import GoogleMapsDiscovery from "./GoogleMapsDiscovery";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import AuthGuard from "./auth/AuthGuard";
import LoginPage from "./auth/LoginPage";

type Viewport = "desktop" | "tablet" | "mobile";

const validPaths = new Set([
  "/intelligence", "/trade-access", "/leads/facebook", "/leads/linkedin",
  "/leads/google-maps", "/products", "/settings/providers", "/settings/actors",
  "/settings/channels", "/settings/runs", "/settings/ai-providers", "/settings/models",
  "/settings/routes", "/settings/prompts", "/settings/organization", "/settings/members",
  "/settings/locale", "/settings/notifications", "/settings/governance",
  "/settings/audit", "/settings/design-system",
]);

function AppShell() {
  const { session, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.replace(/\/$/, "") || "/";
  const isSettings = path.startsWith("/settings/");
  const [viewport, setViewport] = React.useState<Viewport>("desktop");
  const [tabletExpanded, setTabletExpanded] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 671px)");
    const tabletQuery = window.matchMedia("(min-width: 672px) and (max-width: 1055px)");
    const updateViewport = () => {
      const next: Viewport = mobileQuery.matches ? "mobile" : tabletQuery.matches ? "tablet" : "desktop";
      setViewport(next);
      setTabletExpanded(false);
      setMobileOpen(false);
    };
    updateViewport();
    mobileQuery.addEventListener("change", updateViewport);
    tabletQuery.addEventListener("change", updateViewport);
    return () => {
      mobileQuery.removeEventListener("change", updateViewport);
      tabletQuery.removeEventListener("change", updateViewport);
    };
  }, []);

  const sideNavExpanded = viewport === "desktop" || (viewport === "tablet" && tabletExpanded) || (viewport === "mobile" && mobileOpen);
  const sideNavPersistent = viewport !== "mobile";
  const closeMobileNav = React.useCallback(() => {
    setMobileOpen(false);
    document.querySelector<HTMLElement>(".kosmo-header button")?.focus();
  }, []);

  React.useEffect(() => {
    if (viewport !== "mobile" || !mobileOpen) return;
    const firstLink = document.querySelector<HTMLElement>(".kosmo-side-nav a");
    firstLink?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        document.querySelector<HTMLElement>(".kosmo-header button")?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, viewport]);

  if (!validPaths.has(path)) return <Navigate to="/intelligence" replace />;

  const currentLabel = path === "/products" ? "产品中心"
    : path === "/trade-access" ? "贸易与市场准入"
    : path.startsWith("/leads/") ? "潜在客户"
    : isSettings ? "设置中心"
    : "全球情报中心";

  const handleNavigate = (event: React.MouseEvent<HTMLAnchorElement>, destination: string) => {
    event.preventDefault();
    navigate(destination);
    if (viewport === "mobile") closeMobileNav();
  };

  const navItems = [
    { id: "products", label: "产品中心", href: "/products", icon: Product, active: path === "/products" },
    { id: "intelligence", label: "情报总览", href: "/intelligence", icon: Dashboard, active: path === "/intelligence" },
    { id: "trade", label: "贸易与市场准入", href: "/trade-access", icon: Currency, active: path === "/trade-access" },
    { id: "facebook", label: "Facebook 发现", href: "/leads/facebook", icon: LogoFacebook, active: path === "/leads/facebook" },
    { id: "linkedin", label: "LinkedIn 发现", href: "/leads/linkedin", icon: LogoLinkedin, active: path === "/leads/linkedin" },
    { id: "maps", label: "Google Maps 发现", href: "/leads/google-maps", icon: Map, active: path === "/leads/google-maps" },
    { id: "settings", label: "设置中心", href: "/settings/providers", icon: Settings, active: isSettings },
  ];

  const renderRailLink = (item: typeof navItems[number]) => (
    <SideNavLink
      key={item.id}
      href={item.href}
      title={item.label}
      aria-label={item.label}
      aria-current={item.active ? "page" : undefined}
      isActive={item.active}
      onClick={(event: React.MouseEvent<HTMLAnchorElement>) => handleNavigate(event, item.href)}
    >
      <span className="kosmo-nav-item-content"><item.icon size={16} /><span>{item.label}</span></span>
    </SideNavLink>
  );

  const renderMenuItem = (item: typeof navItems[number]) => {
    const ItemIcon = item.icon;
    return (
      <SideNavMenuItem
        key={item.id}
        href={item.href}
        aria-current={item.active ? "page" : undefined}
        isActive={item.active}
        onClick={(event: React.MouseEvent<HTMLAnchorElement>) => handleNavigate(event, item.href)}
      >
        <span className="kosmo-nav-item-content">
          <ItemIcon size={16} aria-hidden="true" />
          <span>{item.label}</span>
        </span>
      </SideNavMenuItem>
    );
  };

  return (
    <div className="shell kosmo-app-shell">
      <SkipToContent href="#main-content">跳转到主要内容</SkipToContent>
      <Header aria-label="Kosmoevretis 全球情报平台" className="kosmo-header">
        <HeaderMenuButton
          aria-label={sideNavExpanded && viewport !== "desktop" ? "收起导航菜单" : "展开导航菜单"}
          aria-controls="kosmo-primary-navigation"
          isActive={sideNavExpanded && viewport !== "desktop"}
          onClick={() => {
            if (viewport === "mobile") setMobileOpen((open) => !open);
            if (viewport === "tablet") setTabletExpanded((expanded) => !expanded);
          }}
          className="kosmo-header-menu-button"
        />
        <HeaderName href="/intelligence" onClick={(event) => handleNavigate(event, "/intelligence")}>
          KOSMOEVRETIS
        </HeaderName>
        <span className="kosmo-header-context">GLOBAL INTELLIGENCE PLATFORM</span>
        <span className="kosmo-header-user">{session?.user.email}</span>
        <Button kind="ghost" size="sm" renderIcon={Logout} onClick={() => { void signOut().catch((error) => console.error("Sign out failed:", error)); }}>退出登录</Button>
      </Header>

      <SideNav
        id="kosmo-primary-navigation"
        aria-label="主导航"
        expanded={sideNavExpanded}
        isPersistent={sideNavPersistent}
        isRail={viewport === "tablet" && !tabletExpanded}
        onOverlayClick={closeMobileNav}
        className={`kosmo-side-nav ${viewport === "tablet" && tabletExpanded ? "kosmo-side-nav-tablet-expanded" : ""}`}
      >
        <SideNavItems>
          {viewport === "tablet" && !tabletExpanded ? (
            navItems.map(renderRailLink)
          ) : (
            <>
              <SideNavMenu title="企业数据" defaultExpanded renderIcon={Product}>
                {renderMenuItem(navItems[0])}
              </SideNavMenu>
              <SideNavMenu title="全球情报中心" defaultExpanded renderIcon={Dashboard}>
                {renderMenuItem(navItems[1])}
                {renderMenuItem(navItems[2])}
              </SideNavMenu>
              <SideNavMenu title="潜在客户" defaultExpanded renderIcon={UserMultiple}>
                {renderMenuItem(navItems[3])}
                {renderMenuItem(navItems[4])}
                {renderMenuItem(navItems[5])}
              </SideNavMenu>
              <SideNavMenu title="系统设置" defaultExpanded renderIcon={Settings}>
                {renderMenuItem(navItems[6])}
              </SideNavMenu>
            </>
          )}
        </SideNavItems>
      </SideNav>

      <main id="main-content" className="content kosmo-main">
        <div className="eyebrow">KOSMOEVRETIS / GLOBAL INTELLIGENCE</div>
        <div className="page-head">
          <div>
            <h1>{currentLabel}</h1>
            <p>
              {path === "/intelligence" ? "统一配置分析对象，在同一工作台查看全球市场多维情报。"
                : path === "/products" ? "统一管理产品分类、属性模板、产品模板与 SKU 变体，为全球情报、报价与合同提供统一产品主数据。"
                : path === "/trade-access" ? "评估目标市场的关税、贸易条件、产品准入与法规合规要求。"
                : path.startsWith("/leads/") ? "通过不同公开渠道发现潜在客户、企业主页、内容与商业机会。"
                : "集中管理平台 API、Apify Actor、AI 模型和系统偏好。"}
            </p>
          </div>
          <span className="scope">● GLOBAL　全球市场</span>
        </div>
        {path === "/intelligence" && <GlobalIntelligence />}
        {path === "/trade-access" && <TradeAccessPage />}
        {path === "/products" && <ProductCenter />}
        {path === "/leads/facebook" && <FacebookDiscovery />}
        {path === "/leads/linkedin" && <LinkedInDiscovery />}
        {path === "/leads/google-maps" && <GoogleMapsDiscovery />}
        {isSettings && <SettingsPage />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Theme theme="g10">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<AuthGuard><AppShell /></AuthGuard>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </Theme>
  );
}
