import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, TrendingUp, TrendingDown, Minus, Download, RefreshCw, FileBarChart } from "lucide-react";

type Delta = {
  updateRate: number;
  totalItemsReviewed: number;
  openFindings: number;
  completedFindings: number;
  kpiScore: number;
};

type PtRecap = {
  ptId: string;
  ptCode: string;
  ptName: string;
  totalActiveDays: number;
  totalItemsReviewed: number;
  openFindings: number;
  completedFindings: number;
  dkReviewPct: number;
  duSignoff: { signedOffAt: string; signerName: string | null } | null;
  kpiScore: number;
  updateRate: number;
  delta: Delta;
  prev: {
    updateRate: number;
    totalItemsReviewed: number;
    openFindings: number;
    completedFindings: number;
    kpiScore: number;
  };
};

type MonthlyRecapData = {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  workingDays: number;
  prevMonth: {
    year: number;
    month: number;
    startDate: string;
    endDate: string;
    workingDays: number;
  };
  recaps: PtRecap[];
};

function TrendIndicator({ delta, invert = false, suffix = "" }: { delta: number; invert?: boolean; suffix?: string }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-slate-400 text-xs font-medium">
        <Minus className="w-3 h-3" />
        <span>0{suffix}</span>
      </span>
    );
  }
  const isPositive = invert ? delta < 0 : delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span>{delta > 0 ? "+" : ""}{delta}{suffix}</span>
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 80
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : score >= 60
    ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-red-100 text-red-700 border-red-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${cls}`}>
      {score}
    </span>
  );
}

function exportToExcel(recaps: PtRecap[], year: number, month: number) {
  const monthLabel = String(month).padStart(2, "0");
  const headers = [
    "Kode PT", "Nama PT",
    "Update Rate (%)", "Delta Update Rate",
    "Nasabah Diperiksa", "Delta Nasabah",
    "Temuan Terbuka", "Delta Temuan Terbuka",
    "Temuan Selesai", "Delta Temuan Selesai",
    "DK Review (%)",
    "Status Sign-Off DU", "Tgl Sign-Off",
    "Skor KPI", "Delta Skor KPI",
  ];
  const rows = recaps.map((r) => [
    r.ptCode,
    r.ptName,
    String(r.updateRate),
    (r.delta.updateRate >= 0 ? "+" : "") + String(r.delta.updateRate),
    String(r.totalItemsReviewed),
    (r.delta.totalItemsReviewed >= 0 ? "+" : "") + String(r.delta.totalItemsReviewed),
    String(r.openFindings),
    (r.delta.openFindings >= 0 ? "+" : "") + String(r.delta.openFindings),
    String(r.completedFindings),
    (r.delta.completedFindings >= 0 ? "+" : "") + String(r.delta.completedFindings),
    String(r.dkReviewPct),
    r.duSignoff ? "Sudah Sign-Off" : "Belum Sign-Off",
    r.duSignoff ? new Date(r.duSignoff.signedOffAt).toLocaleDateString("id-ID") : "-",
    String(r.kpiScore),
    (r.delta.kpiScore >= 0 ? "+" : "") + String(r.delta.kpiScore),
  ]);

  const lines = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rekap-bulanan-${year}-${monthLabel}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MonthlyRecap() {
  const { user } = useAuth();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const { data, isLoading, refetch } = useQuery<MonthlyRecapData>({
    queryKey: ["monthly-recap", selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/reports/monthly-recap?year=${selectedYear}&month=${selectedMonth}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat rekap bulanan");
      return res.json();
    },
    staleTime: 60_000,
  });

  const handleMonthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const [y, m] = val.split("-").map(Number);
    setSelectedYear(y);
    setSelectedMonth(m);
  }, []);

  const monthValue = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
  const monthLabel = new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  if (!["dk", "du", "owner", "superadmin"].includes(user?.role ?? "")) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Akses ditolak.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileBarChart className="w-5 h-5 text-blue-600" />
              Rekap Bulanan
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Ringkasan kinerja per PT dalam satu bulan</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="month"
                value={monthValue}
                max={`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`}
                onChange={handleMonthChange}
                className="text-xs text-slate-700 bg-transparent focus:outline-none"
              />
            </div>
            {data && data.recaps.length > 0 && (
              <button
                onClick={() => exportToExcel(data.recaps, selectedYear, selectedMonth)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export Excel
              </button>
            )}
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-sm">Memuat rekap bulanan...</div>
        ) : !data || data.recaps.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">Tidak ada data untuk bulan ini.</div>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div className="text-xs text-blue-700">
                <span className="font-semibold">{monthLabel}</span>
                {" · "}{data.workingDays} hari kerja
                {" · Dibandingkan dengan "}
                <span className="font-medium">
                  {new Date(data.prevMonth.year, data.prevMonth.month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                </span>
                {" "}({data.prevMonth.workingDays} hari kerja)
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 whitespace-nowrap">PT</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 whitespace-nowrap">Update Rate</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 whitespace-nowrap">Nasabah</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 whitespace-nowrap">Temuan Dibuka</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 whitespace-nowrap">Temuan Ditutup</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 whitespace-nowrap">DK Review</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 whitespace-nowrap">Sign-Off DU</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 whitespace-nowrap">Skor KPI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recaps.map((r) => (
                      <tr key={r.ptId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-3">
                          <div className="font-semibold text-slate-800">{r.ptCode}</div>
                          <div className="text-slate-400 text-xs truncate max-w-[120px]">{r.ptName}</div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="font-semibold text-slate-800">{r.updateRate}%</div>
                          <div className="mt-0.5">
                            <TrendIndicator delta={r.delta.updateRate} suffix="%" />
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="font-semibold text-slate-800">{r.totalItemsReviewed.toLocaleString("id-ID")}</div>
                          <div className="mt-0.5">
                            <TrendIndicator delta={r.delta.totalItemsReviewed} />
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="font-semibold text-slate-800">{r.openFindings}</div>
                          <div className="mt-0.5">
                            <TrendIndicator delta={r.delta.openFindings} invert />
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="font-semibold text-emerald-700">{r.completedFindings}</div>
                          <div className="mt-0.5">
                            <TrendIndicator delta={r.delta.completedFindings} />
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className={`font-semibold ${r.dkReviewPct >= 80 ? "text-emerald-600" : r.dkReviewPct >= 60 ? "text-amber-600" : "text-red-600"}`}>
                            {r.dkReviewPct}%
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {r.duSignoff ? (
                            <div>
                              <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                                Signed Off
                              </span>
                              <div className="text-slate-400 mt-0.5 text-xs">{r.duSignoff.signerName}</div>
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-xs font-medium">
                              Belum
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <ScoreBadge score={r.kpiScore} />
                            <TrendIndicator delta={r.delta.kpiScore} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  Naik dari bulan lalu
                </span>
                <span className="flex items-center gap-1.5">
                  <TrendingDown className="w-3 h-3 text-red-500" />
                  Turun dari bulan lalu
                </span>
                <span className="flex items-center gap-1.5">
                  <Minus className="w-3 h-3 text-slate-400" />
                  Tidak ada perubahan
                </span>
                <span className="ml-auto text-slate-300">* Temuan Terbuka: panah hijau = berkurang (lebih baik)</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
