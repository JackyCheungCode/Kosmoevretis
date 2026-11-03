import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { EnterpriseProfilePage } from "../features/enterprise-profile/EnterpriseProfilePage";

export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/enterprise-profile" element={<EnterpriseProfilePage />} />
          <Route path="/enterprise-profile/:enterpriseId" element={<EnterpriseProfilePage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
