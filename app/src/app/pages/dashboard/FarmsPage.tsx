import React, { useState } from "react";
import { useAppData } from "../../contexts/AppDataContext";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
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
import { MapPin, Grid3X3, Archive, Trash2, Plus, Pencil } from "lucide-react";
import { Skeleton } from "../../components/ui/skeleton";
import { api } from "../../lib/api";
import { toast } from "sonner";

export function FarmsPage() {
  const { farms, loading, refreshFarms } = useAppData();
  const [archiveId, setArchiveId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ farm_id: number; name: string; location: string; area_size: number } | null>(null);
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const resetForm = () => {
    setFormName("");
    setFormLocation("");
    setFormArea("");
  };

  const handleCreate = async () => {
    if (!formName.trim() || !formLocation.trim() || !formArea.trim()) {
      toast.error("All fields are required");
      return;
    }
    setFormLoading(true);
    try {
      await api.web.createFarm({
        name: formName.trim(),
        location: formLocation.trim(),
        area_size: parseFloat(formArea),
      });
      toast.success("Greenhouse created");
      setCreateOpen(false);
      resetForm();
      await refreshFarms();
    } catch (err: any) {
      toast.error(err.message || "Failed to create greenhouse");
    } finally {
      setFormLoading(false);
    }
  };

  const openEdit = (farm: { farm_id: number; name: string; location: string; area_size: number }) => {
    setEditTarget(farm);
    setFormName(farm.name);
    setFormLocation(farm.location);
    setFormArea(String(farm.area_size));
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editTarget || !formName.trim() || !formLocation.trim() || !formArea.trim()) {
      toast.error("All fields are required");
      return;
    }
    setFormLoading(true);
    try {
      await api.web.updateFarm({
        farm_id: editTarget.farm_id,
        name: formName.trim(),
        location: formLocation.trim(),
        area_size: parseFloat(formArea),
      });
      toast.success("Greenhouse updated");
      setEditOpen(false);
      setEditTarget(null);
      resetForm();
      await refreshFarms();
    } catch (err: any) {
      toast.error(err.message || "Failed to update greenhouse");
    } finally {
      setFormLoading(false);
    }
  };

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
        <Button onClick={() => { resetForm(); setCreateOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Greenhouse
        </Button>
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
          <p className="text-muted-foreground">No green houses found. Create one to get started.</p>
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
                      className="h-7 w-7 text-muted-foreground hover:text-blue-500"
                      onClick={() => openEdit(farm)}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
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

      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) resetForm(); setCreateOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Greenhouse</DialogTitle>
            <DialogDescription>Add a new greenhouse location</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Greenhouse name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="City or region" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Area (ha)</Label>
              <Input id="area" type="number" step="0.01" min="0" value={formArea} onChange={(e) => setFormArea(e.target.value)} placeholder="0.00" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }} disabled={formLoading}>Cancel</Button>
              <Button onClick={handleCreate} disabled={formLoading}>{formLoading ? "Creating..." : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(o) => { if (!o) { setEditOpen(false); setEditTarget(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Greenhouse</DialogTitle>
            <DialogDescription>Update greenhouse details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Greenhouse name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input id="edit-location" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="City or region" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-area">Area (ha)</Label>
              <Input id="edit-area" type="number" step="0.01" min="0" value={formArea} onChange={(e) => setFormArea(e.target.value)} placeholder="0.00" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setEditOpen(false); setEditTarget(null); resetForm(); }} disabled={formLoading}>Cancel</Button>
              <Button onClick={handleEdit} disabled={formLoading}>{formLoading ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
