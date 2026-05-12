import React from "react";
import { Card, CardContent } from "../../components/ui/card";
import { useAppData } from "../../contexts/AppDataContext";
import { ScanLine } from "lucide-react";

export function ScansPage() {
  const { fields } = useAppData();

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Scan Analysis</h1>
        <p className="text-muted-foreground">Crop scan images and disease detection results</p>
      </div>

      {fields.length === 0 ? (
        <Card className="border-border/50 bg-card/50 p-12 text-center">
          <ScanLine className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-muted-foreground">No fields available. Scans are performed via the mobile app using ESP32-CAM modules.</p>
        </Card>
      ) : (
        <Card className="border-border/50 bg-card/50 p-12 text-center">
          <ScanLine className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-muted-foreground">No scans recorded yet. Use the AgroEye mobile app to capture crop images with ESP32-CAM modules.</p>
        </Card>
      )}
    </div>
  );
}
