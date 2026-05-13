import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useAppData } from "../../contexts/AppDataContext";
import { api } from "../../lib/api";
import type { ScanHistoryItem } from "../../types/api";
import { ScanLine, AlertCircle, Leaf, RotateCcw, ImageIcon, Calendar, FileText, Maximize2, X, ZoomIn } from "lucide-react";

export function ScansPage() {
  const { fields } = useAppData();
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rescanningId, setRescanningId] = useState<string | null>(null);
  const [annotatedImages, setAnnotatedImages] = useState<Record<string, string>>({});
  const [imageBlobs, setImageBlobs] = useState<Record<string, string>>({});
  const [detailScan, setDetailScan] = useState<ScanHistoryItem | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const blobUrlsRef = useRef<string[]>([]);

  const revokeBlobs = () => {
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
  };

  useEffect(() => {
    if (fields.length > 0 && selectedFieldId === null) {
      setSelectedFieldId(fields[0].field_id);
    }
  }, [fields, selectedFieldId]);

  const fetchScans = useCallback(async () => {
    if (!selectedFieldId) return;
    setLoading(true);
    setError("");
    revokeBlobs();
    setImageBlobs({});
    try {
      const res = await api.scan.history(selectedFieldId);
      const items = res.history || [];
      setScans(items);
      setAnnotatedImages((prev) => {
        const ids = new Set(items.map((s) => s.image_id));
        return Object.fromEntries(Object.entries(prev).filter(([id]) => ids.has(id)));
      });
      const blobs: Record<string, string> = {};
      const urls: string[] = [];
      await Promise.all(
        items.map(async (item) => {
          if (!item.image_path) return;
          const blobUrl = await api.fetchImageAsBlob(item.image_path);
          if (blobUrl) {
            blobs[item.image_id] = blobUrl;
            urls.push(blobUrl);
          }
        })
      );
      setImageBlobs(blobs);
      blobUrlsRef.current = urls;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load scans");
      setScans([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFieldId]);

  useEffect(() => {
    fetchScans();
    return () => revokeBlobs();
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
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pr-4">
                {scans.map((scan) => (
                  <Card
                    key={scan.image_id}
                    className="border-border/50 bg-card/50 hover:border-emerald-500/40 transition-colors cursor-pointer overflow-hidden group"
                    onClick={() => setDetailScan(scan)}
                  >
                    <div className="aspect-[4/3] bg-muted/30 relative overflow-hidden">
                      {imageBlobs[scan.image_id] ? (
                        <img
                          src={imageBlobs[scan.image_id]}
                          alt={`Scan ${scan.image_id.slice(0, 8)}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <div className="p-1.5 bg-background/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </div>
                      {scan.disease_detected && (
                        <div className="absolute top-2 left-2">
                          <Badge
                            variant={isHealthy(scan.disease_detected) ? "secondary" : "destructive"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {scan.disease_detected}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(scan.capture_timestamp).toLocaleDateString()}
                        {scan.file_size ? ` · ${(scan.file_size / 1024).toFixed(1)} KB` : ""}
                      </div>
                      {scan.disease_detected ? (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Confidence:</span>
                          <span className={`font-medium ${confidenceColor(scan.confidence_score)}`}>
                            {scan.confidence_score != null
                              ? `${(scan.confidence_score * 100).toFixed(1)}%`
                              : "N/A"}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Analysis pending</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </>
      )}

      <Dialog open={!!detailScan} onOpenChange={(o) => !o && setDetailScan(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {detailScan && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ScanLine className="h-4 w-4 text-emerald-500" />
                  Scan {detailScan.image_id.slice(0, 8)}...
                </DialogTitle>
                <DialogDescription>
                  {new Date(detailScan.capture_timestamp).toLocaleString()}
                  {detailScan.file_size ? ` · ${(detailScan.file_size / 1024).toFixed(1)} KB` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div
                    className="rounded-lg overflow-hidden border border-border/50 bg-muted/20 cursor-pointer relative group"
                    onClick={() => imageBlobs[detailScan.image_id] && setZoomedImage(imageBlobs[detailScan.image_id])}
                  >
                    {imageBlobs[detailScan.image_id] ? (
                      <>
                        <img
                          src={imageBlobs[detailScan.image_id]}
                          alt={`Scan ${detailScan.image_id.slice(0, 8)}`}
                          className="w-full h-auto object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="p-2 bg-background/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <ZoomIn className="h-5 w-5" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  {annotatedImages[detailScan.image_id] && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Annotated result:</p>
                      <div
                        className="rounded-lg overflow-hidden border border-border/50 bg-muted/20 cursor-pointer relative group"
                        onClick={() => setZoomedImage(annotatedImages[detailScan.image_id]!)}
                      >
                        <img
                          src={annotatedImages[detailScan.image_id]}
                          alt="Annotated scan"
                          className="w-full h-auto"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="p-2 bg-background/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <ZoomIn className="h-5 w-5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {detailScan.disease_detected ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isHealthy(detailScan.disease_detected) ? "secondary" : "destructive"}
                          className="text-sm px-3 py-1"
                        >
                          {detailScan.disease_detected}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Confidence:</span>
                        <span className={`font-medium text-base ${confidenceColor(detailScan.confidence_score)}`}>
                          {detailScan.confidence_score != null
                            ? `${(detailScan.confidence_score * 100).toFixed(1)}%`
                            : "N/A"}
                        </span>
                      </div>
                      {detailScan.recommendation && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            <FileText className="h-3 w-3 inline mr-1" />
                            Recommendation
                          </p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {detailScan.recommendation}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic py-4">Analysis pending</div>
                  )}

                  <div className="pt-4 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRescan(detailScan)}
                      disabled={rescanningId === detailScan.image_id}
                      className="gap-2"
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${rescanningId === detailScan.image_id ? "animate-spin" : ""}`} />
                      {rescanningId === detailScan.image_id ? "Rescanning..." : "Rescan"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {zoomedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center cursor-pointer"
          onClick={() => setZoomedImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 z-10"
            onClick={() => setZoomedImage(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={zoomedImage}
            alt="Zoomed scan"
            className="max-w-[95vw] max-h-[95vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
