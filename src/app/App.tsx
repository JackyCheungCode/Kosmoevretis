import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { AuthProvider, useAuth } from "./AuthProvider";
import { AuthPage } from "../features/auth/AuthPage";
import { WorkspacePage } from "../features/workspace/WorkspacePage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { EnterpriseWorkflowPage } from "../features/enterprise-workflow/EnterpriseWorkflowPage";

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
      <Route path="/enterprise-workflow" element={<Protected><EnterpriseWorkflowPage /></Protected>} />
      <Route path="/enterprise-profile" element={<Navigate to="/enterprise-workflow" replace />} />
      <Route path="/enterprise-profile/:enterpriseId" element={<Navigate to="/enterprise-workflow" replace />} />
      <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
      <Route path="/ai-analysis" element={<Navigate to="/enterprise-workflow" replace />} />
      <Route path="/analysis-results" element={<Navigate to="/enterprise-workflow" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </BrowserRouter></AuthProvider>;
}
