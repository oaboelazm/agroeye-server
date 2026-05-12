import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import {
  Bell,
  Bot,
  Building2,
  ChevronDown,
  Cpu,
  FileText,
  LayoutDashboard,
  Leaf,
  Menu,
  Moon,
  Settings,
  Sprout,
  Sun,
} from "lucide-react";
import { motion } from "motion/react";
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
import { cn } from "../components/ui/utils";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { readStorage, STORAGE_KEYS, writeStorage } from "../lib/storage";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import { ScrollArea } from "../components/ui/scroll-area";

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/overview" },
  { icon: Building2, label: "Farms", path: "/dashboard/farms" },
  { icon: Sprout, label: "Fields", path: "/dashboard/fields" },
  { icon: Cpu, label: "Devices", path: "/dashboard/devices" },
  { icon: FileText, label: "Reports", path: "/dashboard/reports" },
  { icon: Bot, label: "AI Insights", path: "/dashboard/ai-assistant" },
  { icon: Bell, label: "Notifications", path: "/dashboard/notifications" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function DashboardLayout() {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => readStorage<boolean>(STORAGE_KEYS.sidebarCollapsed, true));
  const [openNotifications, setOpenNotifications] = React.useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = React.useState<number | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const {
    farms,
    activeFarmId,
    setActiveFarmId,
    isLoadingFarms,
    notifications,
    unreadNotifications,
    markNotificationAsRead,
    isLoadingNotifications,
  } = useAppData();

  const activeFarm = farms.find((farm) => farm.farm_id === activeFarmId);
  const selectedNotification = notifications.find((item) => item.notification_id === selectedNotificationId) || null;

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      writeStorage(STORAGE_KEYS.sidebarCollapsed, next);
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleOpenNotification = async (notificationId: number, isRead: number) => {
    setSelectedNotificationId(notificationId);
    if (!isRead) {
      await markNotificationAsRead(notificationId);
    }
  };

  return (
    <>
      <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 84 : 264 }}
          transition={{ duration: 0.2 }}
          className="h-full border-r border-border bg-card flex flex-col z-20 shrink-0"
        >
          <div className="h-16 flex items-center px-4 border-b border-border justify-between shrink-0">
            {!collapsed ? (
              <Link to="/dashboard/overview" className="flex items-center gap-2 font-bold text-lg tracking-tight text-emerald-500">
                <Leaf className="h-6 w-6" />
                <span>AgroEye</span>
              </Link>
            ) : (
              <Link to="/dashboard/overview" className="mx-auto text-emerald-500">
                <Leaf className="h-6 w-6" />
              </Link>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
                      isActive ? "bg-emerald-500/10 text-emerald-500 font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="p-3 border-t border-border shrink-0">
            <div className={cn("flex items-center gap-2 rounded-md p-2", collapsed ? "justify-center" : "justify-between")}>
              {!collapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase() || "AE"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user?.username || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
                  </div>
                </div>
              )}
              {collapsed && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase() || "AE"}</AvatarFallback>
                </Avatar>
              )}
              <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.aside>

        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
          <header className="h-16 border-b border-border bg-card/70 backdrop-blur-md flex items-center px-4 md:px-6 justify-between shrink-0 z-10">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="shrink-0">
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-background border-border max-w-[280px] justify-between">
                    <span className="truncate">{isLoadingFarms ? "Loading farms..." : activeFarm?.name || "No farms available"}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  <DropdownMenuLabel>Select Farm</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {farms.map((farm) => (
                    <DropdownMenuItem key={farm.farm_id} onClick={() => setActiveFarmId(farm.farm_id)} className="cursor-pointer">
                      <div className="flex flex-col">
                        <span>{farm.name}</span>
                        <span className="text-xs text-muted-foreground">{farm.location}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {!farms.length && <DropdownMenuItem disabled>No farms found</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative" onClick={() => setOpenNotifications(true)}>
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-1">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase() || "AE"}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.username || "User"}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email || ""}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-background/50">
            <Outlet />
          </main>
        </div>
      </div>

      <Sheet open={openNotifications} onOpenChange={setOpenNotifications}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>Click a notification to open details and mark it as read.</SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-4 grid grid-rows-[1fr_auto] gap-4 h-[calc(100%-88px)]">
            <ScrollArea className="border border-border/60 rounded-lg">
              <div className="p-2 space-y-1">
                {isLoadingNotifications && <p className="text-sm text-muted-foreground p-2">Loading notifications...</p>}
                {!isLoadingNotifications && !notifications.length && <p className="text-sm text-muted-foreground p-2">No notifications for this farm.</p>}
                {notifications.map((item) => (
                  <button
                    key={item.notification_id}
                    onClick={() => void handleOpenNotification(item.notification_id, item.is_read)}
                    className={cn(
                      "w-full text-left p-3 rounded-md border transition-colors",
                      selectedNotificationId === item.notification_id ? "border-emerald-500/50 bg-emerald-500/10" : "border-border/60 hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium truncate">{item.type}</p>
                      {!item.is_read && <span className="h-2.5 w-2.5 rounded-full bg-red-500 mt-1" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">{item.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{formatDate(item.sent_at)}</p>
                  </button>
                ))}
              </div>
            </ScrollArea>

            <div className="border border-border/60 rounded-lg p-3 min-h-[130px]">
              {!selectedNotification && <p className="text-sm text-muted-foreground">Select a notification to view the full message.</p>}
              {selectedNotification && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{selectedNotification.type}</p>
                  <p className="text-sm leading-relaxed">{selectedNotification.message}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(selectedNotification.sent_at)}</p>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
