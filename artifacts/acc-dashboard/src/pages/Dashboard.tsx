import { useAuth } from "@/contexts/AuthContext";
import { useGetDashboardSummary } from "@workspace/api-client-react";
import { Link } from "wouter";
import { RefreshCw, AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react";

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

function getRedReason(pt: { lastActivityDate: string | null; overdueCount: number }): string {
  const today = new Date().toISOString().split("T")[0];
  const parts: string[] = [];
  if (!pt.lastActivityDate || pt.lastActivityDate !== today) {
    parts.push("Belum update hari ini");
  }
  if (pt.overdueCount > 0) {
    parts.push(`${pt.overdueCount} temuan overdue`);
  }
  return parts.join(" · ");
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

  const sortedPTs = data?.ptStatuses
    ? [...data.ptStatuses].sort((a, b) => {
        const aOrder = STATUS_ORDER[a.status] ?? 2;
        const bOrder = STATUS_ORDER[b.status] ?? 2;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.code.localeCompare(b.code);
      })
    : [];

  const ptName = data?.ptStatuses?.[0]?.name;
  const ptCode = data?.ptStatuses?.[0]?.code;

  const subtitle =
    user?.role === "apuppt"
      ? ptCode && ptName
        ? `${ptCode} — ${ptName}`
        : "Status PT Hari Ini"
      : "Semua PT — Status Hari Ini";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
            <p className="text-xs text-slate-400 mt-0.5">{today}</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 mt-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-slate-400 text-sm">Memuat data...</div>
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-slate-400 text-sm">Tidak ada data.</div>
        ) : (
          <>
            {user?.role !== "apuppt" && (
              <div className="grid grid-cols-3 gap-3 mb-5">
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
                  const redReason = pt.status === "red" ? getRedReason(pt) : null;
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
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{pt.code}</span>
                          <span className="text-xs text-slate-400 truncate hidden sm:inline">
                            {pt.name}
                          </span>
                        </div>
                        {redReason && (
                          <p className="text-xs text-red-500 mt-0.5">{redReason}</p>
                        )}
                        {pt.status === "yellow" && pt.openFindingsCount > 0 && (
                          <p className="text-xs text-amber-600 mt-0.5">
                            {pt.openFindingsCount} temuan terbuka
                          </p>
                        )}
                        {pt.status === "green" && (
                          <p className="text-xs text-emerald-600 mt-0.5">Update hari ini · Tidak ada temuan</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {pt.lastActivityDate && (
                          <span className="text-xs text-slate-400 hidden md:inline">
                            {new Date(pt.lastActivityDate + "T00:00:00").toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        )}
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
