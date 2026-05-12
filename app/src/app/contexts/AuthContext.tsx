import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "../lib/api";
import { storage } from "../lib/storage";
import { setLogoutHandler } from "../lib/api";
import type { AuthUser } from "../types/api";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { username: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => void;
}

const AUTH_KEY = "agroeye_auth";

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const saved = storage.get<{ token: string; user: AuthUser }>(AUTH_KEY);
    return saved?.token ?? null;
  });
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = storage.get<{ token: string; user: AuthUser }>(AUTH_KEY);
    return saved?.user ?? null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    storage.remove(AUTH_KEY);
  }, []);

  useEffect(() => {
    setLogoutHandler(logout);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(email, password);
      const authData = { token: res.access_token, user: res.user };
      setToken(authData.token);
      setUser(authData.user);
      storage.set(AUTH_KEY, authData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (data: { username: string; email: string; password: string; phone?: string }) => {
    setIsLoading(true);
    try {
      await api.auth.signup({ ...data, role: "farmer" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
