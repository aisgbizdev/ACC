import { useRoute, Link } from "wouter";
import { useGetPt, useListActivities, useListFindings } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, AlertTriangle, FileText, CheckCircle, Clock } from "lucide-react";

const STATUS_CONFIG = {
  green: { label: "Hijau", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  yellow: { label: "Kuning", dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  red: { label: "Merah", dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
};

const FINDING_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-red-600 bg-red-50 border-red-200" },
  follow_up: { label: "Follow Up", color: "text-amber-600 bg-amber-50 border-amber-200" },
  completed: { label: "Selesai", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
};

const ACTIVITY_LABELS: Record<string, string> = {
  transaction_review: "Review Transaksi",
  kyc_document_review: "Review Dokumen KYC",
  branch_follow_up: "Follow Up Cabang",
  transaction_analysis: "Analisis Transaksi",
  source_of_fund_verification: "Verifikasi Sumber Dana",
  report_preparation: "Penyusunan Laporan",
  meeting_coordination: "Koordinasi Rapat",
  apuppt_socialization: "Sosialisasi APUPPT",
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{pt.code} — {pt.name}</h1>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
              {statusCfg.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700">Aktivitas Harian</h2>
              </div>
              <span className="text-xs text-slate-400">{activities?.length ?? 0} record</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {!activities || activities.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">Belum ada aktivitas.</div>
              ) : (
                activities.slice().reverse().map((a) => (
                  <div key={a.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700">
                        {new Date(a.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                      {a.hasFinding && (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <AlertTriangle className="w-3 h-3" />
                          Ada Temuan
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{ACTIVITY_LABELS[a.activityType] ?? a.activityType}</div>
                    {a.itemsReviewed > 0 && (
                      <div className="text-xs text-slate-400 mt-0.5">{a.itemsReviewed} item diperiksa</div>
                    )}
                  </div>
                ))
              )}
            </div>
            {user?.role === "apuppt" && (
              <div className="px-4 py-3 border-t border-slate-100">
                <Link href="/activity" className="block w-full text-center text-xs font-medium text-blue-600 hover:text-blue-700 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                  + Tambah Aktivitas Hari Ini
                </Link>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700">Temuan</h2>
              </div>
              <span className="text-xs text-slate-400">{findings?.length ?? 0} total</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {!findings || findings.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">Tidak ada temuan.</div>
              ) : (
                findings.slice().reverse().map((f) => {
                  const statusInfo = FINDING_STATUS[f.status] ?? FINDING_STATUS.pending;
                  return (
                    <div key={f.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-slate-700 flex-1">{f.findingText}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(f.date).toLocaleDateString("id-ID")}
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
