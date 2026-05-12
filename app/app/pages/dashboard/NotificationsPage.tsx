import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export function NotificationsPage() {
  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Notification detail drawer and read-state sync will be finalized in the notifications batch.</p>
        </CardContent>
      </Card>
    </div>
  );
}
