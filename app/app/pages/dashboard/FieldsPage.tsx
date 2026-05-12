import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export function FieldsPage() {
  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle>Fields</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Field-level monitoring pages are being migrated to backend-connected views.</p>
        </CardContent>
      </Card>
    </div>
  );
}
