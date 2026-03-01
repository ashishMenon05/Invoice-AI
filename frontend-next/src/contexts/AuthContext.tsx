"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { User, UserRole } from "@/types";

const API_URL = "http://localhost:8000/api/v1";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, orgName: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  loginWithGoogle: (credential: string) => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Helper: parse auth_token from cookies */
const getAuthToken = () => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(^| )auth_token=([^;]+)/);
  return match ? match[2] : null;
};

/** Helper: map /auth/me response to our User type */
const mapApiUser = (me: any): User => ({
  id: me.id,
  email: me.email,
  name: me.full_name || me.organization?.name || me.email.split("@")[0],
  role: me.role,
  avatar: me.avatar_url || undefined,
  company: me.organization?.name,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Restore session on page mount from the saved cookie
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => { if (me) setUser(mapApiUser(me)); })
      .catch(() => { });
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    if (!res.ok) throw new Error("Google login failed");
    const data = await res.json();

    document.cookie = `auth_token=${data.access_token}; path=/; max-age=86400;`;

    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const me = await meRes.json();
    document.cookie = `user_role=${me.role}; path=/; max-age=86400;`;
    setUser(mapApiUser(me));
    window.location.href = me.role === "admin" ? "/admin/dashboard" : "/client/dashboard";
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });
    if (!res.ok) throw new Error("Login failed");
    const data = await res.json();

    document.cookie = `auth_token=${data.access_token}; path=/; max-age=86400;`;

    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const me = await meRes.json();
    document.cookie = `user_role=${me.role}; path=/; max-age=86400;`;
    setUser(mapApiUser(me));
    window.location.href = me.role === "admin" ? "/admin/dashboard" : "/client/dashboard";
  }, []);

  const register = useCallback(async (email: string, password: string, orgName: string) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, organization_name: orgName }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Registration failed");
    }
    await login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    document.cookie = `auth_token=; path=/; max-age=0;`;
    document.cookie = `user_role=; path=/; max-age=0;`;
    setUser(null);
    window.location.href = "/login";
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    console.warn("Switch role disabled, please login distinctly");
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout, switchRole, loginWithGoogle, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
