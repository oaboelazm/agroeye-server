import React from "react";
import { useAppData } from "../../contexts/AppDataContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Bell, Check, Clock, AlertTriangle, Info, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const typeIcons: Record<string, React.ElementType> = {
  alert: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const typeColors: Record<string, string> = {
  alert: "text-red-500",
  warning: "text-amber-500",
  info: "text-blue-500",
};

export function NotificationsPage() {
  const { notifications, unreadCount, markNotificationAsRead, loading } = useAppData();

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card className="border-border/50 bg-card/50 p-12 text-center">
          <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-muted-foreground">No notifications yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const Icon = typeIcons[notif.type] || Bell;
            const color = typeColors[notif.type] || "text-muted-foreground";

            return (
              <Card
                key={notif.notification_id}
                className={`border-border/50 bg-card/50 backdrop-blur-sm transition-colors ${
                  notif.is_read === 0 ? "border-l-emerald-500 border-l-2" : ""
                }`}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`p-2 rounded-lg bg-background border border-border/50 ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${notif.is_read === 0 ? "font-medium" : "text-muted-foreground"}`}>
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notif.sent_at), { addSuffix: true })}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{notif.type}</Badge>
                    </div>
                  </div>
                  {notif.is_read === 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 shrink-0"
                      onClick={() => markNotificationAsRead(notif.notification_id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
