import React, { useState } from "react";
import { useAppData } from "../../contexts/AppDataContext";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { MapPin, Grid3X3, Archive, Trash2, RotateCcw } from "lucide-react";
import { Skeleton } from "../../components/ui/skeleton";
import { api } from "../../lib/api";
import { useToast } from "../../hooks/use-toast";

export function FarmsPage() {
  const { farms, loading, refreshFarms } = useAppData();
  const [archiveId, setArchiveId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleArchive = async () => {
    if (!archiveId) return;
    setActionLoading(true);
    try {
      await api.web.archiveFarm(archiveId);
      await refreshFarms();
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
      setArchiveId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setActionLoading(true);
    try {
      await api.web.deleteFarm(deleteId);
      await refreshFarms();
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Green houses</h1>
          <p className="text-muted-foreground">All registered green house locations</p>
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
          <p className="text-muted-foreground">No green houses found. Create one using the mobile app.</p>
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
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-yellow-500"
                      onClick={() => setArchiveId(farm.farm_id)}
                      title="Archive"
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-500"
                      onClick={() => setDeleteId(farm.farm_id)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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

      <AlertDialog open={!!archiveId} onOpenChange={(o) => !o && setArchiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive green house?</AlertDialogTitle>
            <AlertDialogDescription>
              This green house will be hidden from the dashboard. You can unarchive it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={actionLoading} className="bg-yellow-600 hover:bg-yellow-700">
              {actionLoading ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete green house?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the green house. It will no longer appear in the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={actionLoading} className="bg-red-600 hover:bg-red-700">
              {actionLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
