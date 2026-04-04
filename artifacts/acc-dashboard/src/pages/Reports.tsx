import { useGetReportsSummary } from "@workspace/api-client-react";
import { RefreshCw, CheckCircle, AlertTriangle, Clock, FileText, BarChart2 } from "lucide-react";

const STATUS_CONFIG = {
  green: { label: "Hijau", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  yellow: { label: "Kuning", dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  red: { label: "Merah", dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
};

export default function Reports() {
  const { data, isLoading, refetch, isRefetching } = useGetReportsSummary();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Laporan</h1>
            <p className="text-sm text-slate-500 mt-0.5">Ringkasan per PT</p>
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
        ) : !data || data.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">Tidak ada data laporan.</div>
        ) : (
          <div className="space-y-4">
            {data.map((pt) => {
              const config = STATUS_CONFIG[pt.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.red;
              return (
                <div key={pt.ptId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className={`px-4 py-3 flex items-center justify-between border-b ${config.bg} ${config.border}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${config.dot}`} />
                      <div>
                        <span className="font-semibold text-slate-800">{pt.ptCode}</span>
                        <span className="text-slate-500 text-sm ml-2">{pt.ptName}</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
                      {config.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
                    <div className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div className="text-2xl font-bold text-slate-800">{pt.totalActivities}</div>
                      <div className="text-xs text-slate-500">Total Aktivitas</div>
                    </div>
                    <div className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div className="text-2xl font-bold text-slate-800">{pt.totalFindings}</div>
                      <div className="text-xs text-slate-500">Total Temuan</div>
                    </div>
                    <div className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <div className="text-2xl font-bold text-amber-600">{pt.openFindings}</div>
                      <div className="text-xs text-slate-500">Temuan Terbuka</div>
                    </div>
                    <div className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-bold text-emerald-600">{pt.completedFindings}</div>
                      <div className="text-xs text-slate-500">Temuan Selesai</div>
                    </div>
                  </div>
                  {pt.lastActivityDate && (
                    <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">
                      Update terakhir: {new Date(pt.lastActivityDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
