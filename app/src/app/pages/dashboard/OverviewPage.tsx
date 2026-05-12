import React, { useEffect, useState, useRef } from "react";
import {
  Activity,
  Battery,
  Droplets,
  Thermometer,
  Wind,
  Zap,
  Sun,
  AlertTriangle,
  WifiOff,
  Sprout,
  ScanLine,
} from "lucide-react";
import { useAppData } from "../../contexts/AppDataContext";
import { api } from "../../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { ScrollArea } from "../../components/ui/scroll-area";
import type { FieldSummary } from "../../types/domain";

export function OverviewPage() {
  const { farms, fields, devices, nodeStatuses, activeFarmId, loading } = useAppData();
  const [summaries, setSummaries] = useState<Record<number, FieldSummary>>({});
  const [summariesLoading, setSummariesLoading] = useState(false);
  const cacheRef = useRef<Record<number, FieldSummary>>({});

  const activeFarm = farms.find((f) => f.farm_id === activeFarmId);

  const totalFields = fields.length;
  const onlineDevices = devices.filter((d) => d.status === "online").length;
  const totalNodes = Object.values(nodeStatuses).reduce((sum, s) => sum + s.total_nodes, 0);
  const activeNodes = Object.values(nodeStatuses).reduce((sum, s) => sum + s.active, 0);
  const lowBatteryNodes = Object.values(nodeStatuses).reduce((sum, s) => sum + s.low_battery, 0);
  const alertsCount = Object.values(nodeStatuses).reduce(
    (sum, s) => sum + s.low_battery + s.offline + s.inactive,
    0
  );

  useEffect(() => {
    if (fields.length === 0) return;
    setSummariesLoading(true);
    const fetchSummaries = async () => {
      const results: Record<number, FieldSummary> = {};
      for (const field of fields) {
        if (cacheRef.current[field.field_id]) {
          results[field.field_id] = cacheRef.current[field.field_id];
          continue;
        }
        try {
          const summary = await api.reports.getSummary(field.field_id);
          cacheRef.current[field.field_id] = summary;
          results[field.field_id] = summary;
        } catch {
          results[field.field_id] = {
            devices_count: 0,
            latest_reading: null,
            averages: {},
            irrigation_summary: { last_event: null, events_last_30_days: 0 },
          };
        }
      }
      setSummaries(results);
      setSummariesLoading(false);
    };
    fetchSummaries();
  }, [fields]);

  const latestReadings = Object.values(summaries)
    .map((s) => s.latest_reading)
    .filter(Boolean);

  const latestReading = latestReadings[0] as Record<string, unknown> | null;

  const totalIrrigationEvents = Object.values(summaries).reduce(
    (sum, s) => sum + (s.irrigation_summary?.events_last_30_days ?? 0),
    0
  );

  const lastIrrigationEvent = Object.values(summaries)
    .map((s) => s.irrigation_summary?.last_event)
    .filter(Boolean)[0];

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
              <CardDescription>Latest data from active sensor nodes</CardDescription>
            </CardHeader>
            <CardContent>
              {summariesLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                  ))}
                </div>
              ) : latestReading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SensorMetric
                    title="Air Temp"
                    value={latestReading.temperature_air != null ? `${Number(latestReading.temperature_air).toFixed(1)}°C` : "N/A"}
                    icon={Thermometer}
                    color="text-orange-500"
                  />
                  <SensorMetric
                    title="Humidity"
                    value={latestReading.humidity_air != null ? `${Number(latestReading.humidity_air).toFixed(0)}%` : "N/A"}
                    icon={Wind}
                    color="text-blue-500"
                  />
                  <SensorMetric
                    title="Soil Moisture"
                    value={latestReading.soil_moisture != null ? `${Number(latestReading.soil_moisture).toFixed(0)}%` : "N/A"}
                    icon={Droplets}
                    color="text-emerald-500"
                  />
                  <SensorMetric
                    title="Soil Temp"
                    value={latestReading.temperature_soil != null ? `${Number(latestReading.temperature_soil).toFixed(1)}°C` : "N/A"}
                    icon={Thermometer}
                    color="text-orange-400"
                  />
                  <SensorMetric
                    title="Light"
                    value={latestReading.light_intensity != null ? `${Number(latestReading.light_intensity).toFixed(0)} lx` : "N/A"}
                    icon={Sun}
                    color="text-yellow-500"
                  />
                  <SensorMetric
                    title="CO2"
                    value={latestReading.co2 != null ? `${Number(latestReading.co2).toFixed(0)} ppm` : "N/A"}
                    icon={Wind}
                    color="text-gray-400"
                  />
                  <SensorMetric
                    title="Soil pH"
                    value={latestReading.soil_ph != null ? Number(latestReading.soil_ph).toFixed(1) : "N/A"}
                    icon={Activity}
                    color="text-purple-500"
                  />
                  <SensorMetric
                    title="Conductivity"
                    value={latestReading.conductivity != null ? `${Number(latestReading.conductivity).toFixed(1)} mS/cm` : "N/A"}
                    icon={Zap}
                    color="text-yellow-400"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No sensor readings available</p>
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
          {/* D. AI Insights Panel */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-emerald-500" />
                AI Insights
              </CardTitle>
              <CardDescription>Disease detection summary</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-6">
                Run crop scans to get AI-powered disease detection insights
              </p>
            </CardContent>
          </Card>

          {/* E. Irrigation Summary */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                Irrigation Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summariesLoading ? (
                <Skeleton className="h-20" />
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Events (30 days)</span>
                    <span className="text-lg font-bold">{totalIrrigationEvents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Last Event</span>
                    <span className="text-sm font-medium">
                      {lastIrrigationEvent
                        ? new Date(
                            (lastIrrigationEvent as any).start_time || (lastIrrigationEvent as any).sent_at
                          ).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                </>
              )}
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
