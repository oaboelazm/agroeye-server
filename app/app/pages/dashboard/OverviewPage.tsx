import React from "react";
import { AlertTriangle, Cpu, Droplets, Leaf, Thermometer, Waves } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { api } from "../../lib/api";
import { useAppData } from "../../contexts/AppDataContext";
import { useAuth } from "../../contexts/AuthContext";
import type { Device, Field, NotificationItem } from "../../types/domain";

type NodeSummary = {
  total_nodes: number;
  active: number;
  inactive: number;
  low_battery: number;
  offline: number;
};

type LatestReading = {
  timestamp?: string;
  temperature_air?: number;
  humidity_air?: number;
  soil_moisture?: number;
};

type FieldDashboard = {
  field: Field;
  devices: Device[];
  nodeSummary: NodeSummary;
  latestReading: LatestReading | null;
  aiHighlights: Record<string, number>;
  irrigationEvents30Days: number;
  lastIrrigationAt: string | null;
};

type OverviewData = {
  fields: FieldDashboard[];
  notifications: NotificationItem[];
};

const overviewCache = new Map<number, { ts: number; data: OverviewData }>();
const CACHE_TTL_MS = 60_000;

function defaultNodeSummary(): NodeSummary {
  return { total_nodes: 0, active: 0, inactive: 0, low_battery: 0, offline: 0 };
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function pickLatest(readings: Array<LatestReading | null>) {
  return readings
    .filter(Boolean)
    .sort((a, b) => new Date(b?.timestamp || 0).getTime() - new Date(a?.timestamp || 0).getTime())[0] || null;
}

export function OverviewPage() {
  const { user, token } = useAuth();
  const { farms, activeFarmId } = useAppData();
  const [data, setData] = React.useState<OverviewData>({ fields: [], notifications: [] });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadDashboardData = React.useCallback(async () => {
    if (!activeFarmId || !user?.user_id) {
      setData({ fields: [], notifications: [] });
      return;
    }

    const cached = overviewCache.get(activeFarmId);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setData(cached.data);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [fieldsResp, notificationsResp] = await Promise.all([
        api.post<{ fields: Field[] }>("/mobile/home/get-fields", { farm_id: activeFarmId }, token),
        api.post<{ notifications: NotificationItem[] }>(
          "/mobile/home/get-notifications",
          { user_id: user.user_id, farm_id: activeFarmId },
          token,
        ),
      ]);

      const fields = fieldsResp.fields || [];

      const fieldData = await Promise.all(
        fields.map(async (field) => {
          const [devicesResp, nodeResp, summaryResp, scanResp] = await Promise.all([
            api.post<{ devices: Device[] }>("/mobile/home/get-devices", { field_id: field.field_id }, token),
            api.post<{ status: string; summary: NodeSummary }>("/mobile/home/get-node-status", { field_id: field.field_id }, token),
            api.post<{ irrigation_summary?: { last_event?: { start_time?: string }; events_last_30_days?: number } }>(
              "/mobile/reports/get-summary",
              { field_id: field.field_id },
              token,
            ),
            api.post<{ history: Array<{ disease_detected?: string | null }> }>("/mobile/scan/history", { field_id: field.field_id }, token),
          ]);

          const devices = devicesResp.devices || [];

          const latestReadings = await Promise.all(
            devices.map(async (device) => {
              try {
                const latestResp = await api.post<{ latest_reading: LatestReading | null }>(
                  "/mobile/home/get-latest-reading",
                  { device_id: device.device_id },
                  token,
                );
                return latestResp.latest_reading;
              } catch {
                return null;
              }
            }),
          );

          const aiHighlights: Record<string, number> = {};
          for (const item of scanResp.history || []) {
            if (!item.disease_detected) continue;
            aiHighlights[item.disease_detected] = (aiHighlights[item.disease_detected] || 0) + 1;
          }

          return {
            field,
            devices,
            nodeSummary: nodeResp.summary || defaultNodeSummary(),
            latestReading: pickLatest(latestReadings),
            aiHighlights,
            irrigationEvents30Days: summaryResp.irrigation_summary?.events_last_30_days || 0,
            lastIrrigationAt: summaryResp.irrigation_summary?.last_event?.start_time || null,
          } as FieldDashboard;
        }),
      );

      const nextData = { fields: fieldData, notifications: notificationsResp.notifications || [] };
      overviewCache.set(activeFarmId, { ts: Date.now(), data: nextData });
      setData(nextData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [activeFarmId, user?.user_id, token]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      loadDashboardData();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [loadDashboardData]);

  const totalFields = data.fields.length;
  const totalDevices = data.fields.reduce((sum, item) => sum + item.devices.length, 0);
  const activeDevices = data.fields.reduce(
    (sum, item) => sum + item.devices.filter((device) => !["inactive", "offline"].includes(device.status.toLowerCase())).length,
    0,
  );
  const alertsCount = data.notifications.filter((notification) => !notification.is_read).length;

  const aggregateNodeSummary = data.fields.reduce(
    (acc, item) => ({
      total_nodes: acc.total_nodes + item.nodeSummary.total_nodes,
      active: acc.active + item.nodeSummary.active,
      inactive: acc.inactive + item.nodeSummary.inactive,
      low_battery: acc.low_battery + item.nodeSummary.low_battery,
      offline: acc.offline + item.nodeSummary.offline,
    }),
    defaultNodeSummary(),
  );

  const aiDiseaseTotals = data.fields.reduce<Record<string, number>>((acc, item) => {
    for (const [disease, count] of Object.entries(item.aiHighlights)) {
      acc[disease] = (acc[disease] || 0) + count;
    }
    return acc;
  }, {});

  const topAiHighlights = Object.entries(aiDiseaseTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const irrigation30Days = data.fields.reduce((sum, item) => sum + item.irrigationEvents30Days, 0);
  const latestIrrigation = data.fields
    .map((item) => item.lastIrrigationAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b || 0).getTime() - new Date(a || 0).getTime())[0];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground">Live monitoring for your selected farm.</p>
        </div>
        <Badge variant="outline">{loading ? "Refreshing..." : "Live"}</Badge>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Farms" value={String(farms.length)} icon={Leaf} />
        <StatCard title="Total Fields" value={String(totalFields)} icon={Waves} />
        <StatCard title="Active Devices" value={`${activeDevices}/${totalDevices}`} icon={Cpu} />
        <StatCard title="Alerts" value={String(alertsCount)} icon={AlertTriangle} alert={alertsCount > 0} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>Live Sensor Panel</CardTitle>
            <CardDescription>Latest readings per field</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data.fields.length && <p className="text-sm text-muted-foreground">No field sensor data available.</p>}
            {data.fields.map((item) => (
              <div key={item.field.field_id} className="rounded-lg border border-border/60 p-3">
                <p className="text-sm font-medium mb-2">{item.field.name}</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <Metric icon={Thermometer} label="Temp" value={item.latestReading?.temperature_air ? `${item.latestReading.temperature_air.toFixed(1)}°C` : "—"} />
                  <Metric icon={Droplets} label="Humidity" value={item.latestReading?.humidity_air ? `${item.latestReading.humidity_air.toFixed(1)}%` : "—"} />
                  <Metric icon={Waves} label="Soil" value={item.latestReading?.soil_moisture ? `${item.latestReading.soil_moisture.toFixed(1)}%` : "—"} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>Device Status Panel</CardTitle>
            <CardDescription>Node health summary</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <StatusChip label="Active" value={aggregateNodeSummary.active} />
            <StatusChip label="Inactive" value={aggregateNodeSummary.inactive} />
            <StatusChip label="Offline" value={aggregateNodeSummary.offline} />
            <StatusChip label="Low Battery" value={aggregateNodeSummary.low_battery} highlight={aggregateNodeSummary.low_battery > 0} />
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>AI Insights Panel</CardTitle>
            <CardDescription>Disease detection highlights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {!topAiHighlights.length && <p className="text-muted-foreground">No disease detections found in recent scans.</p>}
            {topAiHighlights.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <span>{name}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>Irrigation Summary</CardTitle>
            <CardDescription>Recent irrigation activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-muted-foreground">Last Irrigation Event</p>
              <p className="font-medium">{formatDateTime(latestIrrigation)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-muted-foreground">Events (Last 30 days)</p>
              <p className="font-medium">{irrigation30Days}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, alert = false }: { title: string; value: string; icon: React.ComponentType<any>; alert?: boolean }) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className={alert ? "text-xl font-semibold text-red-500" : "text-xl font-semibold"}>{value}</p>
        </div>
        <Icon className={alert ? "w-5 h-5 text-red-500" : "w-5 h-5 text-muted-foreground"} />
      </CardContent>
    </Card>
  );
}

function StatusChip({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className={highlight ? "font-semibold text-red-500" : "font-semibold"}>{value}</p>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ComponentType<any>; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-2 border border-border/50">
      <div className="flex items-center gap-1 text-muted-foreground text-xs">
        <Icon className="w-3 h-3" />
        <span>{label}</span>
      </div>
      <p className="font-medium text-sm mt-1">{value}</p>
    </div>
  );
}
