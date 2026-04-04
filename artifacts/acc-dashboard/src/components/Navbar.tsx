import { useLocation, Link } from "wouter";
import { logout } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, LayoutDashboard, FileText, AlertTriangle, BarChart2, ChevronRight } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  apuppt: "APUPPT",
  dk: "DK",
  du: "DU",
  owner: "Owner",
};

export function Navbar() {
  const { user, setUser } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    setUser(null);
    window.location.href = "/login";
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["apuppt", "dk", "du", "owner"] },
    { href: "/activity", label: "Aktivitas", icon: FileText, roles: ["apuppt"] },
    { href: "/findings", label: "Temuan", icon: AlertTriangle, roles: ["apuppt", "dk", "owner"] },
    { href: "/reports", label: "Laporan", icon: BarChart2, roles: ["dk", "du", "owner"] },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <nav className="bg-slate-900 text-white">
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
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-white">{user.name}</div>
              <div className="text-xs text-slate-400">{ROLE_LABELS[user.role]}</div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
