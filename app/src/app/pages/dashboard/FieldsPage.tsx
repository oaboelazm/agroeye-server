import React, { useState } from "react";
import { useAppData } from "../../contexts/AppDataContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
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
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { Wheat, Cpu, Activity, Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { toast } from "sonner";

export function FieldsPage() {
  const { fields, devices, nodeStatuses, loading, activeFarmId, farms, refreshFields } = useAppData();
  const activeFarm = farms.find((f) => f.farm_id === activeFarmId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<{ field_id: number; name: string; crop_type: string; area_size: number } | null>(null);
  const [formName, setFormName] = useState("");
  const [formCropType, setFormCropType] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const resetForm = () => {
    setFormName("");
    setFormCropType("");
    setFormArea("");
  };

  const handleCreate = async () => {
    if (!activeFarmId || !formName.trim() || !formCropType.trim() || !formArea.trim()) {
      toast.error("All fields are required");
      return;
    }
    setFormLoading(true);
    try {
      await api.web.createField({
        farm_id: activeFarmId,
        name: formName.trim(),
        crop_type: formCropType.trim(),
        area_size: parseFloat(formArea),
      });
      toast.success("Field created");
      setCreateOpen(false);
      resetForm();
      await refreshFields(activeFarmId);
    } catch (err: any) {
      toast.error(err.message || "Failed to create field");
    } finally {
      setFormLoading(false);
    }
  };

  const openEdit = (field: { field_id: number; name: string; crop_type: string; area_size: number }) => {
    setEditTarget(field);
    setFormName(field.name);
    setFormCropType(field.crop_type);
    setFormArea(String(field.area_size));
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editTarget || !formName.trim() || !formCropType.trim() || !formArea.trim()) {
      toast.error("All fields are required");
      return;
    }
    setFormLoading(true);
    try {
      await api.web.updateField({
        field_id: editTarget.field_id,
        name: formName.trim(),
        crop_type: formCropType.trim(),
        area_size: parseFloat(formArea),
      });
      toast.success("Field updated");
      setEditOpen(false);
      setEditTarget(null);
      resetForm();
      if (activeFarmId) await refreshFields(activeFarmId);
    } catch (err: any) {
      toast.error(err.message || "Failed to update field");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setActionLoading(true);
    try {
      await api.web.deleteField(deleteId);
      toast.success("Field deleted");
      setDeleteId(null);
      if (activeFarmId) await refreshFields(activeFarmId);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete field");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="border-border/50"><CardContent className="p-6"><Skeleton className="h-40" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fields</h1>
          <p className="text-muted-foreground">
            {activeFarm?.name ? `Fields in ${activeFarm.name}` : "All fields"}
          </p>
        </div>
        {activeFarmId && (
          <Button onClick={() => { resetForm(); setCreateOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Field
          </Button>
        )}
      </div>

      {!activeFarmId ? (
        <Card className="border-border/50 bg-card/50 p-12 text-center">
          <p className="text-muted-foreground">Select a green house to manage its fields.</p>
        </Card>
      ) : fields.length === 0 ? (
        <Card className="border-border/50 bg-card/50 p-12 text-center">
          <p className="text-muted-foreground">No fields in this farm yet. Create one to get started.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {fields.map((field) => {
            const fieldDevices = devices.filter((d) => d.field_id === field.field_id);
            const status = nodeStatuses[field.field_id];

            return (
              <Card key={field.field_id} className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Wheat className="h-4 w-4 text-emerald-500" />
                        {field.name}
                      </CardTitle>
                      <CardDescription>{field.crop_type}</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-blue-500"
                        onClick={() => openEdit(field)}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        onClick={() => setDeleteId(field.field_id)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Cpu className="h-3.5 w-3.5" />
                      {fieldDevices.length} devices
                    </div>
                    {status && (
                      <div className="flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5" />
                        {status.active} active nodes
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) resetForm(); setCreateOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Field</DialogTitle>
            <DialogDescription>Add a new field to {activeFarm?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="field-name">Name</Label>
              <Input id="field-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Field name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crop-type">Crop Type</Label>
              <Input id="crop-type" value={formCropType} onChange={(e) => setFormCropType(e.target.value)} placeholder="e.g. Tomatoes, Wheat" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-area">Area (ha)</Label>
              <Input id="field-area" type="number" step="0.01" min="0" value={formArea} onChange={(e) => setFormArea(e.target.value)} placeholder="0.00" />
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
            <DialogTitle>Edit Field</DialogTitle>
            <DialogDescription>Update field details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-field-name">Name</Label>
              <Input id="edit-field-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Field name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-crop-type">Crop Type</Label>
              <Input id="edit-crop-type" value={formCropType} onChange={(e) => setFormCropType(e.target.value)} placeholder="e.g. Tomatoes, Wheat" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-field-area">Area (ha)</Label>
              <Input id="edit-field-area" type="number" step="0.01" min="0" value={formArea} onChange={(e) => setFormArea(e.target.value)} placeholder="0.00" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setEditOpen(false); setEditTarget(null); resetForm(); }} disabled={formLoading}>Cancel</Button>
              <Button onClick={handleEdit} disabled={formLoading}>{formLoading ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete field?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this field and all its associated data. This action cannot be undone.
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
