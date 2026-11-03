import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { AuthProvider, useAuth } from "./AuthProvider";
import { AuthPage } from "../features/auth/AuthPage";
import { WorkspacePage } from "../features/workspace/WorkspacePage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { EnterpriseProfilePage } from "../features/enterprise-profile/EnterpriseProfilePage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { AIAnalysisPage } from "../features/ai-analysis/AIAnalysisPage";
import { AnalysisResultsPage } from "../features/analysis-results/AnalysisResultsPage";

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
  return <AuthProvider><BrowserRouter>
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/workspace" element={<WorkspaceOnly />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
      <Route path="/enterprise-profile" element={<Protected><EnterpriseProfilePage /></Protected>} />
      <Route path="/enterprise-profile/:enterpriseId" element={<Protected><EnterpriseProfilePage /></Protected>} />
      <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
      <Route path="/ai-analysis" element={<Protected><AIAnalysisPage /></Protected>} />
      <Route path="/analysis-results" element={<Protected><AnalysisResultsPage companyName="当前企业" onConfigureAnalysis={() => { window.location.href = "/ai-analysis"; }} /></Protected>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </BrowserRouter></AuthProvider>;
}
