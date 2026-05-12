import React from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./pages/auth/LoginPage";
import { SignupPage } from "./pages/auth/SignupPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { DashboardLayout } from "./layouts/DashboardLayout";

function RootGate() {
  const { isAuthenticated } = useAuth();
  const onboardingDone = (() => {
    try { return localStorage.getItem("agroeye_onboarding_completed") === "true"; } catch { return false; }
  })();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!onboardingDone) return <Navigate to="/onboarding" replace />;
  return <DashboardLayout />;
}

function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}

function OnboardingRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const onboardingDone = (() => {
    try { return localStorage.getItem("agroeye_onboarding_completed") === "true"; } catch { return false; }
  })();
  if (onboardingDone) return <Navigate to="/" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  { path: "/", Component: RootGate },
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
]);
