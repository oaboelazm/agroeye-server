import React, { useEffect, useState } from "react";
import {
  Activity,
  Droplets,
  Thermometer,
  Wind,
  Zap,
  Sun,
  AlertTriangle,
  Sprout,
  ScanLine,
} from "lucide-react";
import { useAppData } from "../../contexts/AppDataContext";
import { api } from "../../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";


interface SensorReading {
  device_id: number;
  timestamp?: string;
  temperature_air?: number | null;
  humidity_air?: number | null;
  temperature_soil?: number | null;
  humidity_soil?: number | null;
  soil_moisture?: number | null;
  soil_ph?: number | null;
  nitrogen?: number | null;
  phosphorus?: number | null;
  potassium?: number | null;
  conductivity?: number | null;
  light_intensity?: number | null;
  co2?: number | null;
}

export function OverviewPage() {
  const { farms, fields, devices, nodeStatuses, activeFarmId, dashboardData, loading } = useAppData();
  const [latestReadings, setLatestReadings] = useState<SensorReading[]>([]);
  const [readingsLoading, setReadingsLoading] = useState(false);

  const activeFarm = farms.find((f) => f.farm_id === activeFarmId);

  const totalFields = dashboardData?.total_fields ?? fields.length;
  const onlineDevices = dashboardData?.active_devices ?? devices.filter((d) => d.status === "active").length;
  const totalNodes = dashboardData?.total_nodes ?? Object.values(nodeStatuses).reduce((sum, s) => sum + s.total_nodes, 0);
  const activeNodes = dashboardData?.active_nodes ?? Object.values(nodeStatuses).reduce((sum, s) => sum + s.active, 0);
  const lowBatteryNodes = dashboardData?.low_battery_nodes ?? Object.values(nodeStatuses).reduce((sum, s) => sum + s.low_battery, 0);
  const alertsCount = dashboardData?.alerts_count ?? Object.values(nodeStatuses).reduce(
    (sum, s) => sum + s.low_battery + s.offline + s.inactive,
    0
  );

  useEffect(() => {
    if (!activeFarmId) return;
    setReadingsLoading(true);
    api.web.sensorsLatest(undefined, activeFarmId)
      .then((res) => setLatestReadings((res.readings ?? []) as SensorReading[]))
      .catch(() => setLatestReadings([]))
      .finally(() => setReadingsLoading(false));
  }, [activeFarmId]);

  const readingsByField = latestReadings.reduce<Record<number, SensorReading[]>>((acc, r) => {
    const device = devices.find((d) => d.device_id === r.device_id);
    const fid = device?.field_id ?? 0;
    if (!acc[fid]) acc[fid] = [];
    acc[fid].push(r);
    return acc;
  }, {});

  const totalIrrigationEvents = dashboardData?.today_irrigation_events ?? 0;
  const todayIrrigationDuration = dashboardData?.today_irrigation_duration_minutes ?? 0;

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/50"><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {activeFarm ? `Overview of ${activeFarm.name}` : "Monitoring overview"}
          </p>
        </div>
      </div>

      {/* A. Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <OverviewCard title="Total Farms" value={farms.length} icon={Sprout} />
        <OverviewCard title="Total Fields" value={totalFields} icon={Activity} />
        <OverviewCard
          title="Active Devices"
          value={`${onlineDevices}/${devices.length}`}
          icon={Zap}
        />
        <OverviewCard
          title="Alerts"
          value={alertsCount}
          icon={AlertTriangle}
          alert={alertsCount > 0}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* B. Live Sensor Panel */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Live Sensor Readings</CardTitle>
              <CardDescription>Latest data from active sensor nodes across all fields</CardDescription>
            </CardHeader>
            <CardContent>
              {readingsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                  ))}
                </div>
              ) : latestReadings.length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(readingsByField).map(([fieldId, fieldReadings]) => {
                    const field = fields.find((f) => f.field_id === Number(fieldId));
                    return (
                      <div key={fieldId}>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                          <Sprout className="h-3.5 w-3.5" />
                          {field?.name ?? `Field #${fieldId}`}
                          <span className="text-xs font-normal text-muted-foreground/60">
                            ({fieldReadings.length} device{fieldReadings.length > 1 ? "s" : ""})
                          </span>
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {(() => {
                            const r = fieldReadings[0];
                            return (
                              <>
                                <SensorMetric title="Air Temp" value={r.temperature_air != null ? `${Number(r.temperature_air).toFixed(1)}°C` : "N/A"} icon={Thermometer} color="text-orange-500" />
                                <SensorMetric title="Humidity" value={r.humidity_air != null ? `${Number(r.humidity_air).toFixed(0)}%` : "N/A"} icon={Wind} color="text-blue-500" />
                                <SensorMetric title="Soil Moisture" value={r.soil_moisture != null ? `${Number(r.soil_moisture).toFixed(0)}%` : "N/A"} icon={Droplets} color="text-emerald-500" />
                                <SensorMetric title="Soil Temp" value={r.temperature_soil != null ? `${Number(r.temperature_soil).toFixed(1)}°C` : "N/A"} icon={Thermometer} color="text-orange-400" />
                                <SensorMetric title="Light" value={r.light_intensity != null ? `${Number(r.light_intensity).toFixed(0)} lx` : "N/A"} icon={Sun} color="text-yellow-500" />
                                <SensorMetric title="CO2" value={r.co2 != null ? `${Number(r.co2).toFixed(0)} ppm` : "N/A"} icon={Wind} color="text-gray-400" />
                                <SensorMetric title="Soil pH" value={r.soil_ph != null ? Number(r.soil_ph).toFixed(1) : "N/A"} icon={Activity} color="text-purple-500" />
                                <SensorMetric title="Conductivity" value={r.conductivity != null ? `${Number(r.conductivity).toFixed(1)} mS/cm` : "N/A"} icon={Zap} color="text-yellow-400" />
                              </>
                            );
                          })()}
                        </div>
                        {fieldReadings.length > 1 && (
                          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                            <p className="text-xs text-muted-foreground col-span-4">
                              {fieldReadings.length - 1} more device{fieldReadings.length > 2 ? "s" : ""} reporting —
                              <span className="text-xs text-muted-foreground/60 ml-1">
                                {fieldReadings.slice(1).map((dr) => {
                                  const dev = devices.find((d) => d.device_id === dr.device_id);
                                  return dev?.device_type ?? `device #${dr.device_id}`;
                                }).join(", ")}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No sensor readings available. Ensure devices are sending data.</p>
              )}
            </CardContent>
          </Card>

          {/* C. Device Status Panel */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Device Status</CardTitle>
              <CardDescription>Node health across all fields</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatusCard label="Active Nodes" value={activeNodes} color="text-emerald-500" bg="bg-emerald-500/10" />
                <StatusCard label="Inactive" value={Object.values(nodeStatuses).reduce((s, n) => s + n.inactive, 0)} color="text-muted-foreground" bg="bg-muted" />
                <StatusCard label="Offline" value={Object.values(nodeStatuses).reduce((s, n) => s + n.offline, 0)} color="text-red-500" bg="bg-red-500/10" />
                <StatusCard label="Low Battery" value={lowBatteryNodes} color="text-amber-500" bg="bg-amber-500/10" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* D. AgroAssist Panel */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-emerald-500" />
                AgroAssist
              </CardTitle>
              <CardDescription>Disease detection summary</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-6">
                Run crop scans to get AI-powered disease detection insights
              </p>
            </CardContent>
          </Card>

          {/* E. Events Summary */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Today Events</span>
                <span className="text-lg font-bold">{totalIrrigationEvents}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Today Duration</span>
                <span className="text-sm font-medium">
                  {todayIrrigationDuration > 0 ? `${todayIrrigationDuration.toFixed(0)} min` : "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm bg-gradient-to-br from-card to-emerald-900/10">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">System Status</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <span className="text-sm font-semibold text-emerald-500">Operational</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeFarm?.location || ""}
                  </p>
                </div>
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                  {farms.length} farm{farms.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OverviewCard({
  title,
  value,
  icon: Icon,
  alert = false,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  alert?: boolean;
}) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
        <div className="flex justify-between items-start">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <Icon className={`w-4 h-4 ${alert ? "text-red-500" : "text-muted-foreground"}`} />
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className={`text-2xl font-bold ${alert ? "text-red-500" : ""}`}>{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

function SensorMetric({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-muted/30 border border-border/50 flex flex-col gap-3 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg bg-background shadow-sm ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function StatusCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-4 border border-border/50`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
