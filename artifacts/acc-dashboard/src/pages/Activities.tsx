import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useListActivities, useListPts } from "@workspace/api-client-react";
import { FileText, Building2, Eye, CheckCircle, AlertTriangle, Paperclip, Download, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBaseUrl } from "@/lib/api";
import { detectActivityScope, stripActivityScopeTag } from "@/lib/activity-scope";
import { getActivityDocuments, formatFileSize } from "@/lib/activity-documents";

const ACTIVITY_LABELS: Record<string, string> = {
  kyc: "KYC",
  cdd: "CDD",
  screening: "Screening",
  monitoring_transaksi: "Monitoring Transaksi",
  pelaporan: "Pelaporan",
  sosialisasi: "Sosialisasi APUPPT",
  lainnya: "Lainnya",
};

type ActivityReview = {
  id: string;
  activityId: string;
  reviewedBy: string;
  reviewerName: string | null;
  reviewNotes: string | null;
  reviewedAt: string;
};

function useActivityReview(activityId: string, enabled: boolean) {
  return useQuery<ActivityReview | null>({
    queryKey: ["activity-review", activityId],
    queryFn: async () => {
      const res = await fetch(`${getBaseUrl()}/api/activities/${activityId}/review`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled,
  });
}

function ReviewBadge({ activityId, isDk }: { activityId: string; isDk: boolean }) {
  const qc = useQueryClient();
  const { data: review, isLoading } = useActivityReview(activityId, true);
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleReview = async () => {
    setSubmitting(true);
    try {
      await fetch(`${getBaseUrl()}/api/activities/${activityId}/review`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNotes: notes || null }),
      });
      qc.invalidateQueries({ queryKey: ["activity-review", activityId] });
      setShowModal(false);
      setNotes("");
    } catch {
      // handle error
    }
    setSubmitting(false);
  };

  if (isLoading) return null;

  if (review) {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
        <CheckCircle className="w-3 h-3" />
        Sudah Ditinjau
      </span>
    );
  }

  if (!isDk) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium hover:bg-blue-100 transition-colors"
      >
        <Eye className="w-3 h-3" />
        Tinjau
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 w-full max-w-sm mx-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Tinjau Laporan</h3>
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">Catatan Tinjauan (opsional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Tulis catatan tinjauan..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowModal(false); setNotes(""); }}
                className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleReview}
                disabled={submitting}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Menyimpan..." : "Konfirmasi Tinjau"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Activities() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filterPt, setFilterPt] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterScope, setFilterScope] = useState<"" | "daily" | "monthly" | "quarterly">("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isDk = user?.role === "dk" || user?.role === "superadmin";
  const canDelete = user?.role === "dk" || user?.role === "du" || user?.role === "owner" || user?.role === "superadmin";

  const params: Record<string, string> = {};
  if (user?.ptId) params.ptId = user.ptId;
  else if (filterPt) params.ptId = filterPt;
  if (filterDate) params.date = filterDate;

  const { data: activities, isLoading } = useListActivities(params);
  const { data: pts } = useListPts();

  const isGlobalRole = !user?.ptId;
  const allActivities = activities ?? [];
  const scopeCounts = allActivities.reduce(
    (acc, activity) => {
      const scope = detectActivityScope(activity.notes);
      acc[scope] += 1;
      return acc;
    },
    { daily: 0, monthly: 0, quarterly: 0 } as Record<"daily" | "monthly" | "quarterly", number>,
  );
  const visibleActivities = (activities ?? []).filter((a) => {
    if (!filterScope) return true;
    return detectActivityScope(a.notes) === filterScope;
  });

  const handleDeleteActivity = async (id: string) => {
    const confirmed = window.confirm("Hapus aktivitas ini? Data dan dokumen terkait akan ikut terhapus.");
    if (!confirmed) return;

    try {
      setDeletingId(id);
      const res = await fetch(`${getBaseUrl()}/api/activities/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    } catch (err) {
      window.alert((err as Error).message ?? "Gagal menghapus aktivitas.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Aktivitas APUPPT</h1>
            <p className="text-sm text-slate-500 mt-0.5">{visibleActivities.length} total laporan</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isGlobalRole && pts && pts.length > 0 && (
              <select
                value={filterPt}
                onChange={(e) => setFilterPt(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua PT</option>
                {pts.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            )}
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="mb-4">
          <div className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
            {[
              { key: "", label: "Semua", count: allActivities.length },
              { key: "daily", label: "Daily", count: scopeCounts.daily },
              { key: "monthly", label: "Monthly", count: scopeCounts.monthly },
              { key: "quarterly", label: "Triwulan", count: scopeCounts.quarterly },
            ].map((tab) => (
              <button
                key={tab.key || "all"}
                type="button"
                onClick={() => setFilterScope(tab.key as "" | "daily" | "monthly" | "quarterly")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterScope === tab.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    filterScope === tab.key ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-400">Memuat...</div>
          ) : visibleActivities.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Tidak ada aktivitas ditemukan.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleActivities.slice().reverse().map((a) => {
                const scope = detectActivityScope(a.notes);
                const scopeLabel = scope === "monthly" ? "Monthly" : scope === "quarterly" ? "Triwulan" : "Daily";
                const scopeClass =
                  scope === "monthly"
                    ? "text-indigo-700 bg-indigo-50 border-indigo-200"
                    : scope === "quarterly"
                      ? "text-violet-700 bg-violet-50 border-violet-200"
                      : "text-sky-700 bg-sky-50 border-sky-200";

                return (
                <div key={a.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {isGlobalRole && (
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {pts?.find(p => p.id === a.ptId)?.code ?? a.ptId}
                          </span>
                        )}
                        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {ACTIVITY_LABELS[a.activityType] ?? a.activityType}
                        </span>
                        <span className={`text-xs border px-2 py-0.5 rounded ${scopeClass}`}>
                          {scopeLabel}
                        </span>
                        {a.branchName && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {a.branchName}
                          </span>
                        )}
                        {a.hasFinding && (
                          <span className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Ada Temuan
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {new Date(a.date + "T00:00:00").toLocaleDateString("id-ID", {
                            day: "numeric", month: "long", year: "numeric"
                          })}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        <strong>{a.itemsReviewed}</strong> nasabah diperiksa
                        {a.customerRiskCategories && a.customerRiskCategories.length > 0 && (
                          <span className="ml-2 text-slate-400">
                            ({a.customerRiskCategories.map(c => c === "high" ? "High" : c === "medium" ? "Medium" : "Low").join(", ")})
                          </span>
                        )}
                      </div>
                      {a.findingSummary && (
                        <p className="text-xs text-slate-500 mt-1">Temuan: {a.findingSummary}</p>
                      )}
                      {stripActivityScopeTag(a.notes) && (
                        <p className="text-xs text-slate-400 mt-0.5">{stripActivityScopeTag(a.notes)}</p>
                      )}
                      {getActivityDocuments(a).length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {getActivityDocuments(a).map((doc) => (
                            <a
                              key={doc.id}
                              href={`${getBaseUrl()}/api/activities/${a.id}/documents/${doc.id}/download`}
                              className="flex max-w-xl items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
                              target="_blank"
                              rel="noreferrer"
                            >
                              <span className="min-w-0 flex items-center gap-1.5">
                                <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                                <span className="truncate">{doc.originalName}</span>
                              </span>
                              <span className="ml-2 flex items-center gap-1.5 text-slate-500">
                                <span>{formatFileSize(doc.size)}</span>
                                <Download className="h-3.5 w-3.5" />
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <ReviewBadge activityId={a.id} isDk={isDk} />
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(a.id)}
                            disabled={deletingId === a.id}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            {deletingId === a.id ? "..." : "Hapus"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
