import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getMe } from "@workspace/api-client-react";

export type UserRole = "apuppt" | "dk" | "du" | "owner" | "superadmin";

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  ptId: string | null;
  avatarUrl: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  setUser: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const data = await getMe();
      setUser({
        id: data.id,
        name: data.name,
        username: data.username,
        email: data.email,
        role: data.role as UserRole,
        ptId: data.ptId ?? null,
        avatarUrl: ((data as unknown) as Record<string, unknown>).avatarUrl as string | null ?? null,
      });
    } catch {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await loadUser();
  };

  useEffect(() => {
    loadUser().finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
