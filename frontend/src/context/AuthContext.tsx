import { useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { AuthContext, type User, type RegisterData } from "./authTypes";

export type { User, RegisterData, AuthState } from "./authTypes";
export { AuthContext } from "./authTypes";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

async function fetchWithToken(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return fetch(`${BASE_URL}${path}`, { ...options, headers });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetchWithToken("/auth/me");
      if (!res.ok) { setUser(null); return; }
      const data = await res.json();
      setUser(data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        refreshUser().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await refreshUser();
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await refreshUser();
  }, [refreshUser]);

  const register = useCallback(async (data: RegisterData) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Error al registrarse" }));
      throw new Error(err.error ?? "Error al registrarse");
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
