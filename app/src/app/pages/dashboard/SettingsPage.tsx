import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { Button } from "../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Separator } from "../../components/ui/separator";
import { User, Palette, Bell, Archive, RotateCcw, MapPin, Grid3X3 } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { api } from "../../lib/api";
import type { Farm } from "../../types/api";

export function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("agroeye_sidebar_collapsed") === "true"; } catch { return false; }
  });
  const [archivedFarms, setArchivedFarms] = useState<Farm[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [unarchivingId, setUnarchivingId] = useState<number | null>(null);

  const handleSidebarChange = (checked: boolean) => {
    setSidebarCollapsed(checked);
    localStorage.setItem("agroeye_sidebar_collapsed", String(checked));
  };

  const fetchArchived = useCallback(async () => {
    setArchivedLoading(true);
    try {
      const res = await api.web.archivedFarms();
      setArchivedFarms(res.farms || []);
    } catch {
      setArchivedFarms([]);
    } finally {
      setArchivedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchived();
  }, [fetchArchived]);

  const handleUnarchive = async (farmId: number) => {
    setUnarchivingId(farmId);
    try {
      await api.web.unarchiveFarm(farmId);
      setArchivedFarms((prev) => prev.filter((f) => f.farm_id !== farmId));
    } catch {
      // ignore
    } finally {
      setUnarchivingId(null);
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-[1000px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your preferences</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid grid-cols-4 mb-8 bg-card/50">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" /> <span className="hidden md:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="w-4 h-4" /> <span className="hidden md:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" /> <span className="hidden md:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <Archive className="w-4 h-4" /> <span className="hidden md:inline">Archived</span>
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

          {/* Archived Green Houses */}
          <TabsContent value="archived">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Archived Green Houses</CardTitle>
                  <CardDescription>Restore archived green houses to the dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                  {archivedLoading ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : archivedFarms.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No archived green houses.</p>
                  ) : (
                    <div className="space-y-3">
                      {archivedFarms.map((farm) => (
                        <div
                          key={farm.farm_id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/10 rounded-lg">
                              <Grid3X3 className="h-4 w-4 text-yellow-500" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{farm.name}</p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {farm.location}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnarchive(farm.farm_id)}
                            disabled={unarchivingId === farm.farm_id}
                            className="gap-2"
                          >
                            <RotateCcw className={`h-3.5 w-3.5 ${unarchivingId === farm.farm_id ? "animate-spin" : ""}`} />
                            {unarchivingId === farm.farm_id ? "Restoring..." : "Restore"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
