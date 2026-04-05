import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGetPt, useListActivities, useListFindings } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, AlertTriangle, FileText, CheckCircle, Clock, Building2, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";

type DayHistory = { date: string; status: string };

function useHistoryData(ptId: string) {
  return useQuery<DayHistory[]>({
    queryKey: ["pt-history", ptId],
    queryFn: () => apiFetch(`/api/pts/${ptId}/history?days=7`),
    enabled: !!ptId,
  });
}

const DAY_STATUS_BADGE: Record<string, string> = {
  green: "bg-emerald-500 text-white",
  yellow: "bg-amber-400 text-white",
  red: "bg-red-500 text-white",
  weekend: "bg-slate-200 text-slate-400",
};

function SevenDayHistory({ ptId }: { ptId: string }) {
  const { data: history } = useHistoryData(ptId);
  if (!history || history.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 mt-3">
      {history.map((day) => {
        const d = new Date(day.date + "T00:00:00");
        return (
          <div key={day.date} className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${DAY_STATUS_BADGE[day.status] ?? "bg-slate-200 text-slate-600"}`}>
              {d.toLocaleDateString("id-ID", { weekday: "narrow" })}
            </div>
            <span className="text-xs text-slate-400">{d.getDate()}</span>
          </div>
        );
      })}
    </div>
  );
}

const STATUS_CONFIG = {
  green: {
    label: "Hijau",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    accentBorder: "border-l-emerald-500",
    icon: CheckCircle,
  },
  yellow: {
    label: "Kuning",
    dot: "bg-amber-400",
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    accentBorder: "border-l-amber-400",
    icon: Clock,
  },
  red: {
    label: "Merah",
    dot: "bg-red-500",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    accentBorder: "border-l-red-500",
    icon: AlertTriangle,
  },
};

const FINDING_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-red-600 bg-red-50 border-red-200" },
  follow_up: { label: "Follow Up", color: "text-amber-600 bg-amber-50 border-amber-200" },
  completed: { label: "Selesai", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
};

const ACTIVITY_LABELS: Record<string, string> = {
  kyc: "KYC",
  cdd: "CDD",
  screening: "Screening",
  monitoring_transaksi: "Monitoring Transaksi",
  pelaporan: "Pelaporan",
  sosialisasi: "Sosialisasi APUPPT",
  lainnya: "Lainnya",
  libur: "Hari Libur",
};

type BranchAnalytics = {
  branchId: string;
  branchName: string;
  updateRate: number;
  totalCustomers: number;
  openFindings: number;
  trafficLight: "green" | "yellow" | "red";
};

const TRAFFIC_LIGHT_CONFIG = {
  green: { label: "Hijau", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  yellow: { label: "Kuning", dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50" },
  red: { label: "Merah", dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
};

type TabKey = "overview" | "rekap_cabang";

export default function PTDetail() {
  const [, params] = useRoute("/pt/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ?? "";
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const { data: pt, isLoading: ptLoading } = useGetPt(id);
  const { data: activities, isLoading: actLoading } = useListActivities({ ptId: id });
  const { data: findings, isLoading: findLoading } = useListFindings({ ptId: id });

  const today = new Date().toISOString().split("T")[0];
  const todayDayOfWeek = new Date(today + "T00:00:00").getDay();
  const isWeekendToday = todayDayOfWeek === 0 || todayDayOfWeek === 6;
  const firstOfMonth = `${today.slice(0, 7)}-01`;

  const branchAnalyticsQuery = useQuery<{ branches: BranchAnalytics[] }>({
    queryKey: ["branch-analytics", id, firstOfMonth, today],
    queryFn: async () => {
      const params = new URLSearchParams({ ptId: id, startDate: firstOfMonth, endDate: today });
      const res = await fetch(`/api/branches/analytics?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat rekap cabang");
      return res.json();
    },
    enabled: activeTab === "rekap_cabang" && !!id,
    staleTime: 60_000,
  });

  if (ptLoading || actLoading || findLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm">Memuat...</div>
      </div>
    );
  }

  if (!pt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 text-sm">PT tidak ditemukan.</div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[pt.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.red;
  const StatusIcon = statusCfg.icon;

  const todayActivity = activities?.find((a) => a.date === today);
  const openFindings = findings?.filter((f) => f.status !== "completed") ?? [];
  const overdueFindings = openFindings.filter((f) => {
    const days = Math.floor((new Date(today).getTime() - new Date(f.date).getTime()) / 86400000);
    return days > 3;
  });

  const canSeeRekapCabang = ["dk", "du", "owner", "superadmin"].includes(user?.role ?? "");

  const handleBranchClick = (branchId: string) => {
    setSelectedBranchId(branchId);
    setActiveTab("overview");
  };

  const filteredActivities = selectedBranchId
    ? activities?.filter(a => a.branchId === selectedBranchId)
    : activities;
  const filteredFindings = selectedBranchId
    ? findings?.filter(f => f.branchId === selectedBranchId)
    : findings;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  {pt.code}
                  <span className="font-normal text-slate-500 ml-2 text-base">{pt.name}</span>
                </h1>
              </div>
              <span
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
              >
                <StatusIcon className="w-3 h-3" />
                {statusCfg.label}
              </span>
            </div>
            <SevenDayHistory ptId={id} />
          </div>
        </div>

        {canSeeRekapCabang && (
          <div className="flex border-b border-slate-200 mb-5 gap-0.5">
            {(["overview", "rekap_cabang"] as TabKey[]).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedBranchId(null); }}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab === "overview"
                  ? "Overview"
                  : <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />Rekap Cabang</span>
                }
              </button>
            ))}
          </div>
        )}

        {selectedBranchId && activeTab === "overview" && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs text-blue-700 font-medium flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Difilter berdasarkan cabang: {branchAnalyticsQuery.data?.branches.find(b => b.branchId === selectedBranchId)?.branchName ?? "Cabang"}
            </span>
            <button
              onClick={() => setSelectedBranchId(null)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
            >
              Hapus filter
            </button>
          </div>
        )}

        {activeTab === "overview" && (
          <>
            {pt.status === "red" && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">
                  {!todayActivity && !isWeekendToday && <p className="font-medium">Aktivitas hari ini belum diinput.</p>}
                  {!todayActivity && isWeekendToday && <p className="font-medium">Hari ini libur — tidak wajib input aktivitas.</p>}
                  {todayActivity?.activityType === "libur" && <p className="font-medium">Hari libur dicatat — tidak dihitung dalam kepatuhan.</p>}
                  {overdueFindings.length > 0 && (
                    <p className="font-medium">{overdueFindings.length} temuan sudah melewati batas 3 hari.</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm border-l-4 ${statusCfg.accentBorder}`}>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <h2 className="text-sm font-semibold text-slate-700">Aktivitas Harian</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {!selectedBranchId && (todayActivity ? (
                      <span className="text-xs text-emerald-600 font-medium">✓ Sudah update hari ini</span>
                    ) : (
                      <span className="text-xs text-red-500 font-medium">Belum update hari ini</span>
                    ))}
                    <span className="text-xs text-slate-300">|</span>
                    <span className="text-xs text-slate-400">{filteredActivities?.length ?? 0} record</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 sm:max-h-72 overflow-y-auto">
                  {!filteredActivities || filteredActivities.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-400">Belum ada aktivitas.</div>
                  ) : (
                    filteredActivities
                      .slice()
                      .reverse()
                      .map((a) => (
                        <div
                          key={a.id}
                          className={`px-4 py-3 ${a.date === today ? "bg-emerald-50/50" : ""}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-slate-700">
                              {new Date(a.date + "T00:00:00").toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                              {a.date === today && (
                                <span className="ml-2 text-emerald-600 font-semibold">— Hari ini</span>
                              )}
                            </span>
                            {a.hasFinding && (
                              <span className="flex items-center gap-1 text-xs text-amber-600">
                                <AlertTriangle className="w-3 h-3" />
                                Ada Temuan
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            {ACTIVITY_LABELS[a.activityType] ?? a.activityType}
                          </div>
                          {a.itemsReviewed > 0 && (
                            <div className="text-xs text-slate-400 mt-0.5">{a.itemsReviewed} item diperiksa</div>
                          )}
                        </div>
                      ))
                  )}
                </div>
                {user?.role === "apuppt" && (
                  <div className="px-4 py-3 border-t border-slate-100">
                    <Link
                      href="/activity"
                      className="block w-full text-center text-xs font-medium text-blue-600 hover:text-blue-700 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      {todayActivity ? "Edit Aktivitas Hari Ini" : "+ Tambah Aktivitas Hari Ini"}
                    </Link>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-slate-400" />
                    <h2 className="text-sm font-semibold text-slate-700">Temuan</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {(filteredFindings?.filter(f => f.status !== "completed") ?? []).length > 0 && (
                      <span className="text-xs text-amber-600 font-medium">
                        {(filteredFindings?.filter(f => f.status !== "completed") ?? []).length} terbuka
                      </span>
                    )}
                    {(filteredFindings?.filter(f => f.status !== "completed") ?? []).length > 0 && (
                      <span className="text-xs text-slate-300">|</span>
                    )}
                    <span className="text-xs text-slate-400">{filteredFindings?.length ?? 0} total</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 sm:max-h-72 overflow-y-auto">
                  {!filteredFindings || filteredFindings.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-400">Tidak ada temuan.</div>
                  ) : (
                    filteredFindings
                      .slice()
                      .reverse()
                      .map((f) => {
                        const statusInfo = FINDING_STATUS[f.status] ?? FINDING_STATUS.pending;
                        const daysDiff = Math.floor(
                          (new Date(today).getTime() - new Date(f.date).getTime()) / 86400000
                        );
                        const isOverdue = f.status !== "completed" && daysDiff > 3;
                        return (
                          <div
                            key={f.id}
                            className={`px-4 py-3 ${isOverdue ? "bg-red-50/50" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs text-slate-700 flex-1">{f.findingText}</p>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${statusInfo.color}`}
                              >
                                {statusInfo.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-400">
                                {new Date(f.date + "T00:00:00").toLocaleDateString("id-ID")}
                              </span>
                              {isOverdue && (
                                <span className="text-xs text-red-500 font-medium">
                                  · {daysDiff} hari overdue
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "rekap_cabang" && canSeeRekapCabang && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500">Rekap aktivitas dan temuan per cabang bulan ini</p>
            </div>

            {branchAnalyticsQuery.isLoading ? (
              <div className="text-center py-12 text-slate-400 text-sm">Memuat data cabang...</div>
            ) : !branchAnalyticsQuery.data || branchAnalyticsQuery.data.branches.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
                Tidak ada cabang terdaftar untuk PT ini.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Cabang</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Update Rate</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Nasabah Diperiksa</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Temuan Terbuka</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Status</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {branchAnalyticsQuery.data.branches.map(br => {
                        const tl = TRAFFIC_LIGHT_CONFIG[br.trafficLight];
                        return (
                          <tr key={br.branchId} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                {br.branchName}
                              </div>
                            </td>
                            <td className="px-4 py-3 min-w-[140px]">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${br.updateRate >= 80 ? "bg-emerald-500" : br.updateRate >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                                    style={{ width: `${Math.min(br.updateRate, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-slate-600 w-8 text-right">{br.updateRate}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1 text-slate-700">
                                <Users className="w-3 h-3 text-slate-400" />
                                {br.totalCustomers.toLocaleString("id-ID")}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {br.openFindings > 0
                                ? <span className="text-red-600 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{br.openFindings}</span>
                                : <span className="text-emerald-600 font-medium">0</span>}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${tl.bg} ${tl.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${tl.dot}`} />
                                {tl.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleBranchClick(br.branchId)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                              >
                                Lihat Data
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
