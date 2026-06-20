import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { useAppData } from "../../contexts/AppDataContext";
import { api } from "../../lib/api";
import { Skeleton } from "../../components/ui/skeleton";
import { Badge } from "../../components/ui/badge";
import { FileText, Thermometer, Droplets, Sprout, Eye, ChevronDown, ChevronUp, Calendar } from "lucide-react";

interface FieldReport {
  field_id: number;
  field_name: string;
  devices_count: number;
  avg_temperature_air: number | null;
  avg_humidity_air: number | null;
  avg_soil_moisture: number | null;
  avg_soil_ph: number | null;
  avg_nitrogen: number | null;
  avg_phosphorus: number | null;
  avg_potassium: number | null;
  avg_conductivity: number | null;
  avg_light_intensity: number | null;
  avg_co2: number | null;
  last_irrigation: string | null;
  irrigation_30d_count: number;
}

export function ReportsPage() {
  const { fields, activeFarmId } = useAppData();
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [fieldReports, setFieldReports] = useState<FieldReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedField, setExpandedField] = useState<number | null>(null);
  const [readings, setReadings] = useState<Record<string, unknown>[]>([]);
  const [readingsLoading, setReadingsLoading] = useState(false);

  useEffect(() => {
    if (!activeFarmId) return;
    setLoading(true);
    Promise.all([
      api.web.reportsSummary(activeFarmId).catch(() => null),
      ...fields.map((f) =>
        api.web.reportField(f.field_id).catch(() => null)
      ),
    ])
      .then((results) => {
        setSummary(results[0] as Record<string, unknown> | null);
        setFieldReports(results.slice(1).filter(Boolean) as FieldReport[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeFarmId, fields]);

  const fetchReadings = async (fieldId: number) => {
    if (expandedField === fieldId) {
      setExpandedField(null);
      return;
    }
    setExpandedField(fieldId);
    setReadingsLoading(true);
    const to = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    try {
      const res = await api.web.fieldReadings(fieldId, from, to);
      setReadings(res.readings.slice(0, 20));
    } catch {
      setReadings([]);
    } finally {
      setReadingsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Field and device report summaries</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="Total Fields" value={summary.total_fields as number} icon={Sprout} />
          <SummaryCard label="Total Devices" value={summary.total_devices as number} icon={FileText} />
          <SummaryCard label="Irrigation Events" value={summary.total_irrigation_events as number} icon={Droplets} />
          <SummaryCard label="Avg Air Temp" value={summary.avg_temperature_air != null ? `${Number(summary.avg_temperature_air).toFixed(1)}°C` : "N/A"} icon={Thermometer} />
        </div>
      )}

      {/* Farm Averages */}
      {summary && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Farm-wide Sensor Averages</CardTitle>
            <CardDescription>Overall averages across all fields</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBox label="Air Temp" value={summary.avg_temperature_air} unit="°C" />
              <StatBox label="Humidity" value={summary.avg_humidity_air} unit="%" />
              <StatBox label="Soil Moisture" value={summary.avg_soil_moisture} unit="%" />
              <StatBox label="Soil pH" value={summary.avg_soil_ph} />
              <StatBox label="Nitrogen (N)" value={summary.avg_nitrogen} />
              <StatBox label="Phosphorus (P)" value={summary.avg_phosphorus} />
              <StatBox label="Potassium (K)" value={summary.avg_potassium} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Field Reports */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Field Reports</h2>
        {fieldReports.length === 0 ? (
          <Card className="border-border/50 bg-card/50 p-12 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-muted-foreground">No field reports available yet. Ensure devices are sending data.</p>
          </Card>
        ) : (
          fieldReports.map((r) => (
            <Card key={r.field_id} className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <FileText className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{r.field_name}</CardTitle>
                      <CardDescription>{r.devices_count} device{r.devices_count !== 1 ? "s" : ""}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      {r.irrigation_30d_count} events / 30d
                    </Badge>
                    <button
                      onClick={() => fetchReadings(r.field_id)}
                      className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {expandedField === r.field_id ? "Hide" : "View"} readings
                      {expandedField === r.field_id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatBox label="Air Temp" value={r.avg_temperature_air} unit="°C" />
                  <StatBox label="Humidity" value={r.avg_humidity_air} unit="%" />
                  <StatBox label="Soil Moisture" value={r.avg_soil_moisture} unit="%" />
                  <StatBox label="Soil pH" value={r.avg_soil_ph} />
                  <StatBox label="Nitrogen" value={r.avg_nitrogen} />
                  <StatBox label="Phosphorus" value={r.avg_phosphorus} />
                  <StatBox label="Potassium" value={r.avg_potassium} />
                  <StatBox label="Conductivity" value={r.avg_conductivity} unit="mS/cm" />
                  <StatBox label="Light" value={r.avg_light_intensity} unit="lx" />
                  <StatBox label="CO2" value={r.avg_co2} unit="ppm" />
                  <StatBox label="Last Irrigation" value={r.last_irrigation ? new Date(r.last_irrigation).toLocaleDateString() : "N/A"} />
                </div>

                {r.last_irrigation && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Last irrigation: {new Date(r.last_irrigation).toLocaleString()}
                  </p>
                )}

                {/* Expanded readings */}
                {expandedField === r.field_id && (
                  <div className="mt-4 border-t border-border/50 pt-4">
                    <p className="text-xs text-muted-foreground mb-3">Recent readings (last 7 days)</p>
                    {readingsLoading ? (
                      <Skeleton className="h-24" />
                    ) : readings.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted-foreground border-b border-border/50">
                              <th className="text-left py-2 pr-3">Time</th>
                              <th className="text-right px-2">Air Temp</th>
                              <th className="text-right px-2">Humidity</th>
                              <th className="text-right px-2">Moisture</th>
                              <th className="text-right px-2">pH</th>
                              <th className="text-right px-2">N</th>
                              <th className="text-right px-2">P</th>
                              <th className="text-right px-2">K</th>
                            </tr>
                          </thead>
                          <tbody>
                            {readings.map((rd, i) => (
                              <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                                <td className="py-2 pr-3 text-muted-foreground">
                                  {rd.timestamp ? new Date(rd.timestamp as string).toLocaleString() : "-"}
                                </td>
                                <td className="text-right px-2">{rd.temperature_air != null ? Number(rd.temperature_air).toFixed(1) : "-"}</td>
                                <td className="text-right px-2">{rd.humidity_air != null ? Number(rd.humidity_air).toFixed(0) : "-"}</td>
                                <td className="text-right px-2">{rd.soil_moisture != null ? Number(rd.soil_moisture).toFixed(0) : "-"}</td>
                                <td className="text-right px-2">{rd.soil_ph != null ? Number(rd.soil_ph).toFixed(1) : "-"}</td>
                                <td className="text-right px-2">{rd.nitrogen != null ? Number(rd.nitrogen).toFixed(1) : "-"}</td>
                                <td className="text-right px-2">{rd.phosphorus != null ? Number(rd.phosphorus).toFixed(1) : "-"}</td>
                                <td className="text-right px-2">{rd.potassium != null ? Number(rd.potassium).toFixed(1) : "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">No readings in the last 7 days.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: number | string; icon: React.ElementType }) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 bg-muted rounded-lg">
          <Icon className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{typeof value === "number" ? value : value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value, unit }: { label: string; value: number | string | null | undefined; unit?: string }) {
  const display = value != null
    ? `${typeof value === "number" ? value.toFixed(1) : value}${unit ?? ""}`
    : "N/A";
  return (
    <div className="p-2.5 rounded-lg bg-muted/20 border border-border/50">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold mt-0.5">{display}</p>
    </div>
  );
}
