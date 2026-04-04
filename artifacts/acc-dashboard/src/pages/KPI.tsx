import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { RefreshCw, TrendingUp, Users, ClipboardCheck, FileCheck2, Activity, Building2 } from "lucide-react";

const ACTIVITY_LABELS: Record<string, string> = {
  kyc: "KYC",
  cdd: "CDD",
  screening: "Screening",
  monitoring_transaksi: "Monitoring Transaksi",
  pelaporan: "Pelaporan",
  sosialisasi: "Sosialisasi",
  lainnya: "Lainnya",
};

type BranchStat = {
  branchId: string;
  branchName: string;
  totalActivities: number;
  totalItemsReviewed: number;
  reviewedCount: number;
};

type PtKpi = {
  ptId: string;
  ptCode: string;
  ptName: string;
  totalActivities: number;
  totalActivitiesThisMonth: number;
  reviewedCount: number;
  signedOffCount: number;
  pendingReviewCount: number;
  reviewRate: number;
  signOffRate: number;
  totalItemsReviewed: number;
  activityTypeBreakdown: Record<string, number>;
  byBranch: BranchStat[];
};

type KpiData = {
  total: number;
  totalThisMonth: number;
  totalToday: number;
  pendingReviewCount: number;
  reviewedCount: number;
  signedOffCount: number;
  reviewRate: number;
  signOffRate: number;
  totalItemsReviewed: number;
  monthItemsReviewed: number;
  activityTypeBreakdown: Record<string, number>;
  byPt: PtKpi[];
};

function Ratebar({ value, color = "bg-blue-500" }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-700 w-9 text-right">{value}%</span>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <Icon className={`w-8 h-8 opacity-20 ${color}`} />
      </div>
    </div>
  );
}

export default function KPI() {
  const { user } = useAuth();

  const { data, isLoading, refetch, isRefetching } = useQuery<KpiData>({
    queryKey: ["dashboard-kpi"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/kpi", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat data KPI");
      return res.json();
    },
    staleTime: 60_000,
  });

  const thisMonth = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              KPI & Analitik
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Statistik kepatuhan dan review — {thisMonth}</p>
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
          <div className="text-center py-16 text-slate-400 text-sm">Memuat data KPI...</div>
        ) : !data ? (
          <div className="text-center py-16 text-slate-400 text-sm">Gagal memuat data.</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total Aktivitas" value={data.total} sub={`${data.totalThisMonth} bulan ini`} icon={Activity} color="text-blue-600" />
              <StatCard label="Menunggu Review" value={data.pendingReviewCount} sub="belum di-review DK" icon={ClipboardCheck} color="text-amber-600" />
              <StatCard label="Review Rate DK" value={`${data.reviewRate}%`} sub={`${data.reviewedCount + data.signedOffCount} disetujui`} icon={ClipboardCheck} color="text-emerald-600" />
              <StatCard label="Sign-Off Rate DU" value={`${data.signOffRate}%`} sub={`${data.signedOffCount} sign-off`} icon={FileCheck2} color="text-violet-600" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700">Total Nasabah Diperiksa</h3>
                </div>
                <p className="text-3xl font-bold text-blue-600 mt-2">{data.totalItemsReviewed.toLocaleString("id-ID")}</p>
                <p className="text-xs text-slate-400 mt-1">{data.monthItemsReviewed.toLocaleString("id-ID")} bulan ini</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Breakdown Jenis Kegiatan</h3>
                <div className="space-y-1.5">
                  {Object.entries(data.activityTypeBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">{ACTIVITY_LABELS[type] ?? type}</span>
                        <span className="text-xs font-bold text-slate-800">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Analitik Per PT</h2>
              <div className="space-y-4">
                {data.byPt.map((pt) => (
                  <div key={pt.ptId} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 text-sm">{pt.ptCode}</span>
                        <span className="text-xs text-slate-500 ml-2">{pt.ptName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{pt.totalActivities} aktivitas</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />{pt.totalItemsReviewed.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">Review DK</span>
                          <span className="text-xs text-slate-600">{pt.reviewedCount}/{pt.totalActivities}</span>
                        </div>
                        <Ratebar value={pt.reviewRate} color="bg-emerald-500" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">Sign-Off DU</span>
                          <span className="text-xs text-slate-600">{pt.signedOffCount}/{pt.totalActivities}</span>
                        </div>
                        <Ratebar value={pt.signOffRate} color="bg-violet-500" />
                      </div>

                      {pt.byBranch.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            Per Cabang
                          </p>
                          <div className="space-y-1">
                            {pt.byBranch
                              .filter(b => b.totalActivities > 0)
                              .sort((a, b) => b.totalActivities - a.totalActivities)
                              .map(br => (
                                <div key={br.branchId} className="flex items-center justify-between text-xs">
                                  <span className="text-slate-600 flex-1 truncate">{br.branchName}</span>
                                  <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="text-slate-400">{br.totalActivities} akt</span>
                                    <span className="text-slate-400">{br.totalItemsReviewed} nasabah</span>
                                    <span className={`font-medium ${br.reviewedCount === br.totalActivities ? "text-emerald-600" : "text-amber-600"}`}>
                                      {br.reviewedCount}/{br.totalActivities} DK
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {Object.keys(pt.activityTypeBreakdown).length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-xs font-medium text-slate-500 mb-2">Jenis Kegiatan</p>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(pt.activityTypeBreakdown).map(([type, count]) => (
                              <span key={type} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                {ACTIVITY_LABELS[type] ?? type}: {count}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
