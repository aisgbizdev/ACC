import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { RefreshCw, CheckCircle, AlertTriangle, Clock, FileText, BarChart2, PenLine, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useListPts } from "@workspace/api-client-react";

const STATUS_CONFIG = {
  green: { label: "Hijau", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  yellow: { label: "Kuning", dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  red: { label: "Merah", dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
};

type PtSummary = {
  ptId: string;
  ptCode: string;
  ptName: string;
  totalActivities: number;
  totalItemsReviewed: number;
  totalFindings: number;
  openFindings: number;
  completedFindings: number;
  activityBreakdown: Record<string, number>;
  dkReviewPct: number;
  duSignoff: { signedOffAt: string; signerName: string | null } | null;
  status: string;
  lastActivityDate: string | null;
};

type ReportsData = {
  summaries: PtSummary[];
  groupInsights: {
    mostStable: { ptCode: string; ptName: string } | null;
    mostFindings: { ptCode: string; ptName: string; count: number } | null;
    leastActive: { ptCode: string; ptName: string; count: number } | null;
  };
};

type Signoff = {
  id: string;
  ptId: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  signedOffBy: string;
  signerName: string | null;
  signedOffAt: string;
  notes: string | null;
};

function getWeekRange(date: Date): { start: string; end: string } {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
  };
}

function getMonthRange(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

const ACTIVITY_LABELS: Record<string, string> = {
  kyc: "KYC", cdd: "CDD", screening: "Screening",
  monitoring_transaksi: "Monitoring", pelaporan: "Pelaporan",
  sosialisasi: "Sosialisasi", lainnya: "Lainnya",
};
export default function Reports() {
  const { user } = useAuth();
  const { data: pts } = useListPts();
  const today = new Date();

  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().split("T")[0]);
  const [filterPt, setFilterPt] = useState<string>("");
  const [signingOff, setSigningOff] = useState<string | null>(null);
  const [signoffNotes, setSignoffNotes] = useState("");

  const isGlobalRole = !user?.ptId;
  const isDu = user?.role === "du";

  const getRange = () => {
    const d = new Date(selectedDate + "T00:00:00");
    if (activeTab === "daily") return { start: selectedDate, end: selectedDate };
    if (activeTab === "weekly") return getWeekRange(d);
    return getMonthRange(d);
  };

  const { start, end } = getRange();

  const queryParams = new URLSearchParams({
    startDate: start,
    endDate: end,
    periodType: activeTab === "daily" ? "weekly" : activeTab,
  });
  if (filterPt) queryParams.set("ptId", filterPt);

  const { data, isLoading, refetch, isRefetching } = useQuery<ReportsData>({
    queryKey: ["reports-summary", start, end, activeTab, filterPt],
    queryFn: () => apiFetch(`/api/reports/summary?${queryParams.toString()}`),
  });

  const { data: signoffs, refetch: refetchSignoffs } = useQuery<Signoff[]>({
    queryKey: ["signoffs", filterPt || user?.ptId, activeTab],
    queryFn: () => {
      const p = new URLSearchParams();
      if (user?.ptId) p.set("ptId", user.ptId);
      else if (filterPt) p.set("ptId", filterPt);
      if (activeTab !== "daily") p.set("periodType", activeTab);
      return apiFetch(`/api/reports/signoff?${p.toString()}`);
    },
  });

  const doSignoff = async (ptId: string) => {
    setSigningOff(ptId);
    try {
      await apiFetch(`/api/reports/signoff`, {
        method: "POST",
        body: JSON.stringify({
          ptId,
          periodType: activeTab,
          periodStart: start,
          periodEnd: end,
          notes: signoffNotes || null,
        }),
      });
      refetchSignoffs();
      setSignoffNotes("");
    } catch (err) {
      alert((err as Error).message ?? "Gagal melakukan sign-off.");
    }
    setSigningOff(null);
  };

  const isSignedOff = (ptId: string) => {
    if (activeTab === "daily") return false;
    return signoffs?.some(s =>
      s.ptId === ptId &&
      s.periodType === activeTab &&
      s.periodStart === start &&
      s.periodEnd === end
    ) ?? false;
  };

  const getSignoff = (ptId: string) => {
    if (activeTab === "daily") return null;
    return signoffs?.find(s =>
      s.ptId === ptId &&
      s.periodType === activeTab &&
      s.periodStart === start &&
      s.periodEnd === end
    ) ?? null;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Laporan</h1>
            <p className="text-sm text-slate-500 mt-0.5">Statistik per periode</p>
          </div>
          <div className="flex items-center gap-2">
            {isGlobalRole && pts && (
              <select
                value={filterPt}
                onChange={(e) => setFilterPt(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua PT</option>
                {pts.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            )}
            <button
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab + Date Picker */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
            {(["daily", "weekly", "monthly"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab === "daily" ? "Harian" : tab === "weekly" ? "Mingguan" : "Bulanan"}
              </button>
            ))}
          </div>
          <input
            type={activeTab === "monthly" ? "month" : "date"}
            value={activeTab === "monthly" ? selectedDate.slice(0, 7) : selectedDate}
            onChange={(e) => {
              if (activeTab === "monthly") {
                setSelectedDate(e.target.value + "-01");
              } else {
                setSelectedDate(e.target.value);
              }
            }}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-500">
            {activeTab === "daily" ? selectedDate : `${start} — ${end}`}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-slate-400 text-sm">Memuat data...</div>
          </div>
        ) : !data?.summaries || data.summaries.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">Tidak ada data laporan.</div>
        ) : (
          <>
            {/* Group Insights */}
            {isGlobalRole && data.groupInsights && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {data.groupInsights.mostStable && (
                  <div className="bg-white border border-emerald-200 rounded-xl px-4 py-3">
                    <p className="text-xs text-emerald-600 font-medium mb-1">PT Paling Stabil</p>
                    <p className="text-sm font-bold text-slate-800">{data.groupInsights.mostStable.ptCode}</p>
                    <p className="text-xs text-slate-500">{data.groupInsights.mostStable.ptName}</p>
                  </div>
                )}
                {data.groupInsights.mostFindings && (
                  <div className="bg-white border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-xs text-amber-600 font-medium mb-1">Paling Banyak Temuan</p>
                    <p className="text-sm font-bold text-slate-800">{data.groupInsights.mostFindings.ptCode}</p>
                    <p className="text-xs text-slate-500">{data.groupInsights.mostFindings.count} temuan</p>
                  </div>
                )}
                {data.groupInsights.leastActive && (
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                    <p className="text-xs text-slate-600 font-medium mb-1">Jarang Update</p>
                    <p className="text-sm font-bold text-slate-800">{data.groupInsights.leastActive.ptCode}</p>
                    <p className="text-xs text-slate-500">{data.groupInsights.leastActive.count} aktivitas</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              {data.summaries.map((pt) => {
                const config = STATUS_CONFIG[pt.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.red;
                const signedOff = isSignedOff(pt.ptId);
                const signoffInfo = getSignoff(pt.ptId);
                const canSignoff = isDu && !signedOff && activeTab !== "daily";

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
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
                          {config.label}
                        </span>
                        {signedOff && signoffInfo ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                            <Lock className="w-3 h-3" />
                            Sign-off oleh {signoffInfo.signerName}
                          </span>
                        ) : canSignoff ? (
                          <button
                            onClick={() => doSignoff(pt.ptId)}
                            disabled={signingOff === pt.ptId}
                            className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium hover:bg-blue-100 transition-colors"
                          >
                            <PenLine className="w-3 h-3" />
                            {signingOff === pt.ptId ? "..." : "Sign-Off Laporan"}
                          </button>
                        ) : null}
                      </div>
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
                        <div className="text-2xl font-bold text-slate-800">{pt.totalItemsReviewed}</div>
                        <div className="text-xs text-slate-500">Nasabah Diperiksa</div>
                      </div>
                      <div className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
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

                    {/* DK Review % & Activity Breakdown */}
                    <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-4 flex-wrap text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">DK Review:</span>
                        <span className={`font-semibold ${pt.dkReviewPct >= 80 ? "text-emerald-600" : pt.dkReviewPct >= 50 ? "text-amber-600" : "text-red-600"}`}>
                          {pt.dkReviewPct}%
                        </span>
                      </div>
                      {Object.entries(pt.activityBreakdown).map(([type, count]) => (
                        <span key={type} className="text-slate-400">
                          {ACTIVITY_LABELS[type] ?? type}: <strong className="text-slate-600">{count}</strong>
                        </span>
                      ))}
                      {pt.lastActivityDate && (
                        <span className="text-slate-400 ml-auto">
                          Update terakhir: {new Date(pt.lastActivityDate + "T00:00:00").toLocaleDateString("id-ID")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
