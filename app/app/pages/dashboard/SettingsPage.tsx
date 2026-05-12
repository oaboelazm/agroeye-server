import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { STORAGE_KEYS, readStorage, writeStorage } from "../../lib/storage";

const NOTIFICATION_PREFS_KEY = "agroeye.notification.prefs";

type NotificationPrefs = {
  criticalAlerts: boolean;
  aiInsights: boolean;
  irrigationUpdates: boolean;
};

function readNotificationPrefs(): NotificationPrefs {
  return readStorage<NotificationPrefs>(NOTIFICATION_PREFS_KEY, {
    criticalAlerts: true,
    aiInsights: true,
    irrigationUpdates: true,
  });
}

export function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => readStorage<boolean>(STORAGE_KEYS.sidebarCollapsed, true));
  const [notificationPrefs, setNotificationPrefs] = React.useState<NotificationPrefs>(() => readNotificationPrefs());

  const updateSidebarPreference = (next: boolean) => {
    setSidebarCollapsed(next);
    writeStorage(STORAGE_KEYS.sidebarCollapsed, next);
  };

  const updateNotificationPref = (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(next);
    writeStorage(NOTIFICATION_PREFS_KEY, next);
  };

  return (
    <div className="p-6 space-y-6 max-w-[900px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Profile, UI preferences, and notification options.</p>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Account details from your authenticated profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={user?.username || ""} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} readOnly />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value="" placeholder="No phone available from current session" readOnly />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle>UI Preferences</CardTitle>
          <CardDescription>Applied immediately and persisted locally.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Theme</Label>
              <p className="text-sm text-muted-foreground">Switch between light and dark mode.</p>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Sidebar collapsed by default</Label>
              <p className="text-sm text-muted-foreground">Controls the default shell density.</p>
            </div>
            <Switch checked={sidebarCollapsed} onCheckedChange={updateSidebarPreference} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>UI-level toggles for alert preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Critical Alerts</Label>
              <p className="text-sm text-muted-foreground">Gateway disconnects and urgent farm events.</p>
            </div>
            <Switch checked={notificationPrefs.criticalAlerts} onCheckedChange={(v) => updateNotificationPref("criticalAlerts", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">AI Insights</Label>
              <p className="text-sm text-muted-foreground">Disease detections and recommendation updates.</p>
            </div>
            <Switch checked={notificationPrefs.aiInsights} onCheckedChange={(v) => updateNotificationPref("aiInsights", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Irrigation Updates</Label>
              <p className="text-sm text-muted-foreground">Cycle execution and completion notifications.</p>
            </div>
            <Switch checked={notificationPrefs.irrigationUpdates} onCheckedChange={(v) => updateNotificationPref("irrigationUpdates", v)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
