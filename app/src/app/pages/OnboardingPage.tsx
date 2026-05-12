import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { Smartphone, ShieldCheck, Database, Bot, ArrowRight, ArrowLeft, LayoutDashboard, LineChart, SkipForward } from "lucide-react";

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to AgroEye",
    description: "The intelligent monitoring system for your agricultural operations. Your web dashboard is your command center for analytics and device management.",
    icon: Database,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    id: "hierarchy",
    title: "Farm Structure",
    description: "Your infrastructure is organized as Farms containing Fields, which contain connected Gateways and Sensing Nodes.",
    icon: LayoutDashboard,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    id: "mobile",
    title: "Mobile-First Provisioning",
    description: "New devices must be configured using the AgroEye mobile app via BLE before they appear in this dashboard. This dashboard is for monitoring existing devices.",
    icon: Smartphone,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    id: "analytics",
    title: "Monitoring & Analytics",
    description: "View real-time telemetry, historical trends, irrigation events, and AI-powered disease detection insights.",
    icon: LineChart,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    id: "ai",
    title: "AI Insights",
    description: "Your platform comes with an AI copilot that analyzes sensor data, predicts disease patterns, and optimizes irrigation schedules.",
    icon: Bot,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    id: "ready",
    title: "You're All Set",
    description: "Let's go to your dashboard to view real-time telemetry and insights.",
    icon: ShieldCheck,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
];

function completeOnboarding(navigate: ReturnType<typeof useNavigate>) {
  localStorage.setItem("agroeye_onboarding_completed", "true");
  navigate("/dashboard/overview", { replace: true });
}

export function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep === STEPS.length - 1) {
      completeOnboarding(navigate);
    } else {
      setCurrentStep((c) => c + 1);
    }
  };

  const handleSkip = () => {
    completeOnboarding(navigate);
  };

  const step = STEPS[currentStep];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Skip button always visible */}
      <div className="fixed top-6 right-6 z-20">
        <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground hover:text-foreground gap-2">
          <SkipForward className="h-4 w-4" />
          Skip
        </Button>
      </div>

      <div className="w-full max-w-2xl bg-card border border-border/50 rounded-3xl shadow-2xl p-8 md:p-12 relative z-10 overflow-hidden">
        {/* Progress bar */}
        <div className="flex gap-2 mb-12">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= currentStep ? "bg-emerald-500" : "bg-muted"}`} />
          ))}
        </div>

        <div className="min-h-[300px] flex flex-col items-center justify-center text-center relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className={`w-24 h-24 rounded-full ${step.bg} flex items-center justify-center mb-8`}>
                <step.icon className={`w-12 h-12 ${step.color}`} />
              </div>
              <h2 className="text-3xl font-bold mb-4">{step.title}</h2>
              <p className="text-lg text-muted-foreground max-w-md">{step.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between mt-12 pt-6 border-t border-border/50">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep((c) => c - 1)}
            disabled={currentStep === 0}
            className={currentStep === 0 ? "opacity-0" : ""}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 h-12">
            {currentStep === STEPS.length - 1 ? "Enter Dashboard" : "Continue"}
            {currentStep !== STEPS.length - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
