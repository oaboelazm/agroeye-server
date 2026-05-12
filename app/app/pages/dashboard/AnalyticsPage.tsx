import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { Download, Share2, Calendar as CalendarIcon, SlidersHorizontal } from "lucide-react";

const multiMetricData = [
  { day: 'Mon', soilMoisture: 45, temperature: 22, yield: 85, waterUsed: 120 },
  { day: 'Tue', soilMoisture: 42, temperature: 24, yield: 85, waterUsed: 110 },
  { day: 'Wed', soilMoisture: 55, temperature: 23, yield: 88, waterUsed: 140 }, // Irrigated
  { day: 'Thu', soilMoisture: 50, temperature: 25, yield: 89, waterUsed: 100 },
  { day: 'Fri', soilMoisture: 46, temperature: 26, yield: 90, waterUsed: 105 },
  { day: 'Sat', soilMoisture: 40, temperature: 28, yield: 91, waterUsed: 95 },
  { day: 'Sun', soilMoisture: 58, temperature: 25, yield: 93, waterUsed: 150 }, // Irrigated
];

export function AnalyticsPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Intelligence & Analytics</h1>
          <p className="text-muted-foreground">Historical data, trend forecasting, and sensor correlations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2"><CalendarIcon className="w-4 h-4" /> Last 7 Days</Button>
          <Button variant="outline" size="sm" className="gap-2"><SlidersHorizontal className="w-4 h-4" /> Filters</Button>
          <div className="h-6 w-px bg-border mx-2" />
          <Button variant="outline" size="sm" className="gap-2"><Share2 className="w-4 h-4" /> Share</Button>
          <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"><Download className="w-4 h-4" /> Export CSV</Button>
        </div>
      </div>

      <Tabs defaultValue="correlations" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 border border-border/50">
          <TabsTrigger value="correlations">Sensor Correlations</TabsTrigger>
          <TabsTrigger value="irrigation">Irrigation Efficiency</TabsTrigger>
          <TabsTrigger value="forecasting">Trend Forecasting</TabsTrigger>
        </TabsList>

        <TabsContent value="correlations" className="space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Temperature vs Soil Moisture Impact</CardTitle>
              <CardDescription>Observe how environmental heat affects soil retention across sectors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={multiMetricData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid key="grid1" strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis key="xaxis1" dataKey="day" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis key="yAxisLeft" yAxisId="left" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis key="yAxisRight" yAxisId="right" orientation="right" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip key="tooltip1" contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }} />
                    <Legend key="legend1" />
                    <Line key="lineLeft" yAxisId="left" type="monotone" dataKey="soilMoisture" name="Soil Moisture (%)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line key="lineRight" yAxisId="right" type="monotone" dataKey="temperature" name="Air Temp (°C)" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Resource Utilization (Water)</CardTitle>
                <CardDescription>Daily irrigation output in Liters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={multiMetricData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid key="grid2" strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis key="xaxis2" dataKey="day" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis key="yaxis2" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip key="tooltip2" cursor={{ fill: '#27272a' }} contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333' }} />
                      <Bar key="bar2" dataKey="waterUsed" name="Water (L)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Crop Yield Projection Tracking</CardTitle>
                <CardDescription>Estimated yield health index over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={multiMetricData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid key="grid3" strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis key="xaxis3" dataKey="day" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis key="yaxis3" stroke="#888" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                      <Tooltip key="tooltip3" contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333' }} />
                      <Line key="line3" type="monotone" dataKey="yield" name="Yield Index" stroke="#10b981" strokeWidth={3} fill="#10b981" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
