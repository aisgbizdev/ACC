import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, FileText, AlertTriangle, BarChart2, UserCircle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function BottomNav() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const allItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["apuppt", "dk", "du", "owner", "superadmin"] },
    { href: "/activity", label: "Aktivitas", icon: FileText, roles: ["apuppt"] },
    { href: "/findings", label: "Temuan", icon: AlertTriangle, roles: ["apuppt", "dk", "du", "owner", "superadmin"] },
    { href: "/reports", label: "Laporan", icon: BarChart2, roles: ["dk", "du", "owner", "superadmin"] },
    { href: "/profile", label: "Profil", icon: UserCircle, roles: ["apuppt", "dk", "du", "owner", "superadmin"], isProfile: true },
  ];

  const items = allItems.filter(item => item.roles.includes(user.role));

  if (items.length === 0) return null;

  const avatarSrc = user.avatarUrl ? `${API_BASE}${user.avatarUrl}` : null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = location.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 min-h-[56px] transition-colors active:opacity-70 ${
                isActive ? "text-blue-400" : "text-slate-500"
              }`}
            >
              {item.isProfile && avatarSrc ? (
                <div className={`w-5 h-5 rounded-full overflow-hidden border ${isActive ? "border-blue-400" : "border-slate-600"}`}>
                  <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <Icon className="w-5 h-5" />
              )}
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
