import { useRoute, Link } from "wouter";
import { useGetPt, useListActivities, useListFindings } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, AlertTriangle, FileText, CheckCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
};

export default function PTDetail() {
  const [, params] = useRoute("/pt/:id");
  const id = params?.id ?? "";
  const { user } = useAuth();

  const { data: pt, isLoading: ptLoading } = useGetPt(id);
  const { data: activities, isLoading: actLoading } = useListActivities({ ptId: id });
  const { data: findings, isLoading: findLoading } = useListFindings({ ptId: id });

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

  const today = new Date().toISOString().split("T")[0];
  const todayActivity = activities?.find((a) => a.date === today);
  const openFindings = findings?.filter((f) => f.status !== "completed") ?? [];
  const overdueFindings = openFindings.filter((f) => {
    const days = Math.floor((new Date(today).getTime() - new Date(f.date).getTime()) / 86400000);
    return days > 3;
  });

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

        {pt.status === "red" && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              {!todayActivity && <p className="font-medium">Aktivitas hari ini belum diinput.</p>}
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
                {todayActivity ? (
                  <span className="text-xs text-emerald-600 font-medium">✓ Sudah update hari ini</span>
                ) : (
                  <span className="text-xs text-red-500 font-medium">Belum update hari ini</span>
                )}
                <span className="text-xs text-slate-300">|</span>
                <span className="text-xs text-slate-400">{activities?.length ?? 0} record</span>
              </div>
            </div>
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {!activities || activities.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">Belum ada aktivitas.</div>
              ) : (
                activities
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
                {openFindings.length > 0 && (
                  <span className="text-xs text-amber-600 font-medium">{openFindings.length} terbuka</span>
                )}
                {openFindings.length > 0 && (
                  <span className="text-xs text-slate-300">|</span>
                )}
                <span className="text-xs text-slate-400">{findings?.length ?? 0} total</span>
              </div>
            </div>
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {!findings || findings.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">Tidak ada temuan.</div>
              ) : (
                findings
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
      </div>
    </div>
  );
}
