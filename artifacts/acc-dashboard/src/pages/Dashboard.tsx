import { useAuth } from "@/contexts/AuthContext";
import { useGetDashboardSummary } from "@workspace/api-client-react";
import { Link } from "wouter";
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react";

const STATUS_CONFIG = {
  green: {
    label: "Hijau",
    color: "bg-emerald-500",
    textColor: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: CheckCircle,
    dot: "bg-emerald-500",
  },
  yellow: {
    label: "Kuning",
    color: "bg-amber-400",
    textColor: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Clock,
    dot: "bg-amber-400",
  },
  red: {
    label: "Merah",
    color: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: AlertTriangle,
    dot: "bg-red-500",
  },
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useGetDashboardSummary();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {user?.role === "apuppt" ? `PT ${user.ptId ? "" : ""}` : "Semua PT — Status Hari Ini"}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-slate-400 text-sm">Memuat data...</div>
          </div>
        ) : !data ? (
          <div className="text-center py-16 text-slate-400 text-sm">Tidak ada data.</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {(["green", "yellow", "red"] as const).map((status) => {
                const config = STATUS_CONFIG[status];
                const count = status === "green" ? data.greenCount : status === "yellow" ? data.yellowCount : data.redCount;
                const Icon = config.icon;
                return (
                  <div key={status} className={`rounded-xl p-4 border ${config.bgColor} ${config.borderColor}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-medium ${config.textColor}`}>{config.label}</p>
                        <p className={`text-3xl font-bold mt-1 ${config.textColor}`}>{count}</p>
                      </div>
                      <Icon className={`w-8 h-8 ${config.textColor} opacity-40`} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Status PT</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {data.ptStatuses.map((pt) => {
                  const config = STATUS_CONFIG[pt.status as keyof typeof STATUS_CONFIG];
                  const Icon = config.icon;
                  return (
                    <Link key={pt.id} href={`/pt/${pt.id}`} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dot}`} />
                          <div>
                            <span className="text-sm font-medium text-slate-800">{pt.code}</span>
                            <span className="text-xs text-slate-500 ml-2">{pt.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {pt.lastActivityDate && (
                            <span>Update: {new Date(pt.lastActivityDate).toLocaleDateString("id-ID")}</span>
                          )}
                          {pt.openFindingsCount > 0 && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <AlertTriangle className="w-3 h-3" />
                              {pt.openFindingsCount} temuan
                            </span>
                          )}
                          {pt.overdueCount > 0 && (
                            <span className="text-red-600">{pt.overdueCount} overdue</span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
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
