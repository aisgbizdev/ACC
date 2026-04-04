import { useLocation, Link } from "wouter";
import { logout } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, LayoutDashboard, FileText, AlertTriangle, BarChart2, ChevronDown, ClipboardCheck, FileCheck2, TrendingUp, ClipboardList, Shield, User, UserCircle, Bell } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const ROLE_LABELS: Record<string, string> = {
  apuppt: "APUPPT",
  dk: "DK",
  du: "DU",
  owner: "Owner",
  superadmin: "Superadmin",
};

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function Navbar() {
  const { user, setUser } = useAuth();
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    setUser(null);
    window.location.href = "/login";
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["apuppt", "dk", "du", "owner", "superadmin"] },
    { href: "/activity", label: "Aktivitas", icon: FileText, roles: ["apuppt"] },
    { href: "/activities", label: "Aktivitas", icon: ClipboardList, roles: ["dk", "superadmin"] },
    { href: "/findings", label: "Temuan", icon: AlertTriangle, roles: ["apuppt", "dk", "du", "owner", "superadmin"] },
    { href: "/review", label: "Review", icon: ClipboardCheck, roles: ["dk", "superadmin"] },
    { href: "/signoff", label: "Sign-Off", icon: FileCheck2, roles: ["du", "superadmin"] },
    { href: "/kpi", label: "KPI", icon: TrendingUp, roles: ["dk", "du", "owner", "superadmin"] },
    { href: "/reports", label: "Laporan", icon: BarChart2, roles: ["dk", "du", "owner", "superadmin"] },
    { href: "/audit-log", label: "Audit Log", icon: Shield, roles: ["superadmin"] },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(user.role));
  const avatarSrc = user.avatarUrl ? `${API_BASE}${user.avatarUrl}` : null;

  return (
    <nav className="hidden sm:block bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center">
                <span className="text-xs font-bold text-white">ACC</span>
              </div>
              <span className="font-semibold text-sm text-white hidden sm:inline">APUPPT Control Center</span>
            </div>
            <div className="flex items-center gap-1">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2" ref={menuRef}>
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-800 transition-colors"
              >
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-slate-300" />
                  )}
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-medium text-white">{user.name}</div>
                  <div className="text-xs text-slate-400">{ROLE_LABELS[user.role]}</div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    <UserCircle className="w-3.5 h-3.5" />
                    Profil Saya
                  </Link>
                  <Link
                    href="/notification-settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    Pengaturan Notifikasi
                  </Link>
                  <div className="border-t border-slate-700" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
