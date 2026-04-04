import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, FileText, AlertTriangle, ClipboardCheck, FileCheck2, BarChart2, TrendingUp } from "lucide-react";

export function BottomNav() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const allItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["apuppt", "dk", "du", "owner", "superadmin"] },
    { href: "/activity", label: "Aktivitas", icon: FileText, roles: ["apuppt"] },
    { href: "/findings", label: "Temuan", icon: AlertTriangle, roles: ["apuppt", "dk", "du", "owner", "superadmin"] },
    { href: "/review", label: "Review", icon: ClipboardCheck, roles: ["dk", "superadmin"] },
    { href: "/signoff", label: "Sign-Off", icon: FileCheck2, roles: ["du", "superadmin"] },
    { href: "/kpi", label: "KPI", icon: TrendingUp, roles: ["dk", "du", "owner", "superadmin"] },
    { href: "/reports", label: "Laporan", icon: BarChart2, roles: ["dk", "du", "owner", "superadmin"] },
  ];

  const items = allItems.filter(item => item.roles.includes(user.role)).slice(0, 5);

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
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                isActive ? "text-blue-400" : "text-slate-500"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
