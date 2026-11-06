import React from "react";
import {
  Header,
  HeaderContainer,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  Content,
  Breadcrumb,
  BreadcrumbItem,
  Grid,
  Column,
  Theme,
  HeaderMenuButton,
  Button,
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavMenu,
  SideNavMenuItem,
  SkipToContent
} from "@carbon/react";
import {
  Currency,
  Dashboard,
  Product,
  Settings,
  Logout,
  DataBase,
  Email,
  Share,
} from "@carbon/icons-react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ProductCenter from "./ProductCenter";
import TaskCenter from "./TaskCenter";
import GlobalIntelligence from "./GlobalIntelligence";
import CustomerCenter from "./CustomerCenter";
import SalesPipeline from "./SalesPipeline";
import UnifiedMessageCenter from "./UnifiedMessageCenter";
import MetaChannelManagement from "./MetaChannelManagement";
import TradeAccessPage from "./TradeAccessPage";
import SettingsPage from "./Settings";
import MailCommunication from "./MailCommunication";
import FacebookDiscovery from "./FacebookDiscovery";
import SocialDiscoveryDirectory from "./pages/SocialDiscoveryDirectory";
import LinkedInDiscovery from "./LinkedInDiscovery";
import InstagramDiscovery from "./pages/InstagramDiscovery";
import PlatformDataCollection from "./pages/PlatformDataCollection";
import PlatformDataCollectionDirectory from "./pages/PlatformDataCollectionDirectory";
import EcommerceDiscovery, { type EcommercePlatform } from "./pages/EcommerceDiscovery";
import SeoAnalysis from "./pages/SeoAnalysis";
import GoogleMapsDiscovery from "./GoogleMapsDiscovery";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import AuthGuard from "./auth/AuthGuard";
import LoginPage from "./auth/LoginPage";
import "./social-platform-workspace.css";

type Viewport = "desktop" | "tablet" | "mobile";

const validPaths = new Set([
  "/intelligence", "/trade-access", "/platform-data-collection", "/social-discovery", "/social-discovery/facebook",
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
  "/settings/governance", "/settings/audit", "/settings/design-system", "/settings/mail",
  "/communication/mail", "/communication/inbox", "/tasks", "/customers", "/opportunities", "/meta-channels",
]);

type SocialPlatform = "facebook" | "instagram" | "linkedin" | "google-maps" | "x" | "reddit" | "pinterest" | "tiktok" | "youtube";
type EcommercePlatformId = EcommercePlatform;

function SocialPlatformWorkspace({ platform }: { platform: SocialPlatform }) {
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
      <div className="social-platform-content">{pages[platform]}</div>
    </div>
  );
}

function EcommercePlatformWorkspace({ platform }: { platform: EcommercePlatformId }) {
  return (
    <div className="social-platform-workspace-shell">
      <div className="social-platform-content"><EcommerceDiscovery platform={platform} /></div>
    </div>
  );
}


const routeLabels: Record<string, string> = {
  "/intelligence": "工作台", "/tasks": "分析任务", "/trade-access": "贸易与市场准入",
  "/products": "产品中心", "/platform-data-collection": "线索发现", "/seo-analysis": "独立站智能诊断",
  "/communication/mail": "邮件沟通", "/communication/inbox": "统一消息中心", "/meta-channels": "Meta 渠道管理", "/customers": "全球客户中心", "/opportunities": "销售商机", "/social-discovery": "社媒平台发现",
  "/ecommerce-discovery": "电商平台发现",
  "/settings/providers": "服务商连接", "/settings/actors": "采集能力目录",
  "/settings/channels": "数据渠道", "/settings/runs": "运行记录",
  "/settings/ai-providers": "AI 服务商", "/settings/models": "模型目录",
  "/settings/routes": "任务路由", "/settings/prompts": "提示词与成本",
  "/settings/organization": "组织与企业资料", "/settings/members": "用户与权限",
  "/settings/locale": "地区与语言", "/settings/notifications": "通知策略",
  "/settings/governance": "数据治理", "/settings/audit": "安全与审计",
  "/settings/design-system": "设计系统", "/settings/mail": "邮件设置",
};
const socialLabels: Record<string, string> = {
  facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn",
  "google-maps": "Google Maps", x: "X", reddit: "Reddit",
  pinterest: "Pinterest", tiktok: "TikTok", youtube: "YouTube",
};
const ecommerceLabels: Record<string, string> = {
  amazon: "Amazon", walmart: "Walmart", ebay: "eBay", aliexpress: "AliExpress",
  temu: "Temu", etsy: "Etsy", shopify: "Shopify",
  "mercado-libre": "Mercado Libre", rakuten: "Rakuten",
};
function RouteBreadcrumbs({ path }: { path: string }) {
  const items: { label: string; to?: string }[] = [];
  if (path !== "/intelligence") items.push({ label: "首页", to: "/intelligence" });
  if (path.startsWith("/settings/")) {
    items.push({ label: "系统设置", to: "/settings/providers" });
    items.push({ label: routeLabels[path] || "设置项目" });
  } else if (path.startsWith("/social-discovery/")) {
    const platform = path.split("/")[2];
    items.push({ label: "社媒平台发现", to: "/social-discovery" });
    items.push({ label: socialLabels[platform] || "平台数据" });
  } else if (path.startsWith("/leads/")) {
    const platform = path.split("/")[2];
    items.push({ label: "社媒平台发现", to: "/social-discovery" });
    items.push({ label: (socialLabels[platform] || "平台") + "客户发现" });
  } else if (path.startsWith("/platform-data/")) {
    const platform = path.split("/")[2];
    items.push({ label: "社媒平台发现", to: "/social-discovery" });
    items.push({ label: (socialLabels[platform] || "平台") + "数据采集" });
  } else if (path.startsWith("/ecommerce-discovery/")) {
    const platform = path.split("/")[2];
    items.push({ label: "电商平台发现", to: "/ecommerce-discovery" });
    items.push({ label: ecommerceLabels[platform] || "平台数据" });
  } else {
    items.push({ label: routeLabels[path] || "页面" });
  }
  return (
    <Breadcrumb className="kosmo-breadcrumb" aria-label="面包屑导航" noTrailingSlash>
      {items.map((item, index) => (
        <BreadcrumbItem key={item.label + index} isCurrentPage={!item.to}>
          {item.to ? <Link to={item.to}>{item.label}</Link> : item.label}
        </BreadcrumbItem>
      ))}
    </Breadcrumb>
  );
}

function AppShell() {
  const { session, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.replace(/\/$/, "") || "/";
  const isSettings = path.startsWith("/settings/");
  const isMailWorkspace = path === "/communication/mail";
  const isTemplatePage = path === "/platform-data-collection" || path === "/seo-analysis" || path === "/communication/mail" || path.startsWith("/social-discovery") || path.startsWith("/ecommerce-discovery") || ["/leads/facebook", "/leads/linkedin", "/leads/google-maps", "/leads/instagram"].includes(path) || path.startsWith("/platform-data/");
  const [viewport, setViewport] = React.useState<Viewport>("desktop");
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [tabletExpanded, setTabletExpanded] = React.useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false);
  const accountMenuRef = React.useRef<HTMLDivElement>(null);
  const closeMobileNavRef = React.useRef<() => void>(() => {});

  React.useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 671px)");
    const tabletQuery = window.matchMedia("(min-width: 672px) and (max-width: 1055px)");
    const updateViewport = () => {
      const next: Viewport = mobileQuery.matches ? "mobile" : tabletQuery.matches ? "tablet" : "desktop";
      setViewport(next);
      setMobileOpen(false);
      setTabletExpanded(false);
    };
    updateViewport();
    mobileQuery.addEventListener("change", updateViewport);
    tabletQuery.addEventListener("change", updateViewport);
    return () => {
      mobileQuery.removeEventListener("change", updateViewport);
      tabletQuery.removeEventListener("change", updateViewport);
    };
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


  if (!validPaths.has(path)) return <Navigate to="/intelligence" replace />;

  const legacySocialPlatform: SocialPlatform | null =
    path === "/leads/facebook" ? "facebook" :
    path === "/leads/instagram" ? "instagram" :
    path === "/leads/linkedin" ? "linkedin" :
    path === "/leads/google-maps" ? "google-maps" :
    path.startsWith("/platform-data/") ? (path.split("/")[2] as SocialPlatform) : null;
  const handleNavigate = (event: React.MouseEvent<HTMLAnchorElement>, destination: string) => {
    event.preventDefault();
    navigate(destination);
    if (viewport === "mobile") closeMobileNavRef.current();
  };

  const link = (href: string, label: string, Icon: React.ElementType, active: boolean) => (
    <SideNavLink
      href={href}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      isActive={active}
      onClick={(event: React.MouseEvent<HTMLAnchorElement>) => handleNavigate(event, href)}
    >
      <span className="kosmo-nav-item-content"><Icon size={16} /><span>{label}</span></span>
    </SideNavLink>
  );
  const menuItem = (href: string, label: string) => (
    <SideNavMenuItem key={href} href={href} onClick={(event: React.MouseEvent<HTMLAnchorElement>) => handleNavigate(event, href)}>
      {label}
    </SideNavMenuItem>
  );
  const productActive = path === "/products" || path.startsWith("/ecommerce-discovery");
  const intelligenceActive = ["/trade-access", "/seo-analysis"].includes(path);
  const customerActive = path === "/customers" || path === "/opportunities" || path === "/communication/inbox" || path === "/meta-channels" || path.startsWith("/social-discovery") || path.startsWith("/leads/") || path === "/communication/mail";
  
  return (
    <Theme theme="g10">
    <div className="shell kosmo-app-shell">
      <SkipToContent href="#main-content">跳转到主要内容</SkipToContent>
      <HeaderContainer
        render={(headerState: { isSideNavExpanded: boolean; onClickSideNavExpand: () => void }) => {
          const { onClickSideNavExpand } = headerState;
          const expanded = viewport === "desktop" || (viewport === "tablet" && tabletExpanded) || (viewport === "mobile" && mobileOpen);
          const closeMobileNav = () => {
            setMobileOpen(false);
            document.querySelector<HTMLElement>(".kosmo-header button")?.focus();
          };
          closeMobileNavRef.current = closeMobileNav;
          return (
            <>
              <Header aria-label="Kosmoevretis 全球情报平台" className="kosmo-header">
                <HeaderMenuButton
                  aria-label={expanded && viewport !== "desktop" ? "收起导航菜单" : "展开导航菜单"}
                  aria-controls="kosmo-primary-navigation"
                  isActive={expanded && viewport !== "desktop"}
                  aria-expanded={expanded}
                  onClick={() => {
                    if (viewport === "tablet") setTabletExpanded((value) => !value);
                    else if (viewport === "mobile") setMobileOpen((value) => !value);
                    else onClickSideNavExpand();
                  }}
                  className="kosmo-header-menu-button"
                />
                <HeaderName href="/intelligence" prefix="" className="kosmo-header-brand">
                  KOSMOEVRETIS
                </HeaderName>
                <HeaderGlobalBar>
                  <div className="kosmo-account-menu" ref={accountMenuRef}>
                    <HeaderGlobalAction
                      aria-label="打开账户菜单"
                      tooltipAlignment="end"
                      isActive={accountMenuOpen}
                      onClick={() => setAccountMenuOpen((open) => !open)}
                    >
                      {session?.user.user_metadata?.avatar_url || session?.user.user_metadata?.picture ? (
                        <img className="kosmo-account-avatar-image" src={String(session.user.user_metadata.avatar_url || session.user.user_metadata.picture)} alt="" />
                      ) : (
                        <span className="kosmo-account-avatar-fallback">{(session?.user.email?.trim().charAt(0) || "U").toUpperCase()}</span>
                      )}
                    </HeaderGlobalAction>
                    {accountMenuOpen && (
                      <div className="kosmo-account-dropdown" role="menu" aria-label="账户菜单">
                        <div className="kosmo-account-email">{session?.user.email}</div>
                        <Button
                          kind="ghost"
                          size="md"
                          role="menuitem"
                          className="kosmo-account-signout"
                          onClick={() => {
                            setAccountMenuOpen(false);
                            void signOut().catch((error) => console.error("Sign out failed:", error));
                          }}
                        >
                          <Logout size={16} aria-hidden="true" />
                          <span>退出系统</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </HeaderGlobalBar>
              </Header>
              <SideNav
                id="kosmo-primary-navigation"
                aria-label="主导航"
                expanded={expanded}
                isPersistent={viewport !== "mobile"}
                isRail={viewport === "tablet" && !tabletExpanded}
                onOverlayClick={closeMobileNav}
                className={`kosmo-side-nav ${viewport === "tablet" && tabletExpanded ? "kosmo-side-nav-tablet-expanded" : ""}`}
              >
                <SideNavItems>
                  {link("/intelligence", "工作台", Dashboard, path === "/intelligence")}
                  <SideNavMenu title="产品与选品" renderIcon={Product} defaultExpanded={productActive} isActive={productActive}>
                    {menuItem("/products", "产品中心")}
                  </SideNavMenu>
                  {link("/platform-data-collection", "线索发现", DataBase, path === "/platform-data-collection")}
                  <SideNavMenu title="全球市场情报" renderIcon={Currency} defaultExpanded={intelligenceActive} isActive={intelligenceActive}>
                    {menuItem("/trade-access", "贸易与市场准入")}
                    {menuItem("/seo-analysis", "独立站智能诊断")}
                  </SideNavMenu>
                  <SideNavMenu title="客户与渠道" renderIcon={Email} defaultExpanded={customerActive} isActive={customerActive}>
                    {menuItem("/customers", "全球客户中心")}
                    {menuItem("/opportunities", "销售商机")}
                    {menuItem("/meta-channels", "Meta 渠道管理")}
                    {menuItem("/communication/inbox", "统一消息中心")}
                    {menuItem("/communication/mail", "邮件沟通")}
                  </SideNavMenu>
                  {link("/tasks", "分析任务", DataBase, path === "/tasks")}
                  {link("/settings/providers", "系统设置", Settings, isSettings)}
                </SideNavItems>
              </SideNav>
            </>
          );
        }}
      />

      <Content id="main-content" className={`kosmo-main page-main-container ${isTemplatePage ? "kosmo-main--template-page" : ""}`}>
        <Grid fullWidth className="kosmo-content-grid">
          <Column sm={4} md={8} lg={16}>
        <RouteBreadcrumbs path={path} />

        {path === "/intelligence" && <GlobalIntelligence />}
        {path === "/tasks" && <TaskCenter />}
        {path === "/trade-access" && <TradeAccessPage />}
        {path === "/products" && <ProductCenter />}
        {path === "/platform-data-collection" && <PlatformDataCollectionDirectory />}
        {path === "/seo-analysis" && <SeoAnalysis />}
        {path === "/customers" && <CustomerCenter />}
        {path === "/opportunities" && <SalesPipeline />}
        {isMailWorkspace && <MailCommunication />}
        {path === "/communication/inbox" && <UnifiedMessageCenter />}
        {path === "/meta-channels" && <MetaChannelManagement />}
        
        
        
        
        
        
        
        
        
        {path === "/social-discovery" && <SocialDiscoveryDirectory />}
        {(path.startsWith("/social-discovery/") || legacySocialPlatform !== null) && <SocialPlatformWorkspace platform={(path.startsWith("/social-discovery/") ? path.split("/")[2] : legacySocialPlatform) as SocialPlatform} />}
        {(path === "/ecommerce-discovery" || path.startsWith("/ecommerce-discovery/")) && <EcommercePlatformWorkspace platform={(path.startsWith("/ecommerce-discovery/") ? path.split("/")[2] : "amazon") as EcommercePlatformId} />}
        {isSettings && <SettingsPage />}
          </Column>
        </Grid>
      </Content>
    </div>
    </Theme>
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
