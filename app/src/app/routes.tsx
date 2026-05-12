import React from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./pages/auth/LoginPage";
import { SignupPage } from "./pages/auth/SignupPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { OverviewPage } from "./pages/dashboard/OverviewPage";
import { AnalyticsPage } from "./pages/dashboard/AnalyticsPage";
import { FarmsPage } from "./pages/dashboard/FarmsPage";
import { FieldsPage } from "./pages/dashboard/FieldsPage";
import { DeviceManagementPage } from "./pages/dashboard/DeviceManagementPage";
import { AIAssistantPage } from "./pages/dashboard/AIAssistantPage";
import { ScansPage } from "./pages/dashboard/ScansPage";
import { ReportsPage } from "./pages/dashboard/ReportsPage";
import { NotificationsPage } from "./pages/dashboard/NotificationsPage";
import { SettingsPage } from "./pages/dashboard/SettingsPage";

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  const onboardingDone = (() => {
    try { return localStorage.getItem("agroeye_onboarding_completed") === "true"; } catch { return false; }
  })();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!onboardingDone) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/dashboard/overview" replace />;
}

function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard/overview" replace />;
  return <Outlet />;
}

function AuthenticatedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function OnboardingRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const onboardingDone = (() => {
    try { return localStorage.getItem("agroeye_onboarding_completed") === "true"; } catch { return false; }
  })();
  if (onboardingDone) return <Navigate to="/dashboard/overview" replace />;
  return <Outlet />;
}

function DashboardRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const onboardingDone = (() => {
    try { return localStorage.getItem("agroeye_onboarding_completed") === "true"; } catch { return false; }
  })();
  if (!onboardingDone) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  { path: "/", Component: RootRedirect },
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: "/login", Component: LoginPage },
      { path: "/signup", Component: SignupPage },
    ],
  },
  {
    element: <OnboardingRoute />,
    children: [
      { path: "/onboarding", Component: OnboardingPage },
    ],
  },
  {
    element: <DashboardRoute />,
    children: [
      {
        path: "/dashboard",
        Component: DashboardLayout,
        children: [
          { index: true, element: <Navigate to="/dashboard/overview" replace /> },
          { path: "overview", Component: OverviewPage },
          { path: "analytics", Component: AnalyticsPage },
          { path: "farms", Component: FarmsPage },
          { path: "fields", Component: FieldsPage },
          { path: "devices", Component: DeviceManagementPage },
          { path: "ai-assistant", Component: AIAssistantPage },
          { path: "scans", Component: ScansPage },
          { path: "reports", Component: ReportsPage },
          { path: "notifications", Component: NotificationsPage },
          { path: "settings", Component: SettingsPage },
        ],
      },
    ],
  },
]);
