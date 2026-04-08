"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

// ── Types ────────────────────────────────────────────

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  allowed_agents: string[];
  allowed_pages: string[];
  organization_id: string | null;
  organization_name: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isSuperadmin: boolean;
  isOrgAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  isSuperadmin: false,
  isOrgAdmin: false,
  login: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// ── Storage helpers ──────────────────────────────────

import { API_BASE, TOKEN_KEY, REFRESH_KEY } from "@/lib/config";

function getStored(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

function setStored(key: string, value: string) {
  localStorage.setItem(key, value);
}

function clearStored() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ── Provider ─────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearStored();
    setToken(null);
    setUser(null);
  }, []);

  const fetchMe = useCallback(
    async (accessToken: string): Promise<boolean> => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setToken(accessToken);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    []
  );

  const tryRefresh = useCallback(async (): Promise<boolean> => {
    const refreshToken = getStored(REFRESH_KEY);
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return false;

      const data = await res.json();
      setStored(TOKEN_KEY, data.access_token);
      setStored(REFRESH_KEY, data.refresh_token);
      return await fetchMe(data.access_token);
    } catch {
      return false;
    }
  }, [fetchMe]);

  // On mount: try stored token, then refresh
  useEffect(() => {
    (async () => {
      const stored = getStored(TOKEN_KEY);
      if (stored) {
        const ok = await fetchMe(stored);
        if (!ok) {
          const refreshed = await tryRefresh();
          if (!refreshed) clearStored();
        }
      } else {
        await tryRefresh();
      }
      setLoading(false);
    })();
  }, [fetchMe, tryRefresh]);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Login failed");
      }
      const data = await res.json();
      setStored(TOKEN_KEY, data.access_token);
      setStored(REFRESH_KEY, data.refresh_token);
      await fetchMe(data.access_token);
    },
    [fetchMe]
  );

  const isSuperadmin = user?.role === "superadmin";
  const isOrgAdmin = user?.role === "org_admin" || user?.role === "superadmin";

  return (
    <AuthContext.Provider
      value={{ user, token, loading, isSuperadmin, isOrgAdmin, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
