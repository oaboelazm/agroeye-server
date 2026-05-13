import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  LayoutDashboard,
  LineChart,
  Cpu,
  Bot,
  ScanLine,
  FileText,
  Settings,
  Moon,
  Sun,
  Leaf,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Bell,
  Wheat,
  Grid3X3,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useAppData } from "../contexts/AppDataContext";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { cn } from "../components/ui/utils";
import { motion, AnimatePresence } from "motion/react";
import { NotificationsDropdown } from "../components/dashboard/NotificationsDropdown";
import { ScrollArea } from "../components/ui/scroll-area";
import { OverviewPage } from "../pages/dashboard/OverviewPage";
import { AnalyticsPage } from "../pages/dashboard/AnalyticsPage";
import { FarmsPage } from "../pages/dashboard/FarmsPage";
import { FieldsPage } from "../pages/dashboard/FieldsPage";
import { DeviceManagementPage } from "../pages/dashboard/DeviceManagementPage";
import { AIAssistantPage } from "../pages/dashboard/AIAssistantPage";
import { ScansPage } from "../pages/dashboard/ScansPage";
import { ReportsPage } from "../pages/dashboard/ReportsPage";
import { NotificationsPage } from "../pages/dashboard/NotificationsPage";
import { SettingsPage } from "../pages/dashboard/SettingsPage";

type PageKey = "overview" | "farms" | "fields" | "devices" | "reports" | "analytics" | "ai-assistant" | "scans" | "notifications" | "settings";

const PAGES: Record<PageKey, React.ComponentType> = {
  overview: OverviewPage,
  farms: FarmsPage,
  fields: FieldsPage,
  devices: DeviceManagementPage,
  reports: ReportsPage,
  analytics: AnalyticsPage,
  "ai-assistant": AIAssistantPage,
  scans: ScansPage,
  notifications: NotificationsPage,
  settings: SettingsPage,
};

const SIDEBAR_ITEMS: { icon: React.ElementType; label: string; key: PageKey }[] = [
  { icon: LayoutDashboard, label: "Dashboard", key: "overview" },
  { icon: Grid3X3, label: "Green Houses", key: "farms" },
  { icon: Wheat, label: "Fields", key: "fields" },
  { icon: Cpu, label: "Devices", key: "devices" },
  { icon: FileText, label: "Reports", key: "reports" },
  { icon: LineChart, label: "Analytics", key: "analytics" },
  { icon: Bot, label: "AgroAssist", key: "ai-assistant" },
  { icon: ScanLine, label: "Scans", key: "scans" },
  { icon: Bell, label: "Notifications", key: "notifications" },
  { icon: Settings, label: "Settings", key: "settings" },
];

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("agroeye_sidebar_collapsed") === "true"; } catch { return false; }
  });
  const [currentPage, setCurrentPage] = useState<PageKey>("overview");
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { farms, activeFarmId, setActiveFarmId, unreadCount } = useAppData();
  const navigate = useNavigate();

  useEffect(() => {
    try { localStorage.setItem("agroeye_sidebar_collapsed", String(collapsed)); } catch {}
  }, [collapsed]);

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : "AG";
  const PageComponent = PAGES[currentPage];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Sidebar */}
      <motion.aside
        initial={{ width: 260 }}
        animate={{ width: collapsed ? 80 : 260 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="h-full border-r border-border bg-card flex flex-col z-20 shrink-0 shadow-sm relative group"
      >
        <div className="h-16 flex items-center px-4 border-b border-border justify-between shrink-0 relative">
          <div className={cn("flex items-center transition-all duration-300 w-full", collapsed ? "justify-center" : "")}>
            <button onClick={() => setCurrentPage("overview")} className="flex items-center gap-2 font-bold text-lg tracking-tight text-emerald-500 shrink-0 cursor-pointer">
              <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                <Leaf className="h-5 w-5" />
              </div>
              <AnimatePresence mode="popLayout">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    AgroEye
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3.5 top-4.5 h-7 w-7 rounded-full border-border bg-background hover:bg-muted text-muted-foreground z-50 hidden md:flex items-center justify-center shadow-sm"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <ScrollArea className="flex-1 py-6 px-3">
          <div className="flex flex-col gap-1.5">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = currentPage === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setCurrentPage(item.key)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative w-full text-left",
                    isActive
                      ? "bg-emerald-500/10 text-emerald-500 font-medium border border-emerald-500/20 shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                  )}
                >
                  {isActive && <motion.div layoutId="active-indicator" className="absolute left-0 w-1 h-5 bg-emerald-500 rounded-r-full" />}
                  <div className="relative">
                    <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-emerald-500" : "")} />
                    {item.key === "notifications" && unreadCount > 0 && !collapsed && (
                      <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-red-500 rounded-full text-[8px] text-white font-bold flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                    {item.key === "notifications" && unreadCount > 0 && collapsed && (
                      <span className="absolute -top-1.5 -right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full" />
                    )}
                  </div>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Profile Section */}
        <div className="p-3 border-t border-border shrink-0 mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full flex items-center h-auto py-2 hover:bg-muted transition-colors rounded-lg",
                  collapsed ? "justify-center px-0" : "justify-start px-2 gap-3"
                )}
              >
                <Avatar className={cn("border border-border shadow-sm", collapsed ? "h-10 w-10" : "h-9 w-9")}>
                  <AvatarFallback className="bg-emerald-500/10 text-emerald-500">{initials}</AvatarFallback>
                </Avatar>

                {!collapsed && (
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="text-sm font-semibold truncate w-full text-foreground">{user?.username || "User"}</span>
                    <span className="text-xs text-muted-foreground truncate w-full capitalize">{user?.role || "Farmer"}</span>
                  </div>
                )}

                {!collapsed && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-50" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align={collapsed ? "start" : "end"} side={collapsed ? "right" : "top"} forceMount>
              <DropdownMenuLabel className="font-normal p-3 bg-muted/30">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none">{user?.username || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email || ""}</p>
                  <div className="mt-2 text-[10px] uppercase font-bold text-emerald-500 tracking-wider">
                    {user?.role || "Farmer"}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCurrentPage("settings")} className="cursor-pointer flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-500 flex items-center gap-2 focus:text-red-500 focus:bg-red-500/10">
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative bg-muted/20">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-xl flex items-center px-6 justify-between shrink-0 z-10 sticky top-0 shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="transition-colors hover:bg-muted rounded-full" title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <div className="w-[200px]">
              <Select value={activeFarmId ? String(activeFarmId) : undefined} onValueChange={(v) => setActiveFarmId(Number(v))}>
                <SelectTrigger className="h-9 bg-muted/50 border-border/50 text-sm">
                  <SelectValue placeholder="Select farm" />
                </SelectTrigger>
                <SelectContent>
                  {farms.map((farm) => (
                    <SelectItem key={farm.farm_id} value={String(farm.farm_id)}>{farm.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationsDropdown />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarFallback className="bg-emerald-500/10 text-emerald-500 text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs text-muted-foreground">{user?.email || ""}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCurrentPage("settings")} className="cursor-pointer">Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-500">Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <ScrollArea className="flex-1 pb-8">
          <PageComponent />
        </ScrollArea>
      </div>
    </div>
  );
}
