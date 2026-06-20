import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { useAppData } from "../../contexts/AppDataContext";
import { api } from "../../lib/api";
import { Skeleton } from "../../components/ui/skeleton";
import { format, parseISO, startOfWeek, startOfMonth } from "date-fns";

type Period = "daily" | "weekly" | "monthly";

const METRICS = [
  { key: "temperature_air", label: "Air Temp (°C)", color: "#f97316" },
  { key: "humidity_air", label: "Humidity (%)", color: "#3b82f6" },
  { key: "soil_moisture", label: "Soil Moisture (%)", color: "#10b981" },
  { key: "temperature_soil", label: "Soil Temp (°C)", color: "#ea580c" },
  { key: "soil_ph", label: "Soil pH", color: "#a855f7" },
  { key: "conductivity", label: "Conductivity (mS/cm)", color: "#eab308" },
  { key: "light_intensity", label: "Light (lux)", color: "#f59e0b" },
  { key: "co2", label: "CO2 (ppm)", color: "#6b7280" },
  { key: "nitrogen", label: "Nitrogen (N)", color: "#22c55e" },
  { key: "phosphorus", label: "Phosphorus (P)", color: "#ef4444" },
  { key: "potassium", label: "Potassium (K)", color: "#8b5cf6" },
];

function getDateRange(period: Period) {
  const now = new Date();
  const to = now.toISOString().split("T")[0];
  let from: Date;
  switch (period) {
    case "daily":
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "weekly":
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "monthly":
      from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
  }
  return { from: from.toISOString().split("T")[0], to };
}

function aggregateReadings(
  readings: Record<string, unknown>[],
  period: Period
): Array<Record<string, unknown>> {
  const groups = new Map<string, { count: number; sums: Record<string, number> }>();

  for (const r of readings) {
    const ts = (r.timestamp as string) || "";
    if (!ts) continue;
    const d = parseISO(ts);
    let key: string;
    switch (period) {
      case "daily":
        key = format(d, "yyyy-MM-dd");
        break;
      case "weekly":
        key = format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
        break;
      case "monthly":
        key = format(startOfMonth(d), "yyyy-MM-dd");
        break;
    }

    if (!groups.has(key)) {
      groups.set(key, { count: 0, sums: {} });
    }
    const g = groups.get(key)!;
    g.count++;
    for (const m of METRICS) {
      const v = r[m.key];
      if (typeof v === "number") {
        g.sums[m.key] = (g.sums[m.key] || 0) + v;
      }
    }
  }

  const result = Array.from(groups.entries())
    .map(([key, g]) => {
      const point: Record<string, unknown> = { date: key, label: key };
      for (const m of METRICS) {
        const sum = g.sums[m.key];
        point[m.key] = sum != null ? Number((sum / g.count).toFixed(2)) : null;
      }
      return point;
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return result;
}

export function AnalyticsPage() {
  const { fields } = useAppData();
  const [readings, setReadings] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<Period>("daily");
  const [selectedFieldId, setSelectedFieldId] = useState<string>("all");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["temperature_air", "humidity_air", "soil_moisture"]);

  const activeFields = useMemo(
    () => fields.filter((f) => !selectedFieldId || selectedFieldId === "all" || f.field_id === Number(selectedFieldId)),
    [fields, selectedFieldId]
  );

  useEffect(() => {
    if (activeFields.length === 0) return;
    setLoading(true);
    const { from, to } = getDateRange(period);
    Promise.all(
      activeFields.map((f) =>
        api.web.fieldReadings(f.field_id, from, to).catch(() => ({ readings: [] }))
      )
    )
      .then((results) => {
        const all = results.flatMap((r) => r.readings);
        setReadings(all);
      })
      .catch(() => setReadings([]))
      .finally(() => setLoading(false));
  }, [activeFields, period]);

  const chartData = useMemo(() => aggregateReadings(readings, period), [readings, period]);

  const toggleMetric = (key: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Historical sensor data and trends</p>
        </div>
      </div>

      <Tabs defaultValue="sensors" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 border border-border/50">
          <TabsTrigger value="sensors">Sensor Trends</TabsTrigger>
          <TabsTrigger value="irrigation">Events</TabsTrigger>
          <TabsTrigger value="npk">NPK Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="sensors" className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Field:</span>
              <Select value={selectedFieldId} onValueChange={setSelectedFieldId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fields</SelectItem>
                  {fields.map((f) => (
                    <SelectItem key={f.field_id} value={String(f.field_id)}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Period:</span>
              <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} className="h-9">
                <TabsList className="h-9">
                  <TabsTrigger value="daily" className="text-xs px-3">Daily</TabsTrigger>
                  <TabsTrigger value="weekly" className="text-xs px-3">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly" className="text-xs px-3">Monthly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Metric selector */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center">Metrics:</span>
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => toggleMetric(m.key)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedMetrics.includes(m.key)
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                    : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Sensor Readings — {period === "daily" ? "Daily" : period === "weekly" ? "Weekly" : "Monthly"} Average</CardTitle>
              <CardDescription>
                {activeFields.length === 1
                  ? `Field: ${activeFields[0].name}`
                  : `All fields (${activeFields.length} selected)`}
                {chartData.length > 0 && ` — ${chartData.length} data points`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[400px]" />
              ) : chartData.length > 0 ? (
                <div className="h-[400px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#888"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#18181b", border: "1px solid #333", borderRadius: "8px" }}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Legend />
                      {selectedMetrics.map((key) => {
                        const meta = METRICS.find((m) => m.key === key);
                        return (
                          <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            name={meta?.label ?? key}
                            stroke={meta?.color ?? "#888"}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                            connectNulls
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">
                  No sensor data available for the selected period. Ensure devices are sending readings.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Summary statistics for selected period */}
          {chartData.length > 0 && (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Period Summary</CardTitle>
                <CardDescription>Average values across the selected time range</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedMetrics.map((key) => {
                    const meta = METRICS.find((m) => m.key === key);
                    const values = chartData.map((d) => d[key] as number).filter((v) => v != null);
                    if (values.length === 0) return null;
                    const avg = values.reduce((a, b) => a + b, 0) / values.length;
                    const max = Math.max(...values);
                    const min = Math.min(...values);
                    return (
                      <div key={key} className="p-3 rounded-xl bg-muted/20 border border-border/50">
                        <p className="text-xs text-muted-foreground mb-1" style={{ color: meta?.color }}>
                          {meta?.label ?? key}
                        </p>
                        <p className="text-sm font-semibold">
                          Avg: {avg.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Min: {min.toFixed(1)} &middot; Max: {max.toFixed(1)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="irrigation">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Events</CardTitle>
              <CardDescription>Irrigation and AI events history</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-12">
                Event data will appear here once events are recorded. Check the Reports page for irrigation history.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="npk">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>NPK Analysis</CardTitle>
              <CardDescription>Soil nutrient trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[400px]" />
              ) : chartData.length > 0 ? (
                <div className="h-[400px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.slice(-30)} margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="label" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#18181b", border: "1px solid #333", borderRadius: "8px" }}
                      />
                      <Legend />
                      <Bar dataKey="nitrogen" name="Nitrogen (N)" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="phosphorus" name="Phosphorus (P)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="potassium" name="Potassium (K)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">
                  No nutrient data available yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
