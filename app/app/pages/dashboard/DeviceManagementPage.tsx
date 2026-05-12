import React from "react";
import { ArrowRightLeft, Cpu, Smartphone } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useAppData } from "../../contexts/AppDataContext";
import { api } from "../../lib/api";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import type { Device, Field } from "../../types/domain";

type DeviceWithField = Device & { field_id: number; field_name: string };

export function DeviceManagementPage() {
  const { token } = useAuth();
  const { activeFarmId } = useAppData();

  const [fields, setFields] = React.useState<Field[]>([]);
  const [devices, setDevices] = React.useState<DeviceWithField[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [targetFieldByDevice, setTargetFieldByDevice] = React.useState<Record<number, string>>({});
  const [savingDeviceId, setSavingDeviceId] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    if (!activeFarmId) {
      setFields([]);
      setDevices([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fieldsResp = await api.post<{ fields: Field[] }>("/mobile/home/get-fields", { farm_id: activeFarmId }, token);
      const nextFields = fieldsResp.fields || [];
      setFields(nextFields);

      const perFieldDevices = await Promise.all(
        nextFields.map(async (field) => {
          const resp = await api.post<{ devices: Device[] }>("/mobile/home/get-devices", { field_id: field.field_id }, token);
          return (resp.devices || []).map((device) => ({ ...device, field_id: field.field_id, field_name: field.name }));
        }),
      );

      setDevices(perFieldDevices.flat());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices");
    } finally {
      setLoading(false);
    }
  }, [activeFarmId, token]);

  React.useEffect(() => {
    load();
  }, [load]);

  const reassignDevice = async (device: DeviceWithField) => {
    const targetField = Number(targetFieldByDevice[device.device_id]);
    if (!targetField || targetField === device.field_id) {
      return;
    }

    setSavingDeviceId(device.device_id);
    setError(null);
    try {
      await api.post(
        "/mobile/manage/update-device",
        {
          device_id: device.device_id,
          // Backend compatibility: keep existing editable fields and pass target field for servers that support reassignment.
          device_type: device.device_type,
          serial_number: device.serial_number,
          location_coords: device.location_coords,
          status: device.status,
          field_id: targetField,
        } as any,
        token,
      );

      const target = fields.find((field) => field.field_id === targetField);
      if (target) {
        setDevices((prev) =>
          prev.map((item) =>
            item.device_id === device.device_id
              ? {
                  ...item,
                  field_id: target.field_id,
                  field_name: target.name,
                }
              : item,
          ),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Device reassignment failed");
    } finally {
      setSavingDeviceId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
        <p className="text-muted-foreground">Read-only fleet monitoring with reassignment support only.</p>
      </div>

      <Alert className="bg-emerald-500/10 border-emerald-500/20">
        <Smartphone className="h-5 w-5 text-emerald-500" />
        <AlertTitle className="text-emerald-500">Mobile app handles provisioning</AlertTitle>
        <AlertDescription className="text-emerald-500/80">
          Device creation, hardware setup, and onboarding are mobile-only. Web supports monitoring and reassignment only.
        </AlertDescription>
      </Alert>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading devices...</p>}
      {!loading && !devices.length && <p className="text-sm text-muted-foreground">No devices found for selected farm.</p>}

      <div className="grid gap-4">
        {devices.map((device) => (
          <Card key={device.device_id} className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 min-w-0">
                  <Cpu className="h-4 w-4 text-primary" />
                  <span className="truncate">Device #{device.device_id}</span>
                </span>
                <Badge variant="outline" className="capitalize">
                  {device.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Current Field</p>
                  <p className="font-medium">{device.field_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Device Type</p>
                  <p className="font-medium">{device.device_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sensor Link</p>
                  <p className="font-medium">{device.serial_number || "—"}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Select
                  value={targetFieldByDevice[device.device_id] || String(device.field_id)}
                  onValueChange={(value) => setTargetFieldByDevice((prev) => ({ ...prev, [device.device_id]: value }))}
                >
                  <SelectTrigger className="sm:w-[280px]">
                    <SelectValue placeholder="Select target field" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((field) => (
                      <SelectItem key={field.field_id} value={String(field.field_id)}>
                        {field.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={savingDeviceId === device.device_id}
                  onClick={() => void reassignDevice(device)}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  {savingDeviceId === device.device_id ? "Reassigning..." : "Reassign to field"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
