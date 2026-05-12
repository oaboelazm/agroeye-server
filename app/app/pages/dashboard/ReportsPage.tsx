import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { FileText, Download } from "lucide-react";

export function ReportsPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Generated Reports</h1>
          <p className="text-muted-foreground">Export and share scheduled PDF summaries</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">Generate New Report</Button>
      </div>

      <div className="space-y-4">
        {[
          "Monthly Yield Forecast - October 2026",
          "Weekly Device Health Audit",
          "Irrigation Efficiency Report Q3",
          "AI Anomaly Detection Summary"
        ].map((report, i) => (
          <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <FileText className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-base">{report}</h3>
                <p className="text-sm text-muted-foreground">Generated {i + 1} day(s) ago</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" /> PDF
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
