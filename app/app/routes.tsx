import React from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { LoginPage } from "./pages/auth/LoginPage";
import { SignupPage } from "./pages/auth/SignupPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { OverviewPage } from "./pages/dashboard/OverviewPage";
import { AnalyticsPage } from "./pages/dashboard/AnalyticsPage";
import { DeviceManagementPage } from "./pages/dashboard/DeviceManagementPage";
import { AIAssistantPage } from "./pages/dashboard/AIAssistantPage";
import { ScansPage } from "./pages/dashboard/ScansPage";
import { ReportsPage } from "./pages/dashboard/ReportsPage";
import { SettingsPage } from "./pages/dashboard/SettingsPage";
import { FarmsPage } from "./pages/dashboard/FarmsPage";
import { FieldsPage } from "./pages/dashboard/FieldsPage";
import { NotificationsPage } from "./pages/dashboard/NotificationsPage";
import { useAuth } from "./contexts/AuthContext";
import { readStorage, STORAGE_KEYS } from "./lib/storage";

function isOnboardingCompleted() {
  return readStorage<boolean>(STORAGE_KEYS.onboardingCompleted, false);
}

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isOnboardingCompleted() ? "/dashboard/overview" : "/onboarding"} replace />;
}

function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to={isOnboardingCompleted() ? "/dashboard/overview" : "/onboarding"} replace />;
  }
  return <Outlet />;
}

function AuthenticatedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function OnboardingRoute() {
  if (isOnboardingCompleted()) {
    return <Navigate to="/dashboard/overview" replace />;
  }
  return <OnboardingPage />;
}

function DashboardRoute() {
  if (!isOnboardingCompleted()) {
    return <Navigate to="/onboarding" replace />;
  }
  return <DashboardLayout />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootRedirect,
  },
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: "/login", Component: LoginPage },
      { path: "/signup", Component: SignupPage },
    ],
  },
  {
    element: <AuthenticatedRoute />,
    children: [
      { path: "/onboarding", Component: OnboardingRoute },
      {
        path: "/dashboard",
        Component: DashboardRoute,
        children: [
          { index: true, element: <Navigate to="/dashboard/overview" replace /> },
          { path: "overview", Component: OverviewPage },
          { path: "analytics", Component: AnalyticsPage },
          { path: "farms", Component: FarmsPage },
          { path: "fields", Component: FieldsPage },
          { path: "devices", Component: DeviceManagementPage },
          { path: "ai-assistant", Component: AIAssistantPage },
          { path: "notifications", Component: NotificationsPage },
          { path: "scans", Component: ScansPage },
          { path: "reports", Component: ReportsPage },
          { path: "settings", Component: SettingsPage },
        ],
      },
    ],
  },
]);
