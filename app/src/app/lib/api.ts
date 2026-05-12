const BASE_URL = "/api";

let logoutHandler: (() => void) | null = null;

export function setLogoutHandler(handler: () => void) {
  logoutHandler = handler;
}

function getToken(): string | null {
  try {
    const stored = localStorage.getItem("agroeye_auth");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem("agroeye_auth");
    logoutHandler?.();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || errBody.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{
        status: string;
        access_token: string;
        token_type: string;
        user: { user_id: number; username: string; email: string; role: string };
      }>("/mobile/auth/login", { email, password }),

    signup: (data: { username: string; email: string; password: string; role?: string; phone?: string }) =>
      request<{ status: string; message: string }>("/mobile/auth/signup", data),
  },

  home: {
    getFarms: (userId: number) =>
      request<{
        farms: Array<{ farm_id: number; name: string; location: string; area_size: number }>;
      }>("/mobile/home/get-farms", { user_id: userId }),

    getFields: (farmId: number) =>
      request<{
        fields: Array<{ field_id: number; name: string; crop_type: string; area_size: number }>;
      }>("/mobile/home/get-fields", { farm_id: farmId }),

    getDevices: (fieldId: number) =>
      request<{
        devices: Array<{
          device_id: number;
          device_type: string;
          serial_number: string;
          location_coords: string | null;
          status: string;
        }>;
      }>("/mobile/home/get-devices", { field_id: fieldId }),

    getLatestReading: (deviceId: number) =>
      request<{
        latest_reading: Record<string, unknown> | null;
      }>("/mobile/home/get-latest-reading", { device_id: deviceId }),

    getNotifications: (userId: number, farmId: number) =>
      request<{
        notifications: Array<{
          notification_id: number;
          user_id: number;
          farm_id: number;
          type: string;
          message: string;
          is_read: number;
          sent_at: string;
        }>;
      }>("/mobile/home/get-notifications", { user_id: userId, farm_id: farmId }),

    markNotificationRead: (notificationId: number) =>
      request<{ status: string; notification_id: number; is_read: number }>(
        "/mobile/home/mark-notification-read",
        { notification_id: notificationId }
      ),

    getNodeStatus: (fieldId: number) =>
      request<{
        status: string;
        summary: { total_nodes: number; active: number; inactive: number; low_battery: number; offline: number };
      }>("/mobile/home/get-node-status", { field_id: fieldId }),
  },

  manage: {
    createFarm: (data: { user_id: number; name: string; location: string; area_size: number }) =>
      request<{ status: string; message: string }>("/mobile/manage/create-farm", data),

    updateFarm: (data: { farm_id: number; name: string; location: string; area_size: number }) =>
      request<{ status: string; message: string }>("/mobile/manage/update-farm", data),

    deleteFarm: (farmId: number) =>
      request<{ status: string; message: string }>("/mobile/manage/delete-farm", { farm_id: farmId }),

    createField: (data: { farm_id: number; name: string; crop_type: string; area_size: number }) =>
      request<{ status: string; message: string }>("/mobile/manage/create-field", data),

    updateField: (data: { field_id: number; name: string; crop_type: string; area_size: number }) =>
      request<{ status: string; message: string }>("/mobile/manage/update-field", data),

    deleteField: (fieldId: number) =>
      request<{ status: string; message: string }>("/mobile/manage/delete-field", { field_id: fieldId }),

    updateDevice: (data: { device_id: number; device_type?: string; serial_number?: string; location_coords?: string; status?: string }) =>
      request<{ status: string; message: string }>("/mobile/manage/update-device", data),
  },

  reports: {
    getReadings: (fieldId: number, fromDate: string, toDate: string) =>
      request<{ readings: Array<Record<string, unknown>> }>("/mobile/reports/get-readings", {
        field_id: fieldId,
        from_date: fromDate,
        to_date: toDate,
      }),

    getIrrigation: (fieldId: number) =>
      request<{ irrigation_events: Array<Record<string, unknown>> }>("/mobile/reports/get-irrigation", {
        field_id: fieldId,
      }),

    getSummary: (fieldId: number) =>
      request<{
        devices_count: number;
        latest_reading: Record<string, unknown> | null;
        averages: Record<string, unknown>;
        irrigation_summary: { last_event: Record<string, unknown> | null; events_last_30_days: number };
      }>("/mobile/reports/get-summary", { field_id: fieldId }),
  },

  ai: {
    decide: (data: { timestamp_utc?: string; sensors?: Record<string, number | null>; override_config?: Record<string, unknown> }) =>
      request<Record<string, unknown>>("/ai/decide", data),
  },
};
