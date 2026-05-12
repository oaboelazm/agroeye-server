export const STORAGE_KEYS = {
  authToken: "agroeye.auth.token",
  authUser: "agroeye.auth.user",
  onboardingCompleted: "agroeye.onboarding.completed",
  theme: "agroeye.theme",
  sidebarCollapsed: "agroeye.sidebar.collapsed",
} as const;

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no-op
  }
}

export function removeStorage(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // no-op
  }
}
