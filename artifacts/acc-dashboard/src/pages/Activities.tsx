import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useListActivities, useListPts } from "@workspace/api-client-react";
import { FileText, Building2, Eye, CheckCircle, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBaseUrl } from "@/lib/api";

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
  const [filterPt, setFilterPt] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");

  const isDk = user?.role === "dk" || user?.role === "superadmin";

  const params: Record<string, string> = {};
  if (user?.ptId) params.ptId = user.ptId;
  else if (filterPt) params.ptId = filterPt;
  if (filterDate) params.date = filterDate;

  const { data: activities, isLoading } = useListActivities(params);
  const { data: pts } = useListPts();

  const isGlobalRole = !user?.ptId;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Aktivitas APUPPT</h1>
            <p className="text-sm text-slate-500 mt-0.5">{activities?.length ?? 0} total laporan</p>
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

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-400">Memuat...</div>
          ) : !activities || activities.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Tidak ada aktivitas ditemukan.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activities.slice().reverse().map((a) => (
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
                      {a.notes && (
                        <p className="text-xs text-slate-400 mt-0.5">{a.notes}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <ReviewBadge activityId={a.id} isDk={isDk} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
