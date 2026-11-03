import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { DashboardPage } from "../features/dashboard/DashboardPage";
export function App() {
 return <BrowserRouter><AppShell><Routes><Route path="/" element={<Navigate to="/dashboard" replace />} /><Route path="/dashboard" element={<DashboardPage />} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></AppShell></BrowserRouter>;
}