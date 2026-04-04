import { useGetReportsSummary } from "@workspace/api-client-react";
import { RefreshCw, CheckCircle, AlertTriangle, Clock, FileText, ClipboardCheck, FileCheck2, Users } from "lucide-react";

const STATUS_CONFIG = {
  green: { label: "Hijau", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  yellow: { label: "Kuning", dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  red: { label: "Merah", dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
};

const ACTIVITY_LABELS: Record<string, string> = {
  kyc: "KYC", cdd: "CDD", screening: "Screening",
  monitoring_transaksi: "Monitoring Transaksi", pelaporan: "Pelaporan",
  sosialisasi: "Sosialisasi", lainnya: "Lainnya",
};

function Ratebar({ value, color = "bg-blue-500" }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-600 w-8 text-right">{value}%</span>
    </div>
  );
}

export default function Reports() {
  const { data, isLoading, refetch, isRefetching } = useGetReportsSummary();

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Laporan</h1>
            <p className="text-sm text-slate-500 mt-0.5">Ringkasan aktivitas & temuan per PT</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
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
              const anyProp = pt as unknown as Record<string, unknown>;
              const reviewedCount = (anyProp.reviewedCount as number) ?? 0;
              const signedOffCount = (anyProp.signedOffCount as number) ?? 0;
              const reviewRate = (anyProp.reviewRate as number) ?? 0;
              const signOffRate = (anyProp.signOffRate as number) ?? 0;
              const totalItemsReviewed = (anyProp.totalItemsReviewed as number) ?? 0;
              const activityTypeBreakdown = (anyProp.activityTypeBreakdown as Record<string, number>) ?? {};
              const totalActivitiesThisMonth = (anyProp.totalActivitiesThisMonth as number) ?? 0;

              return (
                <div key={pt.ptId} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className={`px-4 py-3 flex items-center justify-between border-b ${config.bg} ${config.border}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${config.dot}`} />
                      <div>
                        <span className="font-bold text-slate-800">{pt.ptCode}</span>
                        <span className="text-slate-500 text-sm ml-2">{pt.ptName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{totalActivitiesThisMonth} akt bulan ini</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
                        {config.label}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100">
                    <div className="px-4 py-3 text-center">
                      <FileText className="w-3.5 h-3.5 text-slate-300 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-slate-800">{pt.totalActivities}</div>
                      <div className="text-xs text-slate-500">Total Aktivitas</div>
                    </div>
                    <div className="px-4 py-3 text-center">
                      <Users className="w-3.5 h-3.5 text-blue-300 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-blue-700">{totalItemsReviewed.toLocaleString("id-ID")}</div>
                      <div className="text-xs text-slate-500">Nasabah Diperiksa</div>
                    </div>
                    <div className="px-4 py-3 text-center">
                      <AlertTriangle className="w-3.5 h-3.5 text-slate-300 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-slate-800">{pt.totalFindings}</div>
                      <div className="text-xs text-slate-500">Total Temuan</div>
                    </div>
                    <div className="px-4 py-3 text-center">
                      <Clock className="w-3.5 h-3.5 text-amber-300 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-amber-600">{pt.openFindings}</div>
                      <div className="text-xs text-slate-500">Temuan Terbuka</div>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-t border-slate-100 space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <ClipboardCheck className="w-3 h-3" />Review DK
                        </span>
                        <span className="text-xs text-slate-500">{reviewedCount + signedOffCount}/{pt.totalActivities}</span>
                      </div>
                      <Ratebar value={reviewRate} color="bg-emerald-500" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <FileCheck2 className="w-3 h-3" />Sign-Off DU
                        </span>
                        <span className="text-xs text-slate-500">{signedOffCount}/{pt.totalActivities}</span>
                      </div>
                      <Ratebar value={signOffRate} color="bg-violet-500" />
                    </div>
                  </div>

                  {Object.keys(activityTypeBreakdown).length > 0 && (
                    <div className="px-4 py-2 border-t border-slate-100">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(activityTypeBreakdown).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                          <span key={type} className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                            {ACTIVITY_LABELS[type] ?? type}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {pt.lastActivityDate && (
                    <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">
                      Update terakhir: {new Date(pt.lastActivityDate + "T00:00:00").toLocaleDateString("id-ID", {
                        weekday: "long", day: "numeric", month: "long", year: "numeric"
                      })}
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
