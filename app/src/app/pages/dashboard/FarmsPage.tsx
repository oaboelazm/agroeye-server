import React from "react";
import { useAppData } from "../../contexts/AppDataContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { MapPin, Grid3X3, Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";

export function FarmsPage() {
  const { farms, loading } = useAppData();

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Farms</h1>
          <p className="text-muted-foreground">All registered farm locations</p>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : farms.length === 0 ? (
        <Card className="border-border/50 bg-card/50 p-12 text-center">
          <p className="text-muted-foreground">No farms found. Create one using the mobile app.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farms.map((farm) => (
            <Card key={farm.farm_id} className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-emerald-500/30 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Grid3X3 className="h-5 w-5 text-emerald-500" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-1">{farm.name}</h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                  <MapPin className="h-3.5 w-3.5" />
                  {farm.location}
                </div>
                <p className="text-xs text-muted-foreground">{farm.area_size} ha</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
