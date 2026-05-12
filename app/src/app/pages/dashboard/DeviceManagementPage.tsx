import React, { useState } from "react";
import { useAppData } from "../../contexts/AppDataContext";
import { api } from "../../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Battery, Smartphone, Wifi, Cpu, AlertCircle } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "sonner";

export function DeviceManagementPage() {
  const { farms, fields, devices, activeFarmId, loading, refreshFields } = useAppData();
  const activeFarm = farms.find((f) => f.farm_id === activeFarmId);
  const [reassigning, setReassigning] = useState<Record<number, boolean>>({});

  const handleReassign = async (deviceId: number, targetFieldId: string) => {
    if (!targetFieldId) return;
    setReassigning((prev) => ({ ...prev, [deviceId]: true }));
    try {
      await api.manage.updateDevice({
        device_id: deviceId,
        status: "online",
      });
      toast.success("Device reassigned successfully");
      if (activeFarmId) refreshFields(activeFarmId);
    } catch (err: any) {
      toast.error(err.message || "Failed to reassign device");
    } finally {
      setReassigning((prev) => ({ ...prev, [deviceId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-24 mb-4" />
        {[1, 2].map((i) => (
          <Card key={i} className="border-border/50"><CardContent className="p-6"><Skeleton className="h-32" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
          <p className="text-muted-foreground">Monitor and reassign devices for {activeFarm?.name}</p>
        </div>
      </div>

      <Alert className="bg-emerald-500/10 border-emerald-500/20">
        <Smartphone className="h-5 w-5 text-emerald-500" />
        <AlertTitle className="text-emerald-500 font-semibold">Mobile-First Provisioning</AlertTitle>
        <AlertDescription className="text-emerald-500/80 mt-1">
          New devices must be configured using the AgroEye mobile app before they appear here.
          This dashboard supports viewing device status and reassignment only.
        </AlertDescription>
      </Alert>

      {devices.length === 0 ? (
        <Card className="border-border/50 bg-card/50 p-12 text-center">
          <Cpu className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-muted-foreground">No devices found. Configure them using the mobile app.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {devices.map((device) => {
            const currentField = fields.find((f) => f.field_id === device.field_id);
            return (
              <Card key={device.device_id} className="border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Cpu className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          {device.serial_number || `Device #${device.device_id}`}
                          <Badge
                            variant={device.status === "online" ? "default" : "destructive"}
                            className={
                              device.status === "online"
                                ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border-none"
                                : ""
                            }
                          >
                            {device.status}
                          </Badge>
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {device.device_type} &middot; {currentField?.name || "Unassigned"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reassign Device */}
                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-xs text-muted-foreground shrink-0">Reassign to field:</span>
                    <Select
                      onValueChange={(val) => handleReassign(device.device_id, val)}
                      disabled={reassigning[device.device_id]}
                    >
                      <SelectTrigger className="w-[200px] h-8 text-xs">
                        <SelectValue placeholder={currentField?.name || "Select field"} />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.map((f) => (
                          <SelectItem key={f.field_id} value={String(f.field_id)}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {reassigning[device.device_id] && <span className="text-xs text-muted-foreground">Updating...</span>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
