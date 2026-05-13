import type { Farm, ScanHistoryResponse, ScanDetailsResponse, ChatSession, ChatSessionMessage } from "../types/api";

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

async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
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
      request<{ events: Array<Record<string, unknown>> }>("/mobile/reports/get-irrigation", {
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

  imageUrl: (filename: string) => {
    const token = getToken();
    return `${BASE_URL}/webapp/images/${encodeURIComponent(filename)}?token=${token || ""}`;
  },

  fetchImageAsBlob: async (filename: string): Promise<string | null> => {
    const token = getToken();
    try {
      const res = await fetch(`${BASE_URL}/webapp/images/${encodeURIComponent(filename)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return null;
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  },

  scan: {
    upload: (deviceId: number, fieldId: number, file: File) => {
      const fd = new FormData();
      fd.append("device_id", deviceId.toString());
      fd.append("field_id", fieldId.toString());
      fd.append("image_file", file);
      return uploadFile<{ status: string; image_id: string }>("/mobile/scan/upload", fd);
    },

    analyze: (imageId: string) =>
      request<{ status: string; image_id: string }>("/mobile/scan/analyze", { image_id: imageId }),

    history: (fieldId: number) =>
      request<ScanHistoryResponse>("/mobile/scan/history", { field_id: fieldId }),

    details: (imageId: string) =>
      request<ScanDetailsResponse>("/mobile/scan/details", { image_id: imageId }),

    visionAnalyze: (
      deviceId: number,
      fieldId: number,
      file: File,
      returnAnnotated?: boolean,
    ) => {
      const fd = new FormData();
      fd.append("device_id", deviceId.toString());
      fd.append("field_id", fieldId.toString());
      fd.append("image_file", file);
      if (returnAnnotated) fd.append("return_annotated", "true");
      return uploadFile<{
        status: string;
        image_id: string;
        detections: Array<{ label: string; confidence: number; bbox_xyxy: number[] }>;
        max_confidence: number;
        count: number;
        analysis: { disease_detected: string; confidence_score: number; recommendation: string };
        annotated_image_base64?: string;
      }>("/ai/vision/analyze", fd);
    },
  },

  ai: {
    decide: (data: { timestamp_utc?: string; sensors?: Record<string, number | null>; override_config?: Record<string, unknown> }) =>
      request<Record<string, unknown>>("/ai/decide", data),

    ask: (data: { question: string; dbSnapshot?: string }) =>
      request<{ answer: string; type: string; meta: { user: string; timestamp: number } }>("/webapp/ai/ask", data),

    askStream: (
      data: { question: string; dbSnapshot?: string },
      callbacks: {
        onToken: (token: string) => void;
        onDone: (fullAnswer: string, meta: { user: string; timestamp: number }) => void;
        onError: (error: string) => void;
      },
      signal?: AbortSignal,
    ): () => void => {
      const token = getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      let cancelled = false;
      const controller = new AbortController();

      const abortHandler = () => { cancelled = true; controller.abort(); };
      if (signal) signal.addEventListener("abort", abortHandler);

      fetch("/api/webapp/ai/ask-stream", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
            callbacks.onError(err.detail || `Request failed: ${res.status}`);
            return;
          }

          const reader = res.body?.getReader();
          if (!reader) { callbacks.onError("No response body"); return; }

          const decoder = new TextDecoder();
          let buffer = "";
          let fullAnswer = "";
          let doneMeta: { user: string; timestamp: number } | null = null;

          while (true) {
            if (cancelled) { reader.cancel(); return; }
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() || "";

            for (const event of events) {
              const lines = event.split("\n");
              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                try {
                  const parsed = JSON.parse(line.slice(6));
                  if (parsed.type === "token" && parsed.content) {
                    fullAnswer += parsed.content;
                    callbacks.onToken(parsed.content);
                  } else if (parsed.type === "done") {
                    // wait for the answer event
                  } else if (parsed.type === "answer" && parsed.data) {
                    doneMeta = parsed.data.meta;
                  } else if (parsed.type === "error") {
                    callbacks.onError(parsed.message || "Stream error");
                  } else if (parsed.type === "cancelled") {
                    return;
                  }
                } catch { /* skip parse errors */ }
              }
            }
          }

          if (!cancelled) {
            callbacks.onDone(fullAnswer, doneMeta || { user: "User", timestamp: Date.now() });
          }
        })
        .catch((err) => {
          if (!cancelled) callbacks.onError(err.message || "Network error");
        });

      return () => {
        cancelled = true;
        controller.abort();
        if (signal) signal.removeEventListener("abort", abortHandler);
      };
    },

    getSuggestions: (data: { userText: string; dbSnapshot?: string }) =>
      request<{
        suggestions: Array<{ title: string; subtitle: string; prompt: string }>;
      }>("/webapp/ai/suggestions", data),

    rescan: (imageId: string, returnAnnotated?: boolean) =>
      request<{
        status: string;
        image_id: string;
        detections: Array<{ label: string; confidence: number; bbox_xyxy: number[] }>;
        max_confidence: number;
        count: number;
        analysis: { disease_detected: string; confidence_score: number; recommendation: string };
        annotated_image_base64?: string;
      }>("/webapp/ai/vision/rescan", { image_id: imageId, return_annotated: returnAnnotated ?? false }),

    listSessions: () =>
      request<{ sessions: ChatSession[] }>("/webapp/ai/sessions/list", {}),

    createSession: (farmId?: number) =>
      request<{ session_id: number }>("/webapp/ai/sessions/create", { farm_id: farmId }),

    getSessionMessages: (sessionId: number) =>
      request<{ messages: ChatSessionMessage[] }>("/webapp/ai/sessions/messages", { session_id: sessionId }),

    addSessionMessage: (sessionId: number, sender: string, messageText: string) =>
      request<{ status: string }>("/webapp/ai/sessions/add-message", {
        session_id: sessionId,
        sender,
        message_text: messageText,
      }),
  },

  web: {
    listFarms: () =>
      request<{ farms: Farm[] }>("/webapp/farms/list", {}),

    archiveFarm: (farmId: number) =>
      request<{ status: string; message: string }>("/webapp/farms/archive", { farm_id: farmId }),

    unarchiveFarm: (farmId: number) =>
      request<{ status: string; message: string }>("/webapp/farms/unarchive", { farm_id: farmId }),

    deleteFarm: (farmId: number) =>
      request<{ status: string; message: string }>("/webapp/farms/delete", { farm_id: farmId }),

    archivedFarms: () =>
      request<{ farms: Farm[] }>("/webapp/farms/archived-list", {}),
    dashboard: (farmId?: number) =>
      request<{
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
      }>("/webapp/dashboard", { farm_id: farmId }),

    fieldsList: (farmId: number) =>
      request<{
        fields: Array<{
          field_id: number;
          name: string;
          crop_type: string;
          area_size: number;
          devices_count: number;
        }>;
      }>("/webapp/fields/list", { farm_id: farmId }),

    fieldOverview: (fieldId: number) =>
      request<{
        field_id: number;
        name: string;
        crop_type: string;
        area_size: number;
        devices_count: number;
        active_devices: number;
        avg_temperature_air: number | null;
        avg_humidity_air: number | null;
        avg_soil_moisture: number | null;
        avg_soil_ph: number | null;
        avg_nitrogen: number | null;
        avg_phosphorus: number | null;
        avg_potassium: number | null;
        last_irrigation: string | null;
        next_irrigation: string | null;
      }>("/webapp/fields/overview", { field_id: fieldId }),

    devicesList: (farmId: number) =>
      request<{
        devices: Array<{
          device_id: number;
          field_id: number;
          field_name: string | null;
          device_type: string;
          serial_number: string;
          status: string;
          location_coords: string | null;
        }>;
      }>("/webapp/devices/list", { farm_id: farmId }),

    deviceDetails: (deviceId: number) =>
      request<{
        device_id: number;
        field_id: number;
        field_name: string | null;
        device_type: string;
        serial_number: string;
        status: string;
        location_coords: string | null;
        nodes_count: number;
        active_nodes: number;
        latest_reading: Record<string, unknown> | null;
      }>("/webapp/devices/details", { device_id: deviceId }),

    irrigationUpcoming: (farmId: number) =>
      request<{
        events: Array<{
          irrigation_id: number;
          field_id: number;
          field_name: string | null;
          start_time: string | null;
          end_time: string | null;
          duration_minutes: number | null;
          status: string;
        }>;
      }>("/webapp/irrigation/upcoming", { farm_id: farmId }),

    irrigationRecent: (farmId: number) =>
      request<{
        events: Array<{
          irrigation_id: number;
          field_id: number;
          field_name: string | null;
          start_time: string | null;
          end_time: string | null;
          duration_minutes: number | null;
          status: string;
        }>;
      }>("/webapp/irrigation/recent", { farm_id: farmId }),

    irrigationSummary: (farmId: number) =>
      request<{
        today_events: number;
        today_duration_minutes: number;
        week_events: number;
        month_events: number;
      }>("/webapp/irrigation/summary", { farm_id: farmId }),

    notificationsList: (farmId: number) =>
      request<{
        notifications: Array<{
          notification_id: number;
          type: string;
          message: string;
          is_read: number;
          sent_at: string | null;
        }>;
      }>("/webapp/notifications/list", { farm_id: farmId }),

    notificationsUnreadCount: (farmId: number) =>
      request<{ unread_count: number }>("/webapp/notifications/unread-count", { farm_id: farmId }),

    markNotificationRead: (notificationId: number) =>
      request<{ status: string; notification_id: number }>("/webapp/notifications/mark-read", {
        notification_id: notificationId,
      }),

    reportsSummary: (farmId: number) =>
      request<{
        total_fields: number;
        total_devices: number;
        total_irrigation_events: number;
        avg_temperature_air: number | null;
        avg_humidity_air: number | null;
        avg_soil_moisture: number | null;
        avg_soil_ph: number | null;
        avg_nitrogen: number | null;
        avg_phosphorus: number | null;
        avg_potassium: number | null;
      }>("/webapp/reports/summary", { farm_id: farmId }),

    reportField: (fieldId: number) =>
      request<{
        field_id: number;
        field_name: string;
        devices_count: number;
        avg_temperature_air: number | null;
        avg_humidity_air: number | null;
        avg_soil_moisture: number | null;
        avg_soil_ph: number | null;
        avg_nitrogen: number | null;
        avg_phosphorus: number | null;
        avg_potassium: number | null;
        avg_conductivity: number | null;
        avg_light_intensity: number | null;
        avg_co2: number | null;
        last_irrigation: string | null;
        irrigation_30d_count: number;
      }>("/webapp/reports/field", { field_id: fieldId }),

    sensorsLatest: (deviceId?: number, farmId?: number) =>
      request<{
        readings: Array<Record<string, unknown>>;
      }>("/webapp/sensors/latest", { device_id: deviceId, farm_id: farmId }),
  },
};
