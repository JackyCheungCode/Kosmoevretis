import React from "react";
import {
  Header,
  Content,
  Theme,
  HeaderMenuButton,
  HeaderName,
  Button,
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavMenu,
  SideNavMenuItem,
  SkipToContent,
} from "@carbon/react";
import {
  Currency,
  Dashboard,
  Map,
  Product,
  Settings,
  LogoFacebook,
  LogoLinkedin,
  LogoInstagram,
  LogoX,
  LogoPinterest,
  LogoYoutube,
  Forum,
  Music,
  Logout,
  DataBase,
  ShoppingCart,
  Search as SearchIcon,
  Menu,
} from "@carbon/icons-react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ProductCenter from "./ProductCenter";
import GlobalIntelligence from "./GlobalIntelligence";
import TradeAccessPage from "./TradeAccessPage";
import SettingsPage from "./Settings";
import FacebookDiscovery from "./FacebookDiscovery";
import LinkedInDiscovery from "./LinkedInDiscovery";
import InstagramDiscovery from "./pages/InstagramDiscovery";
import PlatformDataCollection from "./pages/PlatformDataCollection";
import EcommerceDiscovery, { type EcommercePlatform } from "./pages/EcommerceDiscovery";
import SeoAnalysis from "./pages/SeoAnalysis";
import GoogleMapsDiscovery from "./GoogleMapsDiscovery";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import AuthGuard from "./auth/AuthGuard";
import LoginPage from "./auth/LoginPage";
import "./social-platform-workspace.css";

type Viewport = "desktop" | "tablet" | "mobile";

const validPaths = new Set([
  "/intelligence", "/trade-access", "/social-discovery", "/social-discovery/facebook",
  "/social-discovery/instagram", "/social-discovery/linkedin", "/social-discovery/google-maps",
  "/social-discovery/x", "/social-discovery/reddit", "/social-discovery/pinterest",
  "/social-discovery/tiktok", "/social-discovery/youtube",
  "/leads/facebook", "/leads/linkedin", "/leads/google-maps", "/leads/instagram",
  "/platform-data/x", "/platform-data/reddit", "/platform-data/pinterest", "/platform-data/tiktok", "/platform-data/youtube",
  "/ecommerce-discovery", "/ecommerce-discovery/amazon", "/ecommerce-discovery/walmart", "/ecommerce-discovery/ebay",
  "/ecommerce-discovery/aliexpress", "/ecommerce-discovery/temu", "/ecommerce-discovery/etsy",
  "/ecommerce-discovery/shopify", "/ecommerce-discovery/mercado-libre", "/ecommerce-discovery/rakuten",
  "/products", "/seo-analysis", "/settings/providers", "/settings/actors", "/settings/channels", "/settings/runs",
  "/settings/ai-providers", "/settings/models", "/settings/routes", "/settings/prompts",
  "/settings/organization", "/settings/members", "/settings/locale", "/settings/notifications",
  "/settings/governance", "/settings/audit", "/settings/design-system",
]);

type SocialPlatform = "facebook" | "instagram" | "linkedin" | "google-maps" | "x" | "reddit" | "pinterest" | "tiktok" | "youtube";
type EcommercePlatformId = EcommercePlatform;
const socialPlatformItems = [
  { id: "facebook" as const, label: "Facebook", icon: LogoFacebook },
  { id: "instagram" as const, label: "Instagram", icon: LogoInstagram },
  { id: "linkedin" as const, label: "LinkedIn", icon: LogoLinkedin },
  { id: "google-maps" as const, label: "Google Maps", icon: Map },
  { id: "x" as const, label: "X", icon: LogoX },
  { id: "reddit" as const, label: "Reddit", icon: Forum },
  { id: "pinterest" as const, label: "Pinterest", icon: LogoPinterest },
  { id: "tiktok" as const, label: "TikTok", icon: Music },
  { id: "youtube" as const, label: "YouTube", icon: LogoYoutube },
];
function SocialPlatformWorkspace({ platform }: { platform: SocialPlatform }) {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const navRef = React.useRef<HTMLElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (!mobileNavOpen) return;
    navRef.current?.querySelector<HTMLButtonElement>('[aria-current="page"]')?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);
  const selectPlatform = (id: SocialPlatform) => {
    navigate("/social-discovery/" + id);
    if (mobileNavOpen) triggerRef.current?.focus();
    setMobileNavOpen(false);
  };
  const pages = {
    facebook: <FacebookDiscovery />,
    instagram: <InstagramDiscovery />,
    linkedin: <LinkedInDiscovery />,
    "google-maps": <GoogleMapsDiscovery />,
    x: <PlatformDataCollection platform="x" />,
    reddit: <PlatformDataCollection platform="reddit" />,
    pinterest: <PlatformDataCollection platform="pinterest" />,
    tiktok: <PlatformDataCollection platform="tiktok" />,
    youtube: <PlatformDataCollection platform="youtube" />,
  };
  return (
    <div className="social-platform-workspace-shell">
      <Button ref={triggerRef} className="settings-mobile-nav-trigger" kind="ghost" size="sm" renderIcon={Menu}
        aria-label="打开平台导航" aria-expanded={mobileNavOpen} aria-controls="social-platform-nav"
        onClick={() => setMobileNavOpen(open => !open)}>其他平台发现</Button>
      <div className="social-platform-workspace">
        <div className="settings-navigation-shell social-platform-navigation-shell">
          {mobileNavOpen && <button type="button" className="settings-nav-backdrop" aria-label="关闭平台导航"
            onClick={() => { setMobileNavOpen(false); triggerRef.current?.focus(); }} />}
          <nav id="social-platform-nav" ref={navRef}
            className={mobileNavOpen ? "settings-local-nav social-platform-navigation is-open" : "settings-local-nav social-platform-navigation"}
            aria-label="社媒平台发现分类" role="group"
            onTouchStart={event => { (navRef as React.RefObject<HTMLElement> & { touchX?: number }).touchX = event.touches[0]?.clientX; }}
            onTouchEnd={event => { const ref = navRef as React.RefObject<HTMLElement> & { touchX?: number }; if (ref.touchX !== undefined && event.changedTouches[0].clientX - ref.touchX > 80) { setMobileNavOpen(false); triggerRef.current?.focus(); } ref.touchX = undefined; }}>
            <div className="platform-drawer-heading">
              <strong>选择社媒平台</strong>
              <button type="button" aria-label="关闭平台导航" onClick={() => { setMobileNavOpen(false); triggerRef.current?.focus(); }}>×</button>
            </div>
            <div className="settings-nav-group">
              <div className="settings-nav-group-title">社媒平台发现</div>
              {socialPlatformItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} type="button" className="settings-nav-item social-platform-nav-item"
                    aria-current={platform === item.id ? "page" : undefined}
                    onClick={() => selectPlatform(item.id)}>
                    <Icon size={16} aria-hidden="true" /><span className="settings-nav-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
        <div className="social-platform-content">{pages[platform]}</div>
      </div>
    </div>
  );
}

const ecommercePlatformItems: { id: EcommercePlatformId; label: string; mark: string }[] = [
  { id: "amazon", label: "Amazon", mark: "a" },
  { id: "walmart", label: "Walmart", mark: "✳" },
  { id: "ebay", label: "eBay", mark: "ebay" },
  { id: "aliexpress", label: "AliExpress", mark: "A" },
  { id: "temu", label: "Temu", mark: "T" },
  { id: "etsy", label: "Etsy", mark: "E" },
  { id: "shopify", label: "Shopify", mark: "S" },
  { id: "mercado-libre", label: "Mercado Libre", mark: "M" },
  { id: "rakuten", label: "Rakuten", mark: "R" },
];

function EcommercePlatformWorkspace({ platform }: { platform: EcommercePlatformId }) {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const navRef = React.useRef<HTMLElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (!mobileNavOpen) return;
    navRef.current?.querySelector<HTMLButtonElement>('[aria-current="page"]')?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);
  const selectPlatform = (id: EcommercePlatformId) => {
    navigate("/ecommerce-discovery/" + id);
    if (mobileNavOpen) triggerRef.current?.focus();
    setMobileNavOpen(false);
  };
  return (
    <div className="social-platform-workspace-shell">
      <Button ref={triggerRef} className="settings-mobile-nav-trigger" kind="ghost" size="sm" renderIcon={Menu}
        aria-label="打开电商平台导航" aria-expanded={mobileNavOpen} aria-controls="ecommerce-platform-nav"
        onClick={() => setMobileNavOpen(open => !open)}>
        其他平台发现
      </Button>
      <div className="social-platform-workspace">
        <div className="settings-navigation-shell social-platform-navigation-shell">
          {mobileNavOpen && <button type="button" className="settings-nav-backdrop" aria-label="关闭电商平台导航"
            onClick={() => { setMobileNavOpen(false); triggerRef.current?.focus(); }} />}
          <nav id="ecommerce-platform-nav" ref={navRef}
            className={mobileNavOpen ? "settings-local-nav is-open social-platform-navigation" : "settings-local-nav social-platform-navigation"}
            aria-label="电商平台发现分类" role="group"
            onTouchStart={event => { (navRef as React.RefObject<HTMLElement> & { touchX?: number }).touchX = event.touches[0]?.clientX; }}
            onTouchEnd={event => { const ref = navRef as React.RefObject<HTMLElement> & { touchX?: number }; if (ref.touchX !== undefined && event.changedTouches[0].clientX - ref.touchX > 80) { setMobileNavOpen(false); triggerRef.current?.focus(); } ref.touchX = undefined; }}>
            <div className="platform-drawer-heading">
              <strong>选择电商平台</strong>
              <button type="button" aria-label="关闭电商平台导航" onClick={() => { setMobileNavOpen(false); triggerRef.current?.focus(); }}>×</button>
            </div>
            <div className="settings-nav-group">
              <div className="settings-nav-group-title">电商平台发现</div>
              {ecommercePlatformItems.map(item => (
                <button key={item.id} type="button" className="settings-nav-item social-platform-nav-item"
                  aria-current={platform === item.id ? "page" : undefined}
                  onClick={() => selectPlatform(item.id)}>
                  <span className={"ecommerce-brand-mark ecommerce-brand-" + item.id} aria-hidden="true">{item.mark}</span>
                  <span className="settings-nav-label">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
        <div className="social-platform-content"><EcommerceDiscovery platform={platform} /></div>
      </div>
    </div>
  );
}

function AppShell() {
  const { session, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.replace(/\/$/, "") || "/";
  const isSettings = path.startsWith("/settings/");
  const isTemplatePage = path === "/seo-analysis" || path.startsWith("/social-discovery") || path.startsWith("/ecommerce-discovery") || ["/leads/facebook", "/leads/linkedin", "/leads/google-maps", "/leads/instagram"].includes(path) || path.startsWith("/platform-data/");
  const [viewport, setViewport] = React.useState<Viewport>("desktop");
  const [tabletExpanded, setTabletExpanded] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false);
  const accountMenuRef = React.useRef<HTMLDivElement>(null);

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
    if (!accountMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

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

  const legacySocialPlatform: SocialPlatform | null =
    path === "/leads/facebook" ? "facebook" :
    path === "/leads/instagram" ? "instagram" :
    path === "/leads/linkedin" ? "linkedin" :
    path === "/leads/google-maps" ? "google-maps" :
    path.startsWith("/platform-data/") ? (path.split("/")[2] as SocialPlatform) : null;
  const currentLabel = path.startsWith("/platform-data/") ? "平台数据采集"
    : path === "/products" ? "产品中心"
    : path === "/seo-analysis" ? "独立站智能诊断"
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
    { id: "social-discovery", label: "社媒平台发现", href: "/social-discovery", icon: Forum, active: path.startsWith("/social-discovery") || path.startsWith("/leads/") || path.startsWith("/platform-data/") },
    { id: "ecommerce-discovery", label: "电商平台发现", href: "/ecommerce-discovery/amazon", icon: ShoppingCart, active: path.startsWith("/ecommerce-discovery") },
    { id: "seo-analysis", label: "独立站智能诊断", href: "/seo-analysis", icon: SearchIcon, active: path === "/seo-analysis" },
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
      {/* Carbon inverse Header layer on the Gray 10 application canvas. */}
      <Theme theme="g100">
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
          kosmoevretis
        </HeaderName>
        <span className="kosmo-header-context">全球情报平台</span>
        <div className="kosmo-account-menu" ref={accountMenuRef}>
          <button
            type="button"
            className="kosmo-account-avatar"
            aria-label="打开账户菜单"
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            onClick={() => setAccountMenuOpen((open) => !open)}
          >
            {session?.user.user_metadata?.avatar_url || session?.user.user_metadata?.picture ? (
              <img src={String(session.user.user_metadata.avatar_url || session.user.user_metadata.picture)} alt="" />
            ) : (
              <span>{(session?.user.email?.trim().charAt(0) || "U").toUpperCase()}</span>
            )}
          </button>
          {accountMenuOpen && (
            <div className="kosmo-account-dropdown" role="menu" aria-label="账户菜单">
              <div className="kosmo-account-email">{session?.user.email}</div>
              <button
                type="button"
                role="menuitem"
                className="kosmo-account-signout"
                onClick={() => {
                  setAccountMenuOpen(false);
                  void signOut().catch((error) => console.error("Sign out failed:", error));
                }}
              >
                <Logout size={16} aria-hidden="true" />
                <span>退出系统</span>
              </button>
            </div>
          )}
        </div>
      </Header>
      </Theme>

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
              <SideNavMenu title="平台数据采集" defaultExpanded renderIcon={DataBase}>
                {renderMenuItem(navItems[3])}
                {renderMenuItem(navItems[4])}
              </SideNavMenu>
              <SideNavMenu title="独立站运维" defaultExpanded renderIcon={SearchIcon}>
                {renderMenuItem(navItems[5])}
              </SideNavMenu>
              <SideNavMenu title="系统设置" defaultExpanded renderIcon={Settings}>
                {renderMenuItem(navItems[6])}
              </SideNavMenu>
            </>
          )}
        </SideNavItems>
      </SideNav>

      <Content id="main-content" className={`kosmo-main ${isTemplatePage ? "kosmo-main--template-page" : ""}`}>
        {!isTemplatePage && <>
        <div className="eyebrow">Kosmoevretis / 全球情报中心</div>
        <div className="page-head">
          <div>
            <h1>{currentLabel}</h1>
            <p>
              {path === "/intelligence" ? "统一配置分析对象，在同一工作台查看全球市场多维情报。"
                : path === "/products" ? "统一管理产品分类、属性模板、产品模板与 SKU 变体，为全球情报、报价与合同提供统一产品主数据。"
                : path === "/trade-access" ? "评估目标市场的关税、贸易条件、产品准入与法规合规要求。"
                : path.startsWith("/platform-data/") ? "统一采集 X、Reddit、Pinterest、TikTok 与 YouTube 的公开内容、账号、评论和趋势数据。"
                : path.startsWith("/leads/") ? "通过不同公开渠道发现潜在客户、企业主页、内容与商业机会。"
                : "集中管理平台 API、Apify Actor、AI 模型和系统偏好。"}
            </p>
          </div>
          <span className="scope">● GLOBAL　全球市场</span>
        </div>
        </>}
        {path === "/intelligence" && <GlobalIntelligence />}
        {path === "/trade-access" && <TradeAccessPage />}
        {path === "/products" && <ProductCenter />}
        {path === "/seo-analysis" && <SeoAnalysis />}
        
        
        
        
        
        
        
        
        
        {(path === "/social-discovery" || path.startsWith("/social-discovery/") || legacySocialPlatform !== null) && <SocialPlatformWorkspace platform={(path.startsWith("/social-discovery/") ? path.split("/")[2] : legacySocialPlatform || "facebook") as SocialPlatform} />}
        {(path === "/ecommerce-discovery" || path.startsWith("/ecommerce-discovery/")) && <EcommercePlatformWorkspace platform={(path.startsWith("/ecommerce-discovery/") ? path.split("/")[2] : "amazon") as EcommercePlatformId} />}
        {isSettings && <SettingsPage />}
      </Content>
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
