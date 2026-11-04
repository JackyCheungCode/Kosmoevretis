import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { AuthProvider, useAuth } from "./AuthProvider";

const AuthPage = lazy(() => import("../features/auth/AuthPage").then((module) => ({ default: module.AuthPage })));
const WorkspacePage = lazy(() => import("../features/workspace/WorkspacePage").then((module) => ({ default: module.WorkspacePage })));
const DashboardPage = lazy(() => import("../features/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const SettingsPage = lazy(() => import("../features/settings/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const EnterpriseWorkflowPage = lazy(() => import("../features/enterprise-workflow/EnterpriseWorkflowPage").then((module) => ({ default: module.EnterpriseWorkflowPage })));
const MarketTrendsPage = lazy(() => import("../features/market-trends/MarketTrendsPage").then((module) => ({ default: module.MarketTrendsPage })));
const KeywordResearchPage = lazy(() => import("../features/keyword-research/KeywordResearchPage").then((module) => ({ default: module.KeywordResearchPage })));
const AIWorkCenterPage = lazy(() => import("../features/ai-work-center/AIWorkCenterPage").then((module) => ({ default: module.AIWorkCenterPage })));
const ResearchTaskDetailPage = lazy(() => import("../features/ai-work-center/ResearchTaskDetailPage").then((module) => ({ default: module.ResearchTaskDetailPage })));

function RouteLoading() {
  return <div className="route-loading" role="status" aria-live="polite"><span className="route-loading-indicator" />正在加载页面…</div>;
}

function Protected({ children }: { children: React.ReactNode }) {
  const { session, workspace, loading } = useAuth();
  if (loading) return <div className="auth-page"><p>正在恢复安全会话…</p></div>;
  if (!session) return <Navigate to="/auth" replace />;
  if (!workspace) return <Navigate to="/workspace" replace />;
  return <AppShell>{children}</AppShell>;
}

function WorkspaceOnly() {
  const { session, loading } = useAuth();
  if (loading) return <div className="auth-page"><p>正在加载…</p></div>;
  if (!session) return <Navigate to="/auth" replace />;
  return <WorkspacePage />;
}

export function App() {
  return <AuthProvider><BrowserRouter><Suspense fallback={<RouteLoading />}><Routes>
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/workspace" element={<WorkspaceOnly />} />
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
    <Route path="/enterprise-workflow" element={<Protected><EnterpriseWorkflowPage /></Protected>} />
    <Route path="/enterprise-profile" element={<Navigate to="/enterprise-workflow" replace />} />
    <Route path="/enterprise-profile/:enterpriseId" element={<Navigate to="/enterprise-workflow" replace />} />
    <Route path="/market-trends" element={<Protected><MarketTrendsPage /></Protected>} />
    <Route path="/keyword-research" element={<Protected><KeywordResearchPage /></Protected>} />
    <Route path="/ai-work-center" element={<Protected><AIWorkCenterPage /></Protected>} />
    <Route path="/ai-work-center/:taskId" element={<Protected><ResearchTaskDetailPage /></Protected>} />
    <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
    <Route path="/ai-analysis" element={<Navigate to="/enterprise-workflow" replace />} />
    <Route path="/analysis-results" element={<Navigate to="/enterprise-workflow" replace />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes></Suspense></BrowserRouter></AuthProvider>;
}
