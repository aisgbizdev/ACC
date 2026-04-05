import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListActivities,
  useListPts,
  useReviewActivity,
  useGetDashboardSummary,
  getListActivitiesQueryKey,
  type DailyActivity,
  type PtStatusCard,
  type ErrorType,
  type ErrorResponse,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  CheckCircle2, Clock, Building2, Users, ClipboardCheck, ChevronDown, ChevronUp,
  AlertTriangle, CheckSquare, Square, MessageCircle, Send, Layers,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

const ACTIVITY_LABELS: Record<string, string> = {
  kyc: "KYC", cdd: "CDD", screening: "Screening",
  monitoring_transaksi: "Monitoring Transaksi", pelaporan: "Pelaporan",
  sosialisasi: "Sosialisasi APUPPT", lainnya: "Lainnya", libur: "Hari Libur",
};

const RISK_COLOR: Record<string, string> = {
  high: "text-red-600 bg-red-50 border-red-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low: "text-emerald-600 bg-emerald-50 border-emerald-200",
};
const RISK_LABEL: Record<string, string> = { high: "High Risk", medium: "Medium Risk", low: "Low Risk" };

const ROLE_BADGE: Record<string, string> = { apuppt: "APUPPT", dk: "DK", du: "DU", owner: "Owner", superadmin: "Superadmin" };

type Comment = {
  id: string; activityId: string; content: string; createdAt: string;
  authorId: string; authorName: string | null; authorRole: string | null;
};

/* ─── inline comment thread ─── */
function CommentThread({ activityId, currentUserId }: { activityId: string; currentUserId: string }) {
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const { data: comments = [], refetch } = useQuery<Comment[]>({
    queryKey: ["activity-comments", activityId],
    queryFn: () => apiFetch(`/api/activities/${activityId}/comments`),
  });

  const submit = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      await apiFetch(`/api/activities/${activityId}/comments`, {
        method: "POST", body: JSON.stringify({ content: text.trim() }),
      });
      setText(""); refetch();
    } finally { setPosting(false); }
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
        <MessageCircle className="w-3 h-3" />Komentar ({comments.length})
      </p>
      {comments.length > 0 && (
        <div className="space-y-2 mb-3">
          {comments.map(c => (
            <div key={c.id} className={`flex gap-2 ${c.authorId === currentUserId ? "flex-row-reverse" : ""}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                c.authorId === currentUserId
                  ? "bg-blue-600 text-white rounded-tr-none"
                  : "bg-slate-100 text-slate-700 rounded-tl-none"
              }`}>
                <p className={`font-semibold mb-0.5 ${c.authorId === currentUserId ? "text-blue-100" : "text-slate-500"}`}>
                  {c.authorName ?? "?"} · {c.authorRole ? ROLE_BADGE[c.authorRole] ?? c.authorRole : ""}
                </p>
                <p>{c.content}</p>
                <p className={`text-xs mt-1 ${c.authorId === currentUserId ? "text-blue-200" : "text-slate-400"}`}>
                  {new Date(c.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <textarea
          value={text} onChange={e => setText(e.target.value)} rows={1}
          placeholder="Tulis komentar..."
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
        />
        <button onClick={submit} disabled={posting || !text.trim()}
          className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─── main page ─── */
export default function DKReview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [filterPt, setFilterPt] = useState("");
  const [filterTab, setFilterTab] = useState<"pending" | "reviewed">("pending");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [alertCollapsed, setAlertCollapsed] = useState(false);

  /* batch state */
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchNotes, setBatchNotes] = useState("");
  const [batchConfirm, setBatchConfirm] = useState(false);
  const [batchDoing, setBatchDoing] = useState(false);

  const activityParams: Record<string, string> = {};
  if (filterPt) activityParams.ptId = filterPt;
  if (filterTab === "pending") activityParams.reviewStatus = "pending_review";
  else activityParams.reviewStatus = "reviewed";

  const { data: activities, isLoading } = useListActivities(activityParams);
  const { data: pts } = useListPts();
  const { data: dashboardData } = useGetDashboardSummary();

  const { mutate: reviewActivity, isPending: reviewing } = useReviewActivity<ErrorType<ErrorResponse>>({
    mutation: {
      onSuccess: () => {
        setReviewingId(null); setReviewNotes("");
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
      },
    },
  });

  const handleReview = (id: string) => reviewActivity({ id, data: { notes: reviewNotes || null } });

  const getPtCode = (ptId: string) => pts?.find(p => p.id === ptId)?.code ?? ptId.slice(0, 8);

  const pendingCount = activities?.length ?? 0;
  const today = new Date().toISOString().split("T")[0];

  const consecutiveRedPts: PtStatusCard[] = dashboardData?.ptStatuses?.filter(p => p.consecutiveRedDays >= 2) ?? [];
  const overdueFindings: PtStatusCard[] = dashboardData?.ptStatuses?.filter(p => p.overdueCount > 0) ?? [];
  const notUpdatedPts: PtStatusCard[] = dashboardData?.ptStatuses?.filter(p => {
    if (!p.lastActivityDate) return true;
    const diff = Math.floor((new Date(today).getTime() - new Date(p.lastActivityDate + "T00:00:00").getTime()) / 86400000);
    return diff > 1;
  }) ?? [];

  const hasAlerts = consecutiveRedPts.length > 0 || overdueFindings.length > 0 || notUpdatedPts.length > 0;
  const totalAlerts = consecutiveRedPts.length + overdueFindings.length + notUpdatedPts.length;

  /* batch helpers */
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set((activities ?? []).map(a => a.id)));
  const clearAll = () => setSelectedIds(new Set());

  const doBatchReview = async () => {
    if (selectedIds.size === 0) return;
    setBatchDoing(true);
    try {
      await apiFetch("/api/activities/batch-review", {
        method: "POST",
        body: JSON.stringify({ activityIds: [...selectedIds], notes: batchNotes || null }),
      });
      setSelectedIds(new Set());
      setBatchMode(false);
      setBatchConfirm(false);
      setBatchNotes("");
      queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
    } catch (err) {
      alert((err as Error).message ?? "Gagal batch review.");
    }
    setBatchDoing(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                Review Aktivitas
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">DK — tinjau dan setujui laporan aktivitas harian APUPPT</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {filterTab === "pending" && (
                <button
                  onClick={() => { setBatchMode(v => !v); setSelectedIds(new Set()); setBatchConfirm(false); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    batchMode
                      ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  {batchMode ? "Keluar Mode Pilih" : "Pilih Banyak"}
                </button>
              )}
              <select
                value={filterPt}
                onChange={(e) => setFilterPt(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua PT</option>
                {pts?.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Alert box ── */}
        {hasAlerts && (
          <div className="mb-5 rounded-xl border-2 border-red-300 bg-red-50 shadow-md overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 cursor-pointer select-none"
              onClick={() => setAlertCollapsed(!alertCollapsed)}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500 flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-bold text-red-800 uppercase tracking-wide">⚠ Butuh Perhatian</span>
                {totalAlerts > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalAlerts}</span>
                )}
              </div>
              {alertCollapsed ? <ChevronDown className="w-4 h-4 text-red-400" /> : <ChevronUp className="w-4 h-4 text-red-400" />}
            </button>
            {!alertCollapsed && (
              <div className="px-4 pb-4 space-y-3 border-t border-red-200">
                {consecutiveRedPts.length > 0 && (
                  <div className="pt-3">
                    <p className="text-xs font-bold text-orange-700 mb-2 flex items-center gap-1.5 uppercase">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block flex-shrink-0" />
                      Merah Berturut-turut
                    </p>
                    <div className="space-y-1.5">
                      {consecutiveRedPts.map(p => (
                        <div key={p.id} className="flex items-center gap-2 text-xs">
                          <span className="font-bold bg-red-600 text-white px-2 py-0.5 rounded">{p.code}</span>
                          <span className="text-red-800 font-medium">{p.name}</span>
                          <span className="ml-auto font-bold text-orange-700 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded">🔥 {p.consecutiveRedDays} hari</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {overdueFindings.length > 0 && (
                  <div className={consecutiveRedPts.length > 0 ? "" : "pt-3"}>
                    <p className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1.5 uppercase">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block flex-shrink-0" />Temuan Overdue
                    </p>
                    <div className="space-y-1.5">
                      {overdueFindings.map(p => (
                        <div key={p.id} className="flex items-center gap-2 text-xs">
                          <span className="font-bold bg-amber-500 text-white px-2 py-0.5 rounded">{p.code}</span>
                          <span className="text-amber-800 font-medium">{p.name}</span>
                          <span className="ml-auto font-semibold text-amber-700">{p.overdueCount} overdue</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {notUpdatedPts.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5 uppercase">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block flex-shrink-0" />Belum Update (&gt;1 hari)
                    </p>
                    <div className="space-y-1.5">
                      {notUpdatedPts.map(p => (
                        <div key={p.id} className="flex items-center gap-2 text-xs">
                          <span className="font-bold bg-slate-500 text-white px-2 py-0.5 rounded">{p.code}</span>
                          <span className="text-slate-700 font-medium">{p.name}</span>
                          <span className="ml-auto text-slate-500">
                            {p.lastActivityDate
                              ? `Terakhir ${new Date(p.lastActivityDate + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
                              : "Belum pernah"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-5 w-fit">
          <button
            onClick={() => { setFilterTab("pending"); setBatchMode(false); setSelectedIds(new Set()); }}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${filterTab === "pending" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Menunggu Review
            {filterTab === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
          <button
            onClick={() => setFilterTab("reviewed")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${filterTab === "reviewed" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Sudah Disetujui DK
          </button>
        </div>

        {/* ── Batch bar ── */}
        {batchMode && filterTab === "pending" && activities && activities.length > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <button onClick={selectAll} className="flex items-center gap-1.5 text-xs text-blue-700 font-medium hover:text-blue-900">
                <CheckSquare className="w-4 h-4" />Pilih Semua ({activities.length})
              </button>
              {selectedIds.size > 0 && (
                <button onClick={clearAll} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700">
                  <Square className="w-4 h-4" />Batal Pilih
                </button>
              )}
            </div>
            {selectedIds.size > 0 && (
              <button
                onClick={() => setBatchConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Setujui {selectedIds.size} Aktivitas
              </button>
            )}
          </div>
        )}

        {/* ── Batch confirm modal ── */}
        {batchConfirm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
              <h3 className="font-bold text-slate-900">Setujui {selectedIds.size} Aktivitas?</h3>
              <p className="text-sm text-slate-500">Semua aktivitas yang dipilih akan ditandai sebagai sudah direview DK.</p>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Catatan Review (opsional)</label>
                <textarea
                  value={batchNotes} onChange={e => setBatchNotes(e.target.value)}
                  rows={2} placeholder="Catatan untuk semua aktivitas..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setBatchConfirm(false); setBatchNotes(""); }}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={doBatchReview} disabled={batchDoing}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {batchDoing ? "Menyimpan..." : "Konfirmasi"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Activity list ── */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Memuat...</div>
        ) : !activities || activities.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-14 text-center">
            <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400 font-medium">
              {filterTab === "pending" ? "Tidak ada aktivitas yang menunggu review." : "Belum ada aktivitas yang sudah disetujui."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((a: DailyActivity) => {
              const isExpanded = expandedId === a.id;
              const isReviewing = reviewingId === a.id;
              const isSelected = selectedIds.has(a.id);

              return (
                <div key={a.id} className={`bg-white rounded-xl border shadow-sm transition-all ${
                  isSelected ? "border-blue-400 ring-2 ring-blue-100" : filterTab === "reviewed" ? "border-emerald-200" : "border-slate-200"
                }`}>
                  <div
                    className="px-4 py-3 cursor-pointer"
                    onClick={() => {
                      if (batchMode && filterTab === "pending") {
                        toggleSelect(a.id);
                      } else {
                        setExpandedId(isExpanded ? null : a.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* batch checkbox */}
                      {batchMode && filterTab === "pending" && (
                        <div className="flex-shrink-0 mt-0.5">
                          {isSelected
                            ? <CheckSquare className="w-4 h-4 text-blue-600" />
                            : <Square className="w-4 h-4 text-slate-300" />}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                            {getPtCode(a.ptId)}
                          </span>
                          <span className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                            {ACTIVITY_LABELS[a.activityType] ?? a.activityType}
                          </span>
                          {a.branchName && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />{a.branchName}
                            </span>
                          )}
                          {a.hasFinding && (
                            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                              Ada Temuan
                            </span>
                          )}
                          {filterTab === "reviewed" && a.dkReviewedAt && (
                            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />Disetujui DK
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(a.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />{a.itemsReviewed} nasabah
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {filterTab === "pending" && !batchMode && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setReviewingId(a.id); setExpandedId(a.id); }}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 transition-colors"
                          >
                            Review
                          </button>
                        )}
                        {!batchMode && (
                          isExpanded
                            ? <ChevronUp className="w-4 h-4 text-slate-400" />
                            : <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && !batchMode && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
                        <div>
                          <span className="text-slate-400 font-medium">Kategori Risiko</span>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {a.customerRiskCategories && a.customerRiskCategories.length > 0
                              ? a.customerRiskCategories.map(rc => (
                                  <span key={rc} className={`px-2 py-0.5 rounded border text-xs ${RISK_COLOR[rc] ?? ""}`}>{RISK_LABEL[rc] ?? rc}</span>
                                ))
                              : <span className="text-slate-300">—</span>
                            }
                          </div>
                        </div>
                        {a.findingSummary && (
                          <div>
                            <span className="text-slate-400 font-medium">Temuan</span>
                            <p className="text-slate-700 mt-1">{a.findingSummary}</p>
                          </div>
                        )}
                        {a.notes && (
                          <div>
                            <span className="text-slate-400 font-medium">Catatan APUPPT</span>
                            <p className="text-slate-700 mt-1">{a.notes}</p>
                          </div>
                        )}
                        {a.dkNotes && (
                          <div>
                            <span className="text-slate-400 font-medium">Catatan DK</span>
                            <p className="text-slate-700 mt-1">{a.dkNotes}</p>
                          </div>
                        )}
                        {a.dkReviewedAt && (
                          <div>
                            <span className="text-slate-400 font-medium">Disetujui DK pada</span>
                            <p className="text-slate-700 mt-1">{new Date(a.dkReviewedAt).toLocaleString("id-ID")}</p>
                          </div>
                        )}
                        {a.duSignedOffAt && (
                          <div>
                            <span className="text-slate-400 font-medium">Sign-off DU pada</span>
                            <p className="text-slate-700 mt-1">{new Date(a.duSignedOffAt).toLocaleString("id-ID")}</p>
                          </div>
                        )}
                      </div>

                      {/* single review form */}
                      {isReviewing && filterTab === "pending" && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-3 mb-3">
                          <p className="text-xs font-medium text-blue-700">Catatan Review (opsional)</p>
                          <textarea
                            value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)}
                            rows={2} placeholder="Catatan atau komentar review..."
                            className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setReviewingId(null); setReviewNotes(""); }}
                              className="flex-1 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => handleReview(a.id)} disabled={reviewing}
                              className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {reviewing ? "Menyimpan..." : "Setujui Aktivitas"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* comment thread */}
                      <CommentThread activityId={a.id} currentUserId={user?.id ?? ""} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Mobile batch action bar ── */}
      {batchMode && selectedIds.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-30 sm:hidden border-t border-slate-200 bg-white px-4 pb-3 pt-2 shadow-xl">
          <button
            onClick={() => setBatchConfirm(true)}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />Setujui {selectedIds.size} Aktivitas
          </button>
        </div>
      )}
    </div>
  );
}
