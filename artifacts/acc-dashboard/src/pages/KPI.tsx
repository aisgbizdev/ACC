import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, Users, ClipboardCheck, FileCheck2, AlertTriangle, Download, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";

const ACTIVITY_LABELS: Record<string, string> = {
  kyc: "KYC",
  cdd: "CDD",
  screening: "Screening",
  monitoring_transaksi: "Monitoring Transaksi",
  pelaporan: "Pelaporan",
  sosialisasi: "Sosialisasi",
  lainnya: "Lainnya",
};

type ApupptKpi = {
  userId: string;
  userName: string;
  ptId: string | null;
  ptCode: string | null;
  ptName: string | null;
  rank: number;
  updateRate: number;
  totalCustomersChecked: number;
  activityTypeBreakdown: Record<string, number>;
  findingsCreated: number;
  findingsResolved: number;
  findingsOpen: number;
  avgResolutionDays: number | null;
  kpiScore: number;
};

type DkKpi = {
  userId: string;
  userName: string;
  ptId: string | null;
  ptCode: string | null;
  ptName: string | null;
  reviewRate: number;
  avgReviewTimeHours: number | null;
  totalTicketComments: number;
  ticketsRespondedWithin24h: number;
  ticketsRespondedRate: number;
  totalReviewed: number;
};

type DuKpi = {
  userId: string;
  userName: string;
  ptId: string | null;
  ptCode: string | null;
  ptName: string | null;
  signOffRate: number;
  totalSignedOff: number;
  totalEligible: number;
};

type ApupptResponse = {
  startDate: string;
  endDate: string;
  workingDays: number;
  apuppt: ApupptKpi[];
};

type DkResponse = {
  startDate: string;
  endDate: string;
  dk: DkKpi[];
};

type DuResponse = {
  startDate: string;
  endDate: string;
  du: DuKpi[];
};

type PtOption = { id: string; code: string; name: string };

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function scoreBadge(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (score >= 60) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${scoreBadge(score)}`}>
      {score}
    </span>
  );
}

function RateBar({ value, color = "bg-blue-500" }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-8 text-right">{value}%</span>
    </div>
  );
}

function exportToCsv(filename: string, rows: string[][], headers: string[]) {
  const lines = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type SortDir = "asc" | "desc";

function useSortedData<T>(data: T[], defaultKey: keyof T, defaultDir: SortDir = "desc") {
  const [sortKey, setSortKey] = useState<keyof T>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const toggle = useCallback((key: keyof T) => {
    if (key === sortKey) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }, [sortKey]);

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  return { sorted, sortKey, sortDir, toggle };
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronDown className="w-3 h-3 text-slate-300 inline ml-0.5" />;
  return dir === "asc"
    ? <ChevronUp className="w-3 h-3 text-blue-500 inline ml-0.5" />
    : <ChevronDown className="w-3 h-3 text-blue-500 inline ml-0.5" />;
}

function Th({ label, col, sortKey, sortDir, onSort }: {
  label: string;
  col: string;
  sortKey: string;
  sortDir: SortDir;
  onSort: (k: string) => void;
}) {
  return (
    <th
      className="px-3 py-2 text-left text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"
      onClick={() => onSort(col)}
    >
      {label}
      <SortIcon active={sortKey === col} dir={sortDir} />
    </th>
  );
}

export default function KPI() {
  const { user } = useAuth();

  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = `${today.slice(0, 7)}-01`;

  const [period, setPeriod] = useState<"weekly" | "monthly" | "custom">("monthly");
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [selectedPtId, setSelectedPtId] = useState<string>("");

  const effectiveStart = period === "weekly"
    ? (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split("T")[0]; })()
    : period === "monthly" ? firstOfMonth : startDate;
  const effectiveEnd = period === "custom" ? endDate : today;

  const ptQuery = useQuery<PtOption[]>({
    queryKey: ["pts-list"],
    queryFn: async () => {
      const res = await fetch("/api/pts", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat PT");
      return res.json();
    },
    staleTime: 300_000,
  });

  const canPickPt = user?.role === "owner" || user?.role === "superadmin";
  const effectivePtId = canPickPt ? selectedPtId : (user?.ptId ?? "");

  const buildParams = () => {
    const p = new URLSearchParams({ startDate: effectiveStart, endDate: effectiveEnd });
    if (effectivePtId) p.set("ptId", effectivePtId);
    return p.toString();
  };

  const apupptQuery = useQuery<ApupptResponse>({
    queryKey: ["kpi-apuppt", effectiveStart, effectiveEnd, effectivePtId],
    queryFn: async () => {
      const res = await fetch(`/api/kpi/apuppt?${buildParams()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat KPI APUPPT");
      return res.json();
    },
    staleTime: 60_000,
    enabled: user?.role !== "apuppt" || true,
  });

  const dkQuery = useQuery<DkResponse>({
    queryKey: ["kpi-dk", effectiveStart, effectiveEnd, effectivePtId],
    queryFn: async () => {
      const res = await fetch(`/api/kpi/dk?${buildParams()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat KPI DK");
      return res.json();
    },
    staleTime: 60_000,
    enabled: ["dk", "du", "owner", "superadmin"].includes(user?.role ?? ""),
  });

  const duQuery = useQuery<DuResponse>({
    queryKey: ["kpi-du", effectiveStart, effectiveEnd, effectivePtId],
    queryFn: async () => {
      const res = await fetch(`/api/kpi/du?${buildParams()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat KPI DU");
      return res.json();
    },
    staleTime: 60_000,
    enabled: ["dk", "du", "owner", "superadmin"].includes(user?.role ?? ""),
  });

  const apupptData = apupptQuery.data?.apuppt ?? [];
  const dkData = dkQuery.data?.dk ?? [];
  const duData = duQuery.data?.du ?? [];

  const { sorted: sortedApuppt, sortKey: apSortKey, sortDir: apSortDir, toggle: apToggle } =
    useSortedData<ApupptKpi>(apupptData, "kpiScore");
  const { sorted: sortedDk, sortKey: dkSortKey, sortDir: dkSortDir, toggle: dkToggle } =
    useSortedData<DkKpi>(dkData, "reviewRate");
  const { sorted: sortedDu, sortKey: duSortKey, sortDir: duSortDir, toggle: duToggle } =
    useSortedData<DuKpi>(duData, "signOffRate");

  const handleExportApuppt = () => {
    const headers = ["Rank", "Nama", "PT", "Update Rate (%)", "Total Nasabah", "Temuan Dibuat", "Temuan Selesai", "Temuan Terbuka", "Rata-rata Selesai (hari)", "Skor KPI"];
    const rows = sortedApuppt.map(r => [
      String(r.rank), r.userName, r.ptCode ?? "-", String(r.updateRate), String(r.totalCustomersChecked),
      String(r.findingsCreated), String(r.findingsResolved), String(r.findingsOpen),
      r.avgResolutionDays !== null ? String(r.avgResolutionDays) : "-", String(r.kpiScore),
    ]);
    exportToCsv(`kpi-apuppt-${effectiveStart}-${effectiveEnd}.csv`, rows, headers);
  };

  const handleExportDk = () => {
    const headers = ["Nama", "PT", "Review Rate (%)", "Rata-rata Waktu Review (jam)", "Komentar Tiket", "Tiket Direspons <24 jam"];
    const rows = sortedDk.map(r => [
      r.userName, r.ptCode ?? "-", String(r.reviewRate),
      r.avgReviewTimeHours !== null ? String(r.avgReviewTimeHours) : "-",
      String(r.totalTicketComments), String(r.ticketsRespondedWithin24h),
    ]);
    exportToCsv(`kpi-dk-${effectiveStart}-${effectiveEnd}.csv`, rows, headers);
  };

  const handleExportDu = () => {
    const headers = ["Nama", "PT", "Sign-Off Rate (%)", "Total Sign-Off", "Total Eligible"];
    const rows = sortedDu.map(r => [
      r.userName, r.ptCode ?? "-", String(r.signOffRate), String(r.totalSignedOff), String(r.totalEligible),
    ]);
    exportToCsv(`kpi-du-${effectiveStart}-${effectiveEnd}.csv`, rows, headers);
  };

  const isLoading = apupptQuery.isLoading || dkQuery.isLoading || duQuery.isLoading;
  const refetchAll = () => { apupptQuery.refetch(); dkQuery.refetch(); duQuery.refetch(); };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              KPI & Analitik
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Pantau kinerja APUPPT, DK, dan DU</p>
          </div>
          <button
            onClick={refetchAll}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Periode</label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
                {(["weekly", "monthly", "custom"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 transition-colors ${period === p ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    {p === "weekly" ? "Mingguan" : p === "monthly" ? "Bulanan" : "Kustom"}
                  </button>
                ))}
              </div>
            </div>

            {period === "custom" && (
              <>
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">Mulai</label>
                  <input
                    type="date" value={startDate} max={endDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">Selesai</label>
                  <input
                    type="date" value={endDate} min={startDate} max={today}
                    onChange={e => setEndDate(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {canPickPt && (
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">PT</label>
                <select
                  value={selectedPtId}
                  onChange={e => setSelectedPtId(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Semua PT</option>
                  {(ptQuery.data ?? []).map(pt => (
                    <option key={pt.id} value={pt.id}>{pt.code} — {pt.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="text-xs text-slate-400 self-end pb-1.5">
              {effectiveStart} s/d {effectiveEnd}
              {apupptQuery.data && <span className="ml-2 text-slate-300">· {apupptQuery.data.workingDays} hari kerja</span>}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-sm">Memuat data KPI...</div>
        ) : (
          <>
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    Scorecard APUPPT
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Ranking kinerja berdasarkan Skor KPI gabungan</p>
                </div>
                {apupptData.length > 0 && (
                  <button
                    onClick={handleExportApuppt}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                )}
              </div>

              {apupptData.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
                  Tidak ada data APUPPT dalam periode ini.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 w-8">#</th>
                          <Th label="Nama" col="userName" sortKey={apSortKey as string} sortDir={apSortDir} onSort={k => apToggle(k as keyof ApupptKpi)} />
                          {canPickPt && <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">PT</th>}
                          <Th label="Update Rate" col="updateRate" sortKey={apSortKey as string} sortDir={apSortDir} onSort={k => apToggle(k as keyof ApupptKpi)} />
                          <Th label="Nasabah" col="totalCustomersChecked" sortKey={apSortKey as string} sortDir={apSortDir} onSort={k => apToggle(k as keyof ApupptKpi)} />
                          <Th label="Temuan" col="findingsCreated" sortKey={apSortKey as string} sortDir={apSortDir} onSort={k => apToggle(k as keyof ApupptKpi)} />
                          <Th label="Selesai" col="findingsResolved" sortKey={apSortKey as string} sortDir={apSortDir} onSort={k => apToggle(k as keyof ApupptKpi)} />
                          <Th label="Terbuka" col="findingsOpen" sortKey={apSortKey as string} sortDir={apSortDir} onSort={k => apToggle(k as keyof ApupptKpi)} />
                          <Th label="Avg Selesai (hari)" col="avgResolutionDays" sortKey={apSortKey as string} sortDir={apSortDir} onSort={k => apToggle(k as keyof ApupptKpi)} />
                          <Th label="Skor KPI" col="kpiScore" sortKey={apSortKey as string} sortDir={apSortDir} onSort={k => apToggle(k as keyof ApupptKpi)} />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedApuppt.map((r) => (
                          <tr key={r.userId} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2.5 text-slate-400 font-medium">{r.rank}</td>
                            <td className="px-3 py-2.5 font-semibold text-slate-800">{r.userName}</td>
                            {canPickPt && (
                              <td className="px-3 py-2.5 text-slate-500">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-medium">{r.ptCode ?? "-"}</span>
                              </td>
                            )}
                            <td className="px-3 py-2.5 min-w-[120px]">
                              <RateBar
                                value={r.updateRate}
                                color={r.updateRate >= 80 ? "bg-emerald-500" : r.updateRate >= 60 ? "bg-amber-400" : "bg-red-400"}
                              />
                            </td>
                            <td className="px-3 py-2.5 text-slate-700 font-medium">{r.totalCustomersChecked.toLocaleString("id-ID")}</td>
                            <td className="px-3 py-2.5 text-slate-700">{r.findingsCreated}</td>
                            <td className="px-3 py-2.5 text-emerald-600 font-medium">{r.findingsResolved}</td>
                            <td className="px-3 py-2.5">
                              {r.findingsOpen > 0
                                ? <span className="text-red-600 font-medium">{r.findingsOpen}</span>
                                : <span className="text-slate-400">0</span>}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">
                              {r.avgResolutionDays !== null ? `${r.avgResolutionDays}` : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-3 py-2.5">
                              <ScoreBadge score={r.kpiScore} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Hijau ≥ 80</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Kuning 60–79</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Merah &lt; 60</span>
                  </div>
                </div>
              )}
            </section>

            {["dk", "du", "owner", "superadmin"].includes(user?.role ?? "") && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-violet-500" />
                      Scorecard DK (Engagement)
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Keterlibatan Dewan Komisaris dalam review laporan</p>
                  </div>
                  {dkData.length > 0 && (
                    <button
                      onClick={handleExportDk}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export CSV
                    </button>
                  )}
                </div>

                {dkData.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
                    Tidak ada data DK dalam periode ini.
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <Th label="Nama DK" col="userName" sortKey={dkSortKey as string} sortDir={dkSortDir} onSort={k => dkToggle(k as keyof DkKpi)} />
                            {canPickPt && <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">PT</th>}
                            <Th label="Review Rate" col="reviewRate" sortKey={dkSortKey as string} sortDir={dkSortDir} onSort={k => dkToggle(k as keyof DkKpi)} />
                            <Th label="Avg Waktu Review (jam)" col="avgReviewTimeHours" sortKey={dkSortKey as string} sortDir={dkSortDir} onSort={k => dkToggle(k as keyof DkKpi)} />
                            <Th label="Komentar Tiket" col="totalTicketComments" sortKey={dkSortKey as string} sortDir={dkSortDir} onSort={k => dkToggle(k as keyof DkKpi)} />
                            <Th label="Tiket <24 jam (%)" col="ticketsRespondedRate" sortKey={dkSortKey as string} sortDir={dkSortDir} onSort={k => dkToggle(k as keyof DkKpi)} />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedDk.map(r => (
                            <tr key={r.userId} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3 py-2.5 font-semibold text-slate-800">{r.userName}</td>
                              {canPickPt && (
                                <td className="px-3 py-2.5 text-slate-500">
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-medium">{r.ptCode ?? "-"}</span>
                                </td>
                              )}
                              <td className="px-3 py-2.5 min-w-[120px]">
                                <RateBar value={r.reviewRate} color={r.reviewRate >= 80 ? "bg-emerald-500" : r.reviewRate >= 60 ? "bg-amber-400" : "bg-red-400"} />
                              </td>
                              <td className="px-3 py-2.5 text-slate-600">
                                {r.avgReviewTimeHours !== null ? `${r.avgReviewTimeHours} jam` : <span className="text-slate-300">-</span>}
                              </td>
                              <td className="px-3 py-2.5 text-slate-700">{r.totalTicketComments}</td>
                              <td className="px-3 py-2.5">
                                <RateBar value={r.ticketsRespondedRate} color="bg-violet-500" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            )}

            {["dk", "du", "owner", "superadmin"].includes(user?.role ?? "") && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-emerald-500" />
                      Scorecard DU (Sign-Off Rate)
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Persentase laporan yang sudah di-sign-off DU</p>
                  </div>
                  {duData.length > 0 && (
                    <button
                      onClick={handleExportDu}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export CSV
                    </button>
                  )}
                </div>

                {duData.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
                    Tidak ada data DU dalam periode ini.
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <Th label="Nama DU" col="userName" sortKey={duSortKey as string} sortDir={duSortDir} onSort={k => duToggle(k as keyof DuKpi)} />
                            {canPickPt && <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">PT</th>}
                            <Th label="Sign-Off Rate" col="signOffRate" sortKey={duSortKey as string} sortDir={duSortDir} onSort={k => duToggle(k as keyof DuKpi)} />
                            <Th label="Total Sign-Off" col="totalSignedOff" sortKey={duSortKey as string} sortDir={duSortDir} onSort={k => duToggle(k as keyof DuKpi)} />
                            <Th label="Total Eligible" col="totalEligible" sortKey={duSortKey as string} sortDir={duSortDir} onSort={k => duToggle(k as keyof DuKpi)} />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedDu.map(r => (
                            <tr key={r.userId} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3 py-2.5 font-semibold text-slate-800">{r.userName}</td>
                              {canPickPt && (
                                <td className="px-3 py-2.5 text-slate-500">
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-medium">{r.ptCode ?? "-"}</span>
                                </td>
                              )}
                              <td className="px-3 py-2.5 min-w-[120px]">
                                <RateBar value={r.signOffRate} color={r.signOffRate >= 80 ? "bg-emerald-500" : r.signOffRate >= 60 ? "bg-amber-400" : "bg-red-400"} />
                              </td>
                              <td className="px-3 py-2.5 text-slate-700">{r.totalSignedOff}</td>
                              <td className="px-3 py-2.5 text-slate-500">{r.totalEligible}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
