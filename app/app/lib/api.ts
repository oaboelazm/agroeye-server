import { removeStorage, STORAGE_KEYS } from "./storage";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "/api";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string | null;
  body?: unknown;
  headers?: Record<string, string>;
};

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "POST", token, body, headers = {} } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401) {
    removeStorage(STORAGE_KEYS.authToken);
    removeStorage(STORAGE_KEYS.authUser);
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = await response.json();
      message = payload?.detail || payload?.message || message;
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  post: <T>(path: string, body?: unknown, token?: string | null) => apiRequest<T>(path, { method: "POST", body, token }),
};
