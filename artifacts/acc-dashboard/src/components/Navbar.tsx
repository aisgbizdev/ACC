import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { logout } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bell, LayoutDashboard, FileText, AlertTriangle, BarChart2,
  ClipboardCheck, FileCheck2, TrendingUp, ClipboardList, Shield,
  User, UserCircle, FileBarChart, Users, Settings, LogOut,
  ChevronDown, Grid2x2,
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
  { href: "/dashboard",     label: "Dashboard",     icon: LayoutDashboard, roles: ["apuppt", "dk", "du", "owner", "superadmin"] },
  { href: "/activity",      label: "Aktivitas",     icon: FileText,        roles: ["apuppt"] },
  { href: "/activities",    label: "Aktivitas PT",  icon: ClipboardList,   roles: ["dk", "superadmin"] },
  { href: "/findings",      label: "Temuan",        icon: AlertTriangle,   roles: ["apuppt", "dk", "du", "owner", "superadmin"] },
  { href: "/review",        label: "Review DK",     icon: ClipboardCheck,  roles: ["dk", "superadmin"] },
  { href: "/signoff",       label: "Sign-Off DU",   icon: FileCheck2,      roles: ["du", "superadmin"] },
  { href: "/kpi",           label: "KPI",           icon: TrendingUp,      roles: ["dk", "du", "owner", "superadmin"] },
  { href: "/reports",       label: "Laporan",       icon: BarChart2,       roles: ["dk", "du", "owner", "superadmin"] },
  { href: "/monthly-recap", label: "Rekap Bulanan", icon: FileBarChart,    roles: ["dk", "du", "owner", "superadmin"] },
  { href: "/audit-log",     label: "Audit Log",     icon: Shield,          roles: ["superadmin"] },
  { href: "/users",         label: "Manajemen User",icon: Users,           roles: ["superadmin"] },
];

const ACCOUNT_ITEMS = [
  { href: "/profile",               label: "Profil Saya",  icon: UserCircle },
  { href: "/notification-settings", label: "Notifikasi",   icon: Settings },
];

export function Navbar() {
  const { user, setUser } = useAuth();
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const avatarSrc = user.avatarUrl ? `${API_BASE}${user.avatarUrl}` : null;

  const handleLogout = async () => {
    try { await logout(); } catch {}
    setUser(null);
    navigate("/login");
  };

  return (
    <nav className="hidden sm:flex fixed top-0 left-0 right-0 z-50 h-14 bg-slate-900 border-b border-slate-800 items-center px-4 gap-3">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 mr-2 flex-shrink-0">
        <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
          <span className="text-xs font-bold text-white">ACC</span>
        </div>
        <span className="text-sm font-semibold text-white hidden lg:block">APUPPT Control Center</span>
      </Link>

      {/* Menu dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => { setMenuOpen((o) => !o); setProfileOpen(false); }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            menuOpen ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Grid2x2 className="w-4 h-4" />
          Menu
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
        </button>

        {menuOpen && (
          <div className="absolute left-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 py-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-blue-600/20 text-blue-400 font-medium"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Active page indicator */}
      {(() => {
        const active = visibleItems.find((i) => location.startsWith(i.href));
        if (!active) return null;
        const Icon = active.icon;
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-slate-600">/</span>
            <Icon className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-300 font-medium">{active.label}</span>
          </div>
        );
      })()}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notification bell */}
      <Link
        href="/notification-settings"
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <Bell className="w-4 h-4" />
      </Link>

      {/* Profile dropdown */}
      <div className="relative" ref={profileRef}>
        <button
          onClick={() => { setProfileOpen((o) => !o); setMenuOpen(false); }}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-3.5 h-3.5 text-slate-300" />
            )}
          </div>
          <div className="text-left hidden xl:block">
            <p className="text-xs font-medium text-white leading-none">{user.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{ROLE_LABELS[user.role]}</p>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 py-1">
            {ACCOUNT_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            <div className="border-t border-slate-700 my-1" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
