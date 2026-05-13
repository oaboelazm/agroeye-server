import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { Button } from "../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Separator } from "../../components/ui/separator";
import { User, Palette, Bell } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

export function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("agroeye_sidebar_collapsed") === "true"; } catch { return false; }
  });

  const handleSidebarChange = (checked: boolean) => {
    setSidebarCollapsed(checked);
    localStorage.setItem("agroeye_sidebar_collapsed", String(checked));
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-[1000px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your preferences</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid grid-cols-3 mb-8 bg-card/50">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" /> <span className="hidden md:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="w-4 h-4" /> <span className="hidden md:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" /> <span className="hidden md:inline">Notifications</span>
          </TabsTrigger>
        </TabsList>

        <div className="space-y-6">
          {/* Profile Settings */}
          <TabsContent value="profile">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Your account information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input defaultValue={user?.username || ""} disabled className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input defaultValue={user?.email || ""} disabled className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input defaultValue={user?.role || "Farmer"} disabled className="bg-muted/50" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Appearance / Theme */}
          <TabsContent value="theme">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize the look and feel</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <div className="flex gap-3">
                      <Button
                        variant={theme === "light" ? "default" : "outline"}
                        className={theme === "light" ? "bg-emerald-600" : ""}
                        onClick={() => setTheme("light")}
                      >
                        Light
                      </Button>
                      <Button
                        variant={theme === "dark" ? "default" : "outline"}
                        className={theme === "dark" ? "bg-emerald-600" : ""}
                        onClick={() => setTheme("dark")}
                      >
                        Dark
                      </Button>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Collapsed Sidebar</Label>
                      <p className="text-sm text-muted-foreground">Start with sidebar collapsed by default</p>
                    </div>
                    <Switch checked={sidebarCollapsed} onCheckedChange={handleSidebarChange} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Manage alert types (UI only)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Hardware Alerts</Label>
                      <p className="text-sm text-muted-foreground">Offline nodes and low battery warnings</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">AI Detections</Label>
                      <p className="text-sm text-muted-foreground">Disease detection alerts from AI scans</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Events</Label>
                      <p className="text-sm text-muted-foreground">When events start or end</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
