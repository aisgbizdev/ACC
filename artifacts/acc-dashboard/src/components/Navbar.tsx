import { useRef, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { logout } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bell, LayoutDashboard, FileText, AlertTriangle, BarChart2,
  ClipboardCheck, FileCheck2, TrendingUp, ClipboardList, Shield,
  User, UserCircle, FileBarChart, Users, Settings, LogOut,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  apuppt: "APUPPT",
  dk: "DK",
  du: "DU",
  owner: "Owner",
  superadmin: "Superadmin",
};

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const NAV_ITEMS = [
  { href: "/dashboard",     label: "Dashboard",      icon: LayoutDashboard, roles: ["apuppt", "dk", "du", "owner", "superadmin"] },
  { href: "/activity",      label: "Aktivitas",      icon: FileText,        roles: ["apuppt"] },
  { href: "/activities",    label: "Aktivitas PT",   icon: ClipboardList,   roles: ["dk", "superadmin"] },
  { href: "/findings",      label: "Temuan",         icon: AlertTriangle,   roles: ["apuppt", "dk", "du", "owner", "superadmin"] },
  { href: "/review",        label: "Review DK",      icon: ClipboardCheck,  roles: ["dk", "superadmin"] },
  { href: "/signoff",       label: "Sign-Off DU",    icon: FileCheck2,      roles: ["du", "superadmin"] },
  { href: "/kpi",           label: "KPI",            icon: TrendingUp,      roles: ["dk", "du", "owner", "superadmin"] },
  { href: "/reports",       label: "Laporan",        icon: BarChart2,       roles: ["dk", "du", "owner", "superadmin"] },
  { href: "/monthly-recap", label: "Rekap Bulanan",  icon: FileBarChart,    roles: ["dk", "du", "owner", "superadmin"] },
  { href: "/audit-log",     label: "Audit Log",      icon: Shield,          roles: ["superadmin"] },
  { href: "/users",         label: "Manajemen User", icon: Users,           roles: ["superadmin"] },
];

const ACCOUNT_ITEMS = [
  { href: "/profile",               label: "Profil Saya", icon: UserCircle },
  { href: "/notification-settings", label: "Notifikasi",  icon: Bell },
];

export function Navbar() {
  const { user, setUser } = useAuth();
  const [location, navigate] = useLocation();

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const avatarSrc = user.avatarUrl ? `${API_BASE}${user.avatarUrl}` : null;
  const initials = user.name?.charAt(0)?.toUpperCase() ?? "U";

  const handleLogout = async () => {
    try { await logout(); } catch {}
    setUser(null);
    navigate("/login");
  };

  return (
    <aside className="hidden sm:flex fixed top-0 left-0 bottom-0 z-50 w-40 flex-col bg-[#0b1525] border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-800 flex-shrink-0">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-white">ACC</span>
        </div>
        <div className="leading-tight">
          <div className="text-xs font-bold text-white">ACC</div>
          <div className="text-[9px] text-slate-400 uppercase tracking-wide">Control Center</div>
        </div>
      </div>

      {/* User info */}
      <Link href="/profile" className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-600">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-semibold text-slate-200">{initials}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-white truncate leading-tight">{user.name}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{ROLE_LABELS[user.role]}</p>
        </div>
      </Link>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors mb-0.5 ${
                isActive
                  ? "bg-blue-600/20 text-blue-400 font-medium"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs leading-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* Account items */}
        <div className="border-t border-slate-800 mt-2 pt-2">
          {ACCOUNT_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors mb-0.5 ${
                  isActive
                    ? "bg-blue-600/20 text-blue-400 font-medium"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="flex-shrink-0 border-t border-slate-800 p-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs">Keluar</span>
        </button>
      </div>
    </aside>
  );
}
