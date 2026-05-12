import React from "react";
import { useNavigate } from "react-router";
import { ArrowRight, SkipForward, Sprout, Tractor, Cpu, Activity } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { STORAGE_KEYS, writeStorage } from "../lib/storage";

export function OnboardingPage() {
  const navigate = useNavigate();

  const completeOnboarding = () => {
    writeStorage(STORAGE_KEYS.onboardingCompleted, true);
    navigate("/dashboard/overview", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl border-border/50 bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to AgroEye</CardTitle>
          <CardDescription>
            Mobile app handles provisioning. Web dashboard focuses on monitoring, analytics, and management.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border/60 p-3 text-center">
              <Sprout className="mx-auto mb-2 h-5 w-5 text-emerald-500" />
              <p className="text-sm font-medium">Farms</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 text-center">
              <Tractor className="mx-auto mb-2 h-5 w-5 text-emerald-500" />
              <p className="text-sm font-medium">Fields</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 text-center">
              <Cpu className="mx-auto mb-2 h-5 w-5 text-emerald-500" />
              <p className="text-sm font-medium">Devices</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 text-center">
              <Activity className="mx-auto mb-2 h-5 w-5 text-emerald-500" />
              <p className="text-sm font-medium">Monitoring</p>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
            <Button variant="outline" onClick={completeOnboarding} className="gap-2">
              <SkipForward className="h-4 w-4" />
              Skip
            </Button>
            <Button onClick={completeOnboarding} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              Continue to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
