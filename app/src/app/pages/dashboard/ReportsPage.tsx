import React from "react";
import { Card, CardContent } from "../../components/ui/card";
import { useAppData } from "../../contexts/AppDataContext";
import { FileText } from "lucide-react";
import { Button } from "../../components/ui/button";

export function ReportsPage() {
  const { fields } = useAppData();

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Field and device report summaries</p>
        </div>
      </div>

      {fields.length === 0 ? (
        <Card className="border-border/50 bg-card/50 p-12 text-center">
          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-muted-foreground">No reports available. Reports are generated once fields have recorded sensor data.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {fields.map((field) => (
            <Card key={field.field_id} className="border-border/50 bg-card/50 backdrop-blur-sm flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <FileText className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">{field.name}</h3>
                  <p className="text-sm text-muted-foreground">{field.crop_type}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled>
                Generate
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
