import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { logout } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bell,
  Search,
  LayoutDashboard,
  FileText,
  AlertTriangle,
  BarChart2,
  ClipboardCheck,
  FileCheck2,
  TrendingUp,
  ClipboardList,
  Shield,
  User,
  UserCircle,
  FileBarChart,
  Users,
  Settings,
  LogOut,
  PanelLeftClose,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  apuppt: "APUPPT",
  dk: "DK",
  du: "DU",
  owner: "Owner",
  superadmin: "Superadmin",
};

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: string[];
  section?: "main" | "admin" | "account";
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["apuppt", "dk", "du", "owner", "superadmin"], section: "main" },
  { href: "/activity", label: "Aktivitas", icon: FileText, roles: ["apuppt"], section: "main" },
  { href: "/activities", label: "Aktivitas", icon: ClipboardList, roles: ["dk", "superadmin"], section: "main" },
  { href: "/findings", label: "Temuan", icon: AlertTriangle, roles: ["apuppt", "dk", "du", "owner", "superadmin"], section: "main" },
  { href: "/review", label: "Review", icon: ClipboardCheck, roles: ["dk", "superadmin"], section: "main" },
  { href: "/signoff", label: "Sign-Off", icon: FileCheck2, roles: ["du", "superadmin"], section: "main" },
  { href: "/kpi", label: "KPI & Rank", icon: TrendingUp, roles: ["dk", "du", "owner", "superadmin"], section: "main" },
  { href: "/reports", label: "Laporan", icon: BarChart2, roles: ["dk", "du", "owner", "superadmin"], section: "main" },
  { href: "/monthly-recap", label: "Rekap Bulanan", icon: FileBarChart, roles: ["dk", "du", "owner", "superadmin"], section: "main" },
  { href: "/audit-log", label: "Audit Log", icon: Shield, roles: ["superadmin"], section: "admin" },
  { href: "/users", label: "Users", icon: Users, roles: ["superadmin"], section: "admin" },
  { href: "/profile", label: "Profil", icon: UserCircle, roles: ["apuppt", "dk", "du", "owner", "superadmin"], section: "account" },
  { href: "/notification-settings", label: "Notifikasi", icon: Settings, roles: ["apuppt", "dk", "du", "owner", "superadmin"], section: "account" },
];

function ShellLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
        active
          ? "bg-[#111f42] text-white shadow-[inset_0_0_0_1px_rgba(59,130,246,0.28)]"
          : "text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300"}`} />
      <span>{label}</span>
    </Link>
  );
}

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

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const avatarSrc = user.avatarUrl ? `${API_BASE}${user.avatarUrl}` : null;

  const mainItems = useMemo(
    () => visibleItems.filter((item) => item.section === "main"),
    [visibleItems],
  );
  const adminItems = useMemo(
    () => visibleItems.filter((item) => item.section === "admin"),
    [visibleItems],
  );

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    setUser(null);
    window.location.href = "/login";
  };

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/6 bg-[#07111f] md:flex md:flex-col">
        <div className="border-b border-white/6 px-8 py-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0c5cff]/15 text-sky-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tight text-sky-400">ACC</p>
              <p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">Control Center</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-6">
          <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#12336b] text-lg font-semibold text-sky-300">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                <p className="text-xs text-slate-400">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-5">
          <div className="space-y-1.5">
            {mainItems.map((item) => (
              <ShellLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={location.startsWith(item.href)}
              />
            ))}
          </div>

          {adminItems.length > 0 && (
            <div className="mt-8">
              <p className="px-4 pb-3 text-[11px] uppercase tracking-[0.28em] text-slate-500">Admin</p>
              <div className="space-y-1.5">
                {adminItems.map((item) => (
                  <ShellLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={location.startsWith(item.href)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/6 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-30 hidden h-16 border-b border-white/6 bg-[#091321]/90 backdrop-blur md:left-72 md:flex">
        <div className="flex w-full items-center justify-between px-8">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <PanelLeftClose className="h-4 w-4 text-slate-500" />
            <span className="font-mono text-[15px] tracking-wide text-slate-300">{today}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-slate-400 lg:flex">
              <Search className="h-4 w-4" />
              <span>Cari...</span>
              <span className="rounded-lg border border-white/8 px-2 py-0.5 text-[11px] text-slate-500">⌘K</span>
            </div>

            <Link
              href="/notification-settings"
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-2.5 text-slate-400 transition-colors hover:text-white"
            >
              <Bell className="h-4 w-4" />
            </Link>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 transition-colors hover:bg-white/[0.05]"
              >
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#12336b] text-sm font-semibold text-sky-300">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="hidden text-left xl:block">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
                </div>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-white/8 bg-[#0d1727] shadow-2xl">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 transition-colors hover:bg-white/[0.04] hover:text-white"
                  >
                    <UserCircle className="h-4 w-4" />
                    Profil Saya
                  </Link>
                  <Link
                    href="/notification-settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 transition-colors hover:bg-white/[0.04] hover:text-white"
                  >
                    <Bell className="h-4 w-4" />
                    Notifikasi
                  </Link>
                  <div className="border-t border-white/6" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-rose-400 transition-colors hover:bg-rose-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
