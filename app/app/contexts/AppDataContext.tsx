import React, { createContext, useContext, useMemo, useState } from "react";
import { api } from "../lib/api";
import { writeStorage } from "../lib/storage";
import { useAuth } from "./AuthContext";
import type { Farm, NotificationItem } from "../types/domain";

type AppDataContextValue = {
  farms: Farm[];
  activeFarmId: number | null;
  setActiveFarmId: (id: number) => void;
  isLoadingFarms: boolean;
  farmsError: string | null;
  refreshFarms: () => Promise<void>;
  notifications: NotificationItem[];
  unreadNotifications: number;
  isLoadingNotifications: boolean;
  notificationsError: string | null;
  refreshNotifications: () => Promise<void>;
  markNotificationAsRead: (notificationId: number) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

const ACTIVE_FARM_KEY = "agroeye.active.farmId";

function readActiveFarmId(): number | null {
  try {
    const raw = localStorage.getItem(ACTIVE_FARM_KEY);
    if (!raw || raw === "null") return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user, token, isAuthenticated } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmIdState] = useState<number | null>(() => readActiveFarmId());
  const [isLoadingFarms, setIsLoadingFarms] = useState(false);
  const [farmsError, setFarmsError] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  const setActiveFarmId = React.useCallback((id: number) => {
    setActiveFarmIdState(id);
    writeStorage(ACTIVE_FARM_KEY, id);
  }, []);

  const refreshFarms = React.useCallback(async () => {
    if (!isAuthenticated || !user?.user_id) {
      setFarms([]);
      setNotifications([]);
      return;
    }

    setIsLoadingFarms(true);
    setFarmsError(null);
    try {
      const response = await api.post<{ farms: Farm[] }>("/mobile/home/get-farms", { user_id: user.user_id }, token);
      const nextFarms = response.farms || [];
      setFarms(nextFarms);

      const activeExists = activeFarmId && nextFarms.some((farm) => farm.farm_id === activeFarmId);
      if (!activeExists) {
        const nextActive = nextFarms[0]?.farm_id ?? null;
        setActiveFarmIdState(nextActive);
        writeStorage(ACTIVE_FARM_KEY, nextActive);
      }
    } catch (err) {
      setFarmsError(err instanceof Error ? err.message : "Failed to load farms");
    } finally {
      setIsLoadingFarms(false);
    }
  }, [isAuthenticated, user?.user_id, token, activeFarmId]);

  const refreshNotifications = React.useCallback(async () => {
    if (!isAuthenticated || !user?.user_id || !activeFarmId) {
      setNotifications([]);
      return;
    }

    setIsLoadingNotifications(true);
    setNotificationsError(null);
    try {
      const response = await api.post<{ notifications: NotificationItem[] }>(
        "/mobile/home/get-notifications",
        { user_id: user.user_id, farm_id: activeFarmId },
        token,
      );
      setNotifications(response.notifications || []);
    } catch (err) {
      setNotificationsError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [isAuthenticated, user?.user_id, activeFarmId, token]);

  const markNotificationAsRead = React.useCallback(
    async (notificationId: number) => {
      setNotifications((prev) => prev.map((item) => (item.notification_id === notificationId ? { ...item, is_read: 1 } : item)));
      try {
        await api.post<{ status: string }>("/mobile/home/mark-notification-read", { notification_id: notificationId }, token);
      } catch {
        setNotifications((prev) => prev.map((item) => (item.notification_id === notificationId ? { ...item, is_read: 0 } : item)));
      }
    },
    [token],
  );

  React.useEffect(() => {
    refreshFarms();
  }, [refreshFarms]);

  React.useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const value = useMemo(
    () => ({
      farms,
      activeFarmId,
      setActiveFarmId,
      isLoadingFarms,
      farmsError,
      refreshFarms,
      notifications,
      unreadNotifications: notifications.filter((item) => !item.is_read).length,
      isLoadingNotifications,
      notificationsError,
      refreshNotifications,
      markNotificationAsRead,
    }),
    [
      farms,
      activeFarmId,
      setActiveFarmId,
      isLoadingFarms,
      farmsError,
      refreshFarms,
      notifications,
      isLoadingNotifications,
      notificationsError,
      refreshNotifications,
      markNotificationAsRead,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return context;
}
