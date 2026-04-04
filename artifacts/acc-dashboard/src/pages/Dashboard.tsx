import { useState, type ElementType } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGetDashboardSummary } from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  RefreshCw, AlertTriangle, CheckCircle, Clock, TrendingUp,
  ChevronDown, ChevronUp, Trophy, TrendingDown, Flame, CalendarX, ShieldAlert,
  FileText, ClipboardList, ClipboardCheck, FileCheck2, BarChart2,
  FileBarChart, Shield, Users, UserCircle,
} from "lucide-react";

const STATUS_CONFIG = {
  green: {
    label: "Hijau",
    labelLong: "Aman",
    textColor: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    accentBorder: "border-l-emerald-500",
    dotColor: "bg-emerald-500",
    icon: CheckCircle,
    iconColor: "text-emerald-500",
  },
  yellow: {
    label: "Kuning",
    labelLong: "Perlu Perhatian",
    textColor: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    accentBorder: "border-l-amber-400",
    dotColor: "bg-amber-400",
    icon: Clock,
    iconColor: "text-amber-500",
  },
  red: {
    label: "Merah",
    labelLong: "Kritis",
    textColor: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    accentBorder: "border-l-red-500",
    dotColor: "bg-red-500",
    icon: AlertTriangle,
    iconColor: "text-red-500",
  },
};

const STATUS_ORDER: Record<string, number> = { red: 0, yellow: 1, green: 2 };

type NavCard = {
  href: string;
  label: string;
  desc: string;
  icon: ElementType;
  gradient: string;
  roles: string[];
};

const NAV_CARDS: NavCard[] = [
  { href: "/activity",      label: "Input Aktivitas", desc: "Laporan harian",       icon: FileText,       gradient: "from-violet-500 to-purple-700",   roles: ["apuppt"] },
  { href: "/activities",    label: "Aktivitas PT",    desc: "Semua laporan",        icon: ClipboardList,  gradient: "from-indigo-500 to-violet-700",   roles: ["dk", "superadmin"] },
  { href: "/findings",      label: "Temuan",          desc: "Kelola temuan",        icon: AlertTriangle,  gradient: "from-rose-500 to-red-700",        roles: ["apuppt", "dk", "du", "owner", "superadmin"] },
  { href: "/review",        label: "Review DK",       desc: "Review aktivitas",     icon: ClipboardCheck, gradient: "from-teal-500 to-cyan-700",       roles: ["dk", "superadmin"] },
  { href: "/signoff",       label: "Sign-Off DU",     desc: "Tanda tangan laporan", icon: FileCheck2,     gradient: "from-emerald-500 to-green-700",   roles: ["du", "superadmin"] },
  { href: "/kpi",           label: "KPI",             desc: "Performa PT",          icon: TrendingUp,     gradient: "from-blue-500 to-indigo-700",     roles: ["dk", "du", "owner", "superadmin"] },
  { href: "/reports",       label: "Laporan",         desc: "Laporan compliance",   icon: BarChart2,      gradient: "from-sky-500 to-blue-700",        roles: ["dk", "du", "owner", "superadmin"] },
  { href: "/monthly-recap", label: "Rekap Bulanan",   desc: "Rekap per bulan",      icon: FileBarChart,   gradient: "from-orange-500 to-amber-700",    roles: ["dk", "du", "owner", "superadmin"] },
  { href: "/audit-log",     label: "Audit Log",       desc: "Log aktivitas sistem", icon: Shield,         gradient: "from-gray-600 to-slate-800",      roles: ["superadmin"] },
  { href: "/users",         label: "Manajemen User",  desc: "Kelola akun pengguna", icon: Users,          gradient: "from-blue-700 to-indigo-900",     roles: ["superadmin"] },
  { href: "/profile",       label: "Profil Saya",     desc: "Akun & pengaturan",    icon: UserCircle,     gradient: "from-slate-500 to-slate-700",     roles: ["apuppt", "dk", "du", "owner", "superadmin"] },
];

function MenuCardGrid({ role }: { role: string }) {
  const cards = NAV_CARDS.filter((c) => c.roles.includes(role));
  if (cards.length === 0) return null;

  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Menu</p>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className={`
                relative flex flex-col justify-between
                bg-gradient-to-br ${card.gradient}
                rounded-2xl p-4 shadow-md
                active:scale-95 transition-transform duration-150 cursor-pointer
                min-h-[100px]
              `}
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-2 flex-shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">{card.label}</p>
                <p className="text-xs text-white/70 mt-0.5 leading-tight">{card.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function formatLastUpdate(lastActivityDate: string | null | undefined): string {
  if (!lastActivityDate) return "Belum pernah update";
  const d = new Date(lastActivityDate + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function getStatusDetail(pt: {
  status: string;
  lastActivityDate?: string | null;
  overdueCount: number;
  openFindingsCount: number;
  consecutiveRedDays: number;
}): { text: string; color: string } {
  const today = new Date().toISOString().split("T")[0];
  const isUpdatedToday = pt.lastActivityDate === today;

  if (pt.status === "red") {
    const parts: string[] = [];
    if (!isUpdatedToday) parts.push("Belum update hari ini");
    if (pt.overdueCount > 0) parts.push(`${pt.overdueCount} temuan overdue`);
    return { text: parts.join(" · ") || "Status kritis", color: "text-red-500" };
  }
  if (pt.status === "yellow") {
    if (pt.overdueCount > 0) return { text: `${pt.overdueCount} temuan overdue`, color: "text-amber-600" };
    if (pt.openFindingsCount > 0) return { text: `${pt.openFindingsCount} temuan terbuka`, color: "text-amber-600" };
    return { text: "Perlu perhatian", color: "text-amber-600" };
  }
  return { text: "Update hari ini · Tidak ada temuan", color: "text-emerald-600" };
}

type PtStatus = {
  id: string;
  code: string;
  name: string;
  status: string;
  consecutiveRedDays: number;
  overdueCount: number;
  openFindingsCount: number;
  lastActivityDate?: string | null;
};

function CriticalPanel({ pts }: { pts: PtStatus[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const redToday = pts.filter((p) => p.status === "red");
  const longRed = pts.filter((p) => p.consecutiveRedDays >= 2);
  const overdue = pts.filter((p) => p.overdueCount > 0);
  const noUpdate = pts.filter((p) => !p.lastActivityDate || p.lastActivityDate !== today);

  const hasIssues = redToday.length > 0 || longRed.length > 0 || overdue.length > 0;
  if (!hasIssues) return null;

  const totalIssues = redToday.length + (longRed.length > 0 ? 1 : 0) + (overdue.length > 0 ? 1 : 0) + (noUpdate.length > 0 ? 1 : 0);

  return (
    <div className="mb-5 rounded-xl border-2 border-red-300 bg-red-50 shadow-md overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500 flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-red-800 tracking-wide uppercase">⚠ Butuh Perhatian Sekarang</span>
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalIssues}</span>
        </div>
        {collapsed
          ? <ChevronDown className="w-4 h-4 text-red-400 flex-shrink-0" />
          : <ChevronUp className="w-4 h-4 text-red-400 flex-shrink-0" />
        }
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3 border-t border-red-200">
          {redToday.length > 0 && (
            <div className="pt-3">
              <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                PT MERAH HARI INI
              </p>
              <div className="space-y-1.5">
                {redToday.map((p) => (
                  <Link key={p.id} href={`/pt/${p.id}`} className="flex items-center gap-2 text-xs group">
                    <span className="font-bold bg-red-600 text-white px-2 py-0.5 rounded">{p.code}</span>
                    <span className="text-red-800 font-medium">{p.name}</span>
                    {p.overdueCount > 0 && (
                      <span className="ml-auto text-red-600 font-semibold">{p.overdueCount} overdue</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {longRed.length > 0 && (
            <div className="pt-1">
              <p className="text-xs font-bold text-orange-700 mb-2 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                MERAH BERTURUT-TURUT
              </p>
              <div className="space-y-1.5">
                {longRed.map((p) => (
                  <Link key={p.id} href={`/pt/${p.id}`} className="flex items-center gap-2 text-xs">
                    <span className="font-bold bg-orange-500 text-white px-2 py-0.5 rounded">{p.code}</span>
                    <span className="text-orange-800 font-medium">{p.name}</span>
                    <span className="ml-auto font-bold text-orange-700 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded">
                      Merah {p.consecutiveRedDays} hari 🔥
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {overdue.length > 0 && (
            <div className="pt-1">
              <p className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1.5">
                <CalendarX className="w-3.5 h-3.5" />
                TEMUAN OVERDUE
              </p>
              <div className="space-y-1.5">
                {overdue.map((p) => (
                  <Link key={p.id} href={`/pt/${p.id}`} className="flex items-center gap-2 text-xs">
                    <span className="font-bold bg-amber-500 text-white px-2 py-0.5 rounded">{p.code}</span>
                    <span className="text-amber-800 font-medium">{p.name}</span>
                    <span className="ml-auto font-semibold text-amber-700">{p.overdueCount} temuan overdue</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {noUpdate.length > 0 && (
            <div className="pt-1">
              <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                BELUM UPDATE HARI INI
              </p>
              <div className="space-y-1.5">
                {noUpdate.map((p) => (
                  <Link key={p.id} href={`/pt/${p.id}`} className="flex items-center gap-2 text-xs">
                    <span className="font-bold bg-slate-500 text-white px-2 py-0.5 rounded">{p.code}</span>
                    <span className="text-slate-700 font-medium">{p.name}</span>
                    <span className="ml-auto text-slate-500">
                      {p.lastActivityDate
                        ? `Terakhir: ${formatLastUpdate(p.lastActivityDate)}`
                        : "Belum pernah update"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KpiMiniBar({ pts }: { pts: PtStatus[] }) {
  const today = new Date().toISOString().split("T")[0];
  const totalOverdue = pts.reduce((sum, p) => sum + p.overdueCount, 0);
  const noUpdateCount = pts.filter((p) => !p.lastActivityDate || p.lastActivityDate !== today).length;
  const redCount = pts.filter((p) => p.status === "red").length;
  const greenCount = pts.filter((p) => p.status === "green").length;

  const items = [
    {
      label: "Temuan Overdue",
      value: totalOverdue,
      color: totalOverdue > 0 ? "text-red-600" : "text-emerald-600",
      bg: totalOverdue > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200",
    },
    {
      label: "PT Belum Update",
      value: noUpdateCount,
      color: noUpdateCount > 0 ? "text-orange-600" : "text-emerald-600",
      bg: noUpdateCount > 0 ? "bg-orange-50 border-orange-200" : "bg-emerald-50 border-emerald-200",
    },
    {
      label: "PT Kritis (Merah)",
      value: redCount,
      color: redCount > 0 ? "text-red-600" : "text-emerald-600",
      bg: redCount > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200",
    },
    {
      label: "PT Aman (Hijau)",
      value: greenCount,
      color: greenCount === pts.length ? "text-emerald-700" : "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 mb-5">
      {items.map((item) => (
        <div key={item.label} className={`rounded-lg border px-3 py-2.5 text-center ${item.bg}`}>
          <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-tight">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function RankingPanel({ pts }: { pts: PtStatus[] }) {
  if (pts.length < 2) return null;

  const worst = pts.slice(0, Math.min(3, pts.length));
  const best = [...pts].slice(-Math.min(3, pts.length)).reverse();

  const allSameStatus = pts.every((p) => p.status === pts[0].status);
  if (allSameStatus && pts.every((p) => p.consecutiveRedDays === 0 && p.overdueCount === 0)) return null;

  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-3 py-2.5 border-b border-slate-100 flex items-center gap-2 bg-red-50">
          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Perlu Tindakan</span>
        </div>
        <div className="divide-y divide-slate-50">
          {worst.map((p, i) => {
            const conf = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.red;
            return (
              <Link key={p.id} href={`/pt/${p.id}`} className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 transition-colors">
                <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${conf.dotColor}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate">{p.code}</p>
                  <p className="text-xs text-slate-400 truncate">{p.name}</p>
                </div>
                {p.consecutiveRedDays >= 2 && (
                  <span className="text-xs font-semibold text-orange-600 flex-shrink-0">{p.consecutiveRedDays}h 🔥</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-3 py-2.5 border-b border-slate-100 flex items-center gap-2 bg-emerald-50">
          <Trophy className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Terbaik Saat Ini</span>
        </div>
        <div className="divide-y divide-slate-50">
          {best.map((p, i) => {
            const conf = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.red;
            return (
              <Link key={p.id} href={`/pt/${p.id}`} className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 transition-colors">
                <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${conf.dotColor}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate">{p.code}</p>
                  <p className="text-xs text-slate-400 truncate">{p.name}</p>
                </div>
                {p.status === "green" && (
                  <span className="text-xs text-emerald-600 flex-shrink-0">✓</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useGetDashboardSummary();

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const sortedPTs: PtStatus[] = data?.ptStatuses
    ? [...data.ptStatuses].sort((a, b) => {
        const aOrder = STATUS_ORDER[a.status] ?? 2;
        const bOrder = STATUS_ORDER[b.status] ?? 2;
        if (aOrder !== bOrder) return aOrder - bOrder;
        if (a.consecutiveRedDays !== b.consecutiveRedDays) return b.consecutiveRedDays - a.consecutiveRedDays;
        if (a.overdueCount !== b.overdueCount) return b.overdueCount - a.overdueCount;
        return a.code.localeCompare(b.code);
      })
    : [];

  const ptCode = data?.ptStatuses?.[0]?.code;
  const ptName = data?.ptStatuses?.[0]?.name;

  const subtitle =
    user?.role === "apuppt"
      ? ptCode && ptName
        ? `${ptCode} — ${ptName}`
        : "Status PT Hari Ini"
      : "Semua PT — Status Hari Ini";

  const isMultiPT = user?.role !== "apuppt";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs text-slate-400 sm:hidden">{today}</p>
            <h1 className="text-xl font-bold text-slate-900 sm:hidden">
              Halo, {user?.name?.split(" ")[0]} 👋
            </h1>
            <h1 className="text-xl font-bold text-slate-900 hidden sm:block">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">{today}</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 mt-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {user && <MenuCardGrid role={user.role} />}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-slate-400 text-sm">Memuat data...</div>
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-slate-400 text-sm">Tidak ada data.</div>
        ) : (
          <>
            {isMultiPT && sortedPTs.length > 0 && (
              <CriticalPanel pts={sortedPTs} />
            )}

            {isMultiPT && (
              <>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {(["red", "yellow", "green"] as const).map((status) => {
                    const config = STATUS_CONFIG[status];
                    const count =
                      status === "green"
                        ? data.greenCount
                        : status === "yellow"
                        ? data.yellowCount
                        : data.redCount;
                    const Icon = config.icon;
                    return (
                      <div
                        key={status}
                        className={`rounded-xl p-4 border-2 ${config.bgColor} ${config.borderColor}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-xs font-semibold uppercase tracking-wide ${config.textColor}`}>
                              {config.label}
                            </p>
                            <p className={`text-4xl font-bold mt-1 ${config.textColor}`}>{count}</p>
                            <p className={`text-xs mt-1 ${config.textColor} opacity-70`}>
                              {config.labelLong}
                            </p>
                          </div>
                          <Icon className={`w-9 h-9 ${config.iconColor} opacity-30`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <KpiMiniBar pts={sortedPTs} />
                <RankingPanel pts={sortedPTs} />
              </>
            )}

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  <h2 className="text-sm font-semibold text-slate-700">Status PT</h2>
                </div>
                <span className="text-xs text-slate-400">{sortedPTs.length} PT</span>
              </div>
              <div className="divide-y divide-slate-100">
                {sortedPTs.map((pt) => {
                  const config =
                    STATUS_CONFIG[pt.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.red;
                  const Icon = config.icon;
                  const detail = getStatusDetail(pt);
                  return (
                    <Link
                      key={pt.id}
                      href={`/pt/${pt.id}`}
                      className={`flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors cursor-pointer border-l-4 ${config.accentBorder}`}
                    >
                      <div className="flex-shrink-0">
                        <div className={`w-4 h-4 rounded-full ${config.dotColor}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-slate-900">{pt.code}</span>
                          <span className="text-xs text-slate-400 truncate hidden sm:inline">
                            {pt.name}
                          </span>
                        </div>

                        <p className={`text-xs font-medium ${detail.color}`}>{detail.text}</p>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {pt.consecutiveRedDays >= 2 && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                              🔥 Merah {pt.consecutiveRedDays} hari
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            {pt.lastActivityDate
                              ? `Update: ${formatLastUpdate(pt.lastActivityDate)}`
                              : "Belum pernah update"}
                          </span>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <span
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
                        >
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
