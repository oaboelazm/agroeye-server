import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export function FarmsPage() {
  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle>Farms</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Farm monitoring and metadata are now driven by API data in the dashboard header selector.</p>
        </CardContent>
      </Card>
    </div>
  );
}
