import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { useAppData } from "../../contexts/AppDataContext";
import { api } from "../../lib/api";
import { Skeleton } from "../../components/ui/skeleton";
import { Download, Share2, SlidersHorizontal } from "lucide-react";

export function AnalyticsPage() {
  const { fields, activeFarmId } = useAppData();
  const [readings, setReadings] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (fields.length === 0) return;
    const fetchReadings = async () => {
      setLoading(true);
      try {
        const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const toDate = new Date().toISOString().split("T")[0];
        const results = await Promise.all(
          fields.slice(0, 3).map((f) =>
            api.web.fieldReadings(f.field_id, fromDate, toDate).catch(() => ({ readings: [] }))
          )
        );
        const all = results.flatMap((r) => r.readings);
        setReadings(all);
      } catch {
        setReadings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReadings();
  }, [fields]);

  const chartData = readings.length > 0
    ? readings.slice(0, 30).map((r, i) => ({
        time: i,
        temperature: r.temperature_air as number || 0,
        humidity: r.humidity_air as number || 0,
        soilMoisture: r.soil_moisture as number || 0,
      }))
    : [];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Historical data and trends</p>
        </div>
      </div>

      <Tabs defaultValue="sensors" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 border border-border/50">
          <TabsTrigger value="sensors">Sensor Trends</TabsTrigger>
          <TabsTrigger value="irrigation">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="sensors" className="space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Sensor Readings</CardTitle>
              <CardDescription>Temperature and humidity over time</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[400px]" />
              ) : chartData.length > 0 ? (
                <div className="h-[400px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="time" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #333", borderRadius: "8px" }} />
                      <Legend />
                      <Line type="monotone" dataKey="temperature" name="Temperature °C" stroke="#f97316" strokeWidth={2} />
                      <Line type="monotone" dataKey="humidity" name="Humidity %" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">No sensor data available yet. Ensure devices are sending readings.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="irrigation">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Events</CardTitle>
              <CardDescription>Event history and details</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-12">Event data will appear here once events are recorded.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
