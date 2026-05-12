import React from "react";
import { useAppData } from "../../contexts/AppDataContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { Wheat, Ruler, Cpu, Activity } from "lucide-react";

export function FieldsPage() {
  const { fields, devices, nodeStatuses, loading, activeFarmId, farms } = useAppData();
  const activeFarm = farms.find((f) => f.farm_id === activeFarmId);

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="border-border/50"><CardContent className="p-6"><Skeleton className="h-40" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fields</h1>
        <p className="text-muted-foreground">
          {activeFarm?.name ? `Fields in ${activeFarm.name}` : "All fields"}
        </p>
      </div>

      {fields.length === 0 ? (
        <Card className="border-border/50 bg-card/50 p-12 text-center">
          <p className="text-muted-foreground">No fields in this farm yet. Create them using the mobile app.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {fields.map((field) => {
            const fieldDevices = devices.filter((d) => d.field_id === field.field_id);
            const status = nodeStatuses[field.field_id];

            return (
              <Card key={field.field_id} className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Wheat className="h-4 w-4 text-emerald-500" />
                        {field.name}
                      </CardTitle>
                      <CardDescription>{field.crop_type}</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">{field.area_size} ha</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Cpu className="h-3.5 w-3.5" />
                      {fieldDevices.length} devices
                    </div>
                    {status && (
                      <div className="flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5" />
                        {status.active} active nodes
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
