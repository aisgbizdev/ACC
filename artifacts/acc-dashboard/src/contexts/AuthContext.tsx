import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getMe } from "@workspace/api-client-react";

export type UserRole = "apuppt" | "dk" | "du" | "owner";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  ptId: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  setUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((data) => {
        setUser({
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role as UserRole,
          ptId: data.ptId ?? null,
        });
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
