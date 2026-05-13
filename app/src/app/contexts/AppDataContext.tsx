import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";
import type { Farm, Field, Device, NotificationItem, NodeStatusSummary } from "../types/domain";
import type { Farm as ApiFarm } from "../types/api";

const POLL_INTERVAL_MS = 30000;

interface DashboardData {
  total_fields: number;
  total_devices: number;
  active_devices: number;
  total_nodes: number;
  active_nodes: number;
  low_battery_nodes: number;
  alerts_count: number;
  unread_notifications: number;
  today_irrigation_events: number;
  today_irrigation_duration_minutes: number;
}

interface AppDataState {
  farms: Farm[];
  fields: Field[];
  devices: Device[];
  activeFarmId: number | null;
  notifications: NotificationItem[];
  nodeStatuses: Record<number, NodeStatusSummary>;
  unreadCount: number;
  dashboardData: DashboardData | null;
  dashboardLoading: boolean;
  loading: boolean;
  setActiveFarmId: (id: number) => void;
  refreshFarms: () => Promise<void>;
  refreshFields: (farmId: number) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  markNotificationAsRead: (id: number) => Promise<void>;
}

const AppDataContext = createContext<AppDataState | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeFarmId, setActiveFarmIdState] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem("agroeye_active_farm_id");
      return saved ? Number(saved) : null;
    } catch {
      return null;
    }
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [nodeStatuses, setNodeStatuses] = useState<Record<number, NodeStatusSummary>>({});
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter((n) => n.is_read === 0).length;

  const setActiveFarmId = useCallback((id: number) => {
    setActiveFarmIdState(id);
    try {
      localStorage.setItem("agroeye_active_farm_id", String(id));
    } catch {}
  }, []);

  const refreshFarms = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.web.listFarms();
      const mapped: Farm[] = (res.farms || []).map((f: ApiFarm) => ({
        farm_id: f.farm_id,
        name: f.name,
        location: f.location || "",
        area_size: f.area_size || 0,
        created_at: f.created_at,
        is_Archived: f.is_Archived,
        deleted_at: f.deleted_at,
      }));
      setFarms(mapped);
      setActiveFarmIdState((current) => {
        if (mapped.length > 0 && (!current || !mapped.some((f) => f.farm_id === current))) {
          const newId = mapped[0].farm_id;
          try { localStorage.setItem("agroeye_active_farm_id", String(newId)); } catch {}
          return newId;
        }
        if (mapped.length === 0 && current !== null) {
          try { localStorage.removeItem("agroeye_active_farm_id"); } catch {}
          return null;
        }
        return current;
      });
    } catch (err) {
      console.error("Failed to fetch farms:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshFields = useCallback(async (farmId: number) => {
    try {
      const res = await api.home.getFields(farmId);
      setFields(res.fields);

      const devicesPromises = res.fields.map((f) =>
        api.home.getDevices(f.field_id).then((d) => d.devices)
      );
      const devicesResults = await Promise.all(devicesPromises);
      const allDevices = devicesResults.flat().map((d, i) => ({
        ...d,
        field_id: res.fields.flatMap((f, fi) =>
          Array(devicesResults[fi]?.length ?? 0).fill(f.field_id)
        )[i],
      }));
      setDevices(allDevices);

      const statusPromises = res.fields.map((f) =>
        api.home.getNodeStatus(f.field_id).then((s) => ({ fieldId: f.field_id, summary: s.summary }))
      );
      const statusResults = await Promise.all(statusPromises);
      const statusMap: Record<number, NodeStatusSummary> = {};
      statusResults.forEach((r) => {
        statusMap[r.fieldId] = r.summary;
      });
      setNodeStatuses(statusMap);
    } catch (err) {
      console.error("Failed to fetch fields:", err);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!user || !activeFarmId) return;
    try {
      const res = await api.home.getNotifications(user.user_id, activeFarmId);
      setNotifications(res.notifications);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [user, activeFarmId]);

  const refreshDashboard = useCallback(async () => {
    if (!activeFarmId) return;
    setDashboardLoading(true);
    try {
      const data = await api.web.dashboard(activeFarmId);
      setDashboardData(data);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setDashboardLoading(false);
    }
  }, [activeFarmId]);

  const markNotificationAsRead = useCallback(async (id: number) => {
    try {
      await api.home.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: 1 } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, []);

  const refreshFarmsRef = useRef(refreshFarms);
  const refreshNotificationsRef = useRef(refreshNotifications);
  const refreshDashboardRef = useRef(refreshDashboard);
  const activeFarmIdRef = useRef(activeFarmId);
  refreshFarmsRef.current = refreshFarms;
  refreshNotificationsRef.current = refreshNotifications;
  refreshDashboardRef.current = refreshDashboard;
  activeFarmIdRef.current = activeFarmId;

  useEffect(() => {
    if (isAuthenticated && user) {
      refreshFarms();
    } else {
      setFarms([]);
      setFields([]);
      setDevices([]);
      setNotifications([]);
    }
  }, [isAuthenticated, user, refreshFarms]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const id = setInterval(async () => {
      await refreshFarmsRef.current();
      const fid = activeFarmIdRef.current;
      if (fid != null) {
        await Promise.all([
          refreshNotificationsRef.current(),
          refreshDashboardRef.current(),
        ]);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (activeFarmId) {
      refreshFields(activeFarmId);
      refreshNotifications();
      refreshDashboard();
    } else {
      setFields([]);
      setDevices([]);
      setNotifications([]);
      setNodeStatuses({});
      setDashboardData(null);
    }
  }, [activeFarmId, refreshFields, refreshNotifications, refreshDashboard]);

  return (
    <AppDataContext.Provider
      value={{
        farms,
        fields,
        devices,
        activeFarmId,
        notifications,
        nodeStatuses,
        unreadCount,
        dashboardData,
        dashboardLoading,
        loading,
        setActiveFarmId,
        refreshFarms,
        refreshFields,
        refreshNotifications,
        refreshDashboard,
        markNotificationAsRead,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
