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
  "/products", "/settings/providers", "/settings/actors", "/settings/channels", "/settings/runs",
  "/settings/ai-providers", "/settings/models", "/settings/routes", "/settings/prompts",
  "/settings/organization", "/settings/members", "/settings/locale", "/settings/notifications",
  "/settings/governance", "/settings/audit", "/settings/design-system",
]);

type SocialPlatform = "facebook" | "instagram" | "linkedin" | "google-maps" | "x" | "reddit" | "pinterest" | "tiktok" | "youtube";
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
    <div className="social-platform-workspace">
      <nav className="social-platform-navigation" aria-label="社媒平台发现分类">
        <div className="social-platform-nav-heading">社媒平台发现</div>
        {socialPlatformItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" className="social-platform-nav-item"
              aria-current={platform === item.id ? "page" : undefined}
              onClick={() => navigate("/social-discovery/" + item.id)}>
              <Icon size={16} aria-hidden="true" /><span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="social-platform-content">{pages[platform]}</div>
    </div>
  );
}  const navItems = [
    { id: "products", label: "产品中心", href: "/products", icon: Product, active: path === "/products" },
    { id: "intelligence", label: "情报总览", href: "/intelligence", icon: Dashboard, active: path === "/intelligence" },
    { id: "trade", label: "贸易与市场准入", href: "/trade-access", icon: Currency, active: path === "/trade-access" },
    { id: "social-discovery", label: "社媒平台发现", href: "/social-discovery", icon: Forum, active: path.startsWith("/social-discovery") || path.startsWith("/leads/") || path.startsWith("/platform-data/") },
    { id: "settings", label: "设置中心", href: "/settings/providers", icon: Settings, active: isSettings },
  ];rt React from "react";
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
  "/products", "/settings/providers", "/settings/actors", "/settings/channels", "/settings/runs",
  "/settings/ai-providers", "/settings/models", "/settings/routes", "/settings/prompts",
  "/settings/organization", "/settings/members", "/settings/locale", "/settings/notifications",
  "/settings/governance", "/settings/audit", "/settings/design-system",
]);

type SocialPlatform = "facebook" | "instagram" | "linkedin" | "google-maps" | "x" | "reddit" | "pinterest" | "tiktok" | "youtube";
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
    <div className="social-platform-workspace">
      <nav className="social-platform-navigation" aria-label="社媒平台发现分类">
        <div className="social-platform-nav-heading">社媒平台发现</div>
        {socialPlatformItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" className="social-platform-nav-item"
              aria-current={platform === item.id ? "page" : undefined}
              onClick={() => navigate("/social-discovery/" + item.id)}>
              <Icon size={16} aria-hidden="true" /><span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="social-platform-content">{pages[platform]}</div>
    </div>
  );
}
