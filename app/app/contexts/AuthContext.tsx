import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setUnauthorizedHandler } from "../lib/api";
import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from "../lib/storage";
import type { AuthUser, LoginResponse, SignupResponse } from "../types/api";

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: { username: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStorage<string | null>(STORAGE_KEYS.authToken, null));
  const [user, setUser] = useState<AuthUser | null>(() => readStorage<AuthUser | null>(STORAGE_KEYS.authUser, null));
  const [isLoading, setIsLoading] = useState(false);

  const logout = React.useCallback(() => {
    setToken(null);
    setUser(null);
    removeStorage(STORAGE_KEYS.authToken);
    removeStorage(STORAGE_KEYS.authUser);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      window.location.replace("/login");
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const login = React.useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post<LoginResponse>("/mobile/auth/login", { email, password });
      setToken(response.access_token);
      setUser(response.user);
      writeStorage(STORAGE_KEYS.authToken, response.access_token);
      writeStorage(STORAGE_KEYS.authUser, response.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = React.useCallback(async (payload: { username: string; email: string; password: string; phone?: string }) => {
    setIsLoading(true);
    try {
      await api.post<SignupResponse>("/mobile/auth/signup", {
        username: payload.username,
        email: payload.email,
        password: payload.password,
        role: "farmer",
        phone: payload.phone || null,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({ token, user, isAuthenticated: !!token && !!user, isLoading, login, signup, logout }),
    [token, user, isLoading, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
