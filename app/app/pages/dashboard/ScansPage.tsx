import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ScanLine, Image as ImageIcon, CheckCircle, AlertTriangle } from "lucide-react";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";

export function ScansPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Scan Analysis</h1>
          <p className="text-muted-foreground">Historical ESP32-CAM images and disease detection logs</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden group cursor-pointer">
            <div className="aspect-[4/3] bg-muted relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                 <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <ImageWithFallback src={`https://images.unsplash.com/photo-1592652417740-4c311c1e5509?q=80&w=400&auto=format&fit=crop&sig=${i}`} alt="Leaf scan" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity mix-blend-overlay" />
              
              <div className="absolute top-2 right-2 flex gap-2">
                {i % 3 === 0 ? (
                  <div className="bg-yellow-500/90 text-black text-xs px-2 py-1 rounded-md font-bold flex items-center gap-1 backdrop-blur-md">
                    <AlertTriangle className="w-3 h-3" /> Blight Detected (89%)
                  </div>
                ) : (
                  <div className="bg-emerald-500/90 text-white text-xs px-2 py-1 rounded-md font-bold flex items-center gap-1 backdrop-blur-md">
                    <CheckCircle className="w-3 h-3" /> Healthy (98%)
                  </div>
                )}
              </div>
            </div>
            <CardContent className="p-4">
              <p className="font-medium text-sm">Sector A - Node 2</p>
              <p className="text-xs text-muted-foreground mt-1">Today at 14:00 PM</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
