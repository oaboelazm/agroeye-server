import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useAppData } from "../../contexts/AppDataContext";
import { api } from "../../lib/api";
import type { ScanHistoryItem } from "../../types/api";
import { ScanLine, AlertCircle, Leaf, RotateCcw, ImageIcon } from "lucide-react";

export function ScansPage() {
  const { fields } = useAppData();
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rescanningId, setRescanningId] = useState<string | null>(null);
  const [annotatedImages, setAnnotatedImages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (fields.length > 0 && selectedFieldId === null) {
      setSelectedFieldId(fields[0].field_id);
    }
  }, [fields, selectedFieldId]);

  const fetchScans = useCallback(async () => {
    if (!selectedFieldId) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.scan.history(selectedFieldId);
      setScans(res.history || []);
      setAnnotatedImages({});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load scans");
      setScans([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFieldId]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const handleRescan = async (scan: ScanHistoryItem) => {
    if (!scan.image_id) return;
    setRescanningId(scan.image_id);
    try {
      const res = await api.ai.rescan(scan.image_id, true);
      if (res.annotated_image_base64) {
        setAnnotatedImages((prev) => ({
          ...prev,
          [scan.image_id]: `data:image/jpeg;base64,${res.annotated_image_base64}`,
        }));
      }
      await fetchScans();
    } catch {
      // ignore
    } finally {
      setRescanningId(null);
    }
  };

  const confidenceColor = (score: number | null) => {
    if (score == null) return "text-muted-foreground";
    if (score >= 0.8) return "text-emerald-500";
    if (score >= 0.5) return "text-yellow-500";
    return "text-red-500";
  };

  const isHealthy = (disease: string | null) => {
    if (!disease) return false;
    return disease.toLowerCase() === "healthy";
  };

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Scan Analysis</h1>
        <p className="text-muted-foreground">Crop scan images and disease detection results</p>
      </div>

      {fields.length === 0 ? (
        <Card className="border-border/50 bg-card/50 p-12 text-center">
          <ScanLine className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-muted-foreground">No fields available. Scans are performed via the mobile app using ESP32-CAM modules.</p>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {fields.map((f) => (
              <Button
                key={f.field_id}
                variant={selectedFieldId === f.field_id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFieldId(f.field_id)}
                className="rounded-full shrink-0"
              >
                <Leaf className="w-3 h-3 mr-2" />
                {f.name}
              </Button>
            ))}
          </div>

          {loading ? (
            <Card className="border-border/50 bg-card/50 p-12 text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                <span>Loading scans...</span>
              </div>
            </Card>
          ) : error ? (
            <Card className="border-border/50 bg-card/50 p-12 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={fetchScans}>
                Retry
              </Button>
            </Card>
          ) : scans.length === 0 ? (
            <Card className="border-border/50 bg-card/50 p-12 text-center">
              <ScanLine className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-muted-foreground">No scans recorded for this field yet. Use the AgroEye mobile app to capture crop images with ESP32-CAM modules.</p>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="grid gap-6 pr-4">
                {scans.map((scan) => (
                  <Card key={scan.image_id} className="border-border/50 bg-card/50 overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      <div className="md:w-72 shrink-0 bg-muted/30 flex items-center justify-center">
                        {scan.image_path ? (
                          <img
                            src={api.imageUrl(scan.image_path)}
                            alt={`Scan ${scan.image_id.slice(0, 8)}`}
                            className="w-full h-56 md:h-48 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "";
                              (e.target as HTMLImageElement).classList.add("hidden");
                            }}
                          />
                        ) : (
                          <div className="w-full h-56 md:h-48 flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-5">
                        <CardHeader className="p-0 pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                <ScanLine className="h-4 w-4 text-emerald-500" />
                                Scan {scan.image_id.slice(0, 8)}...
                              </CardTitle>
                              <CardDescription>
                                {new Date(scan.capture_timestamp).toLocaleString()}
                                {scan.file_size ? ` · ${(scan.file_size / 1024).toFixed(1)} KB` : ""}
                              </CardDescription>
                            </div>
                            {scan.disease_detected && (
                              <Badge
                                variant={isHealthy(scan.disease_detected) ? "secondary" : "destructive"}
                                className="shrink-0"
                              >
                                {scan.disease_detected}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          {scan.disease_detected ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-muted-foreground">Confidence:</span>
                                <span className={`font-medium ${confidenceColor(scan.confidence_score)}`}>
                                  {scan.confidence_score != null
                                    ? `${(scan.confidence_score * 100).toFixed(1)}%`
                                    : "N/A"}
                                </span>
                              </div>
                              {scan.recommendation && (
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">Recommendation:</span>{" "}
                                  {scan.recommendation}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Analysis pending</p>
                          )}

                          {annotatedImages[scan.image_id] && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Annotated result:</p>
                              <img
                                src={annotatedImages[scan.image_id]}
                                alt="Annotated scan"
                                className="max-h-48 rounded-lg border border-border/50 object-contain"
                              />
                            </div>
                          )}

                          <div className="mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRescan(scan)}
                              disabled={rescanningId === scan.image_id}
                              className="gap-2"
                            >
                              <RotateCcw className={`h-3.5 w-3.5 ${rescanningId === scan.image_id ? "animate-spin" : ""}`} />
                              {rescanningId === scan.image_id ? "Rescanning..." : "Rescan"}
                            </Button>
                          </div>
                        </CardContent>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </>
      )}
    </div>
  );
}
