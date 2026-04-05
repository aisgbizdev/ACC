import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateActivity,
  useUpdateActivity,
  useListActivities,
  useListBranches,
  getListActivitiesQueryKey,
  CreateActivityBodyActivityType,
  CreateActivityBodyCustomerRiskCategoriesItem,
  CreateActivityBodyFindingStatus,
  UpdateActivityBodyActivityType,
  UpdateActivityBodyCustomerRiskCategoriesItem,
  UpdateActivityBodyFindingStatus,
  type ErrorType,
  type ErrorResponse,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  CheckCircle2, Edit2, Building2, Users, FileCheck2,
  AlertCircle, MessageCircle, Send, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { PageChrome, Panel } from "@/components/PageChrome";
import { apiFetch } from "@/lib/api";

/* ─── constants ─── */
const ACTIVITY_TYPES: {
  value: CreateActivityBodyActivityType;
  label: string;
  short: string;
  emoji: string;
  needsCustomer: boolean;
}[] = [
  { value: CreateActivityBodyActivityType.kyc, label: "KYC (Know Your Customer)", short: "KYC", emoji: "🪪", needsCustomer: true },
  { value: CreateActivityBodyActivityType.cdd, label: "CDD (Customer Due Diligence)", short: "CDD", emoji: "🔍", needsCustomer: true },
  { value: CreateActivityBodyActivityType.screening, label: "Screening Nasabah", short: "Screening", emoji: "🛡️", needsCustomer: true },
  { value: CreateActivityBodyActivityType.monitoring_transaksi, label: "Monitoring Transaksi", short: "Monitoring", emoji: "📊", needsCustomer: true },
  { value: CreateActivityBodyActivityType.pelaporan, label: "Pelaporan", short: "Pelaporan", emoji: "📝", needsCustomer: true },
  { value: CreateActivityBodyActivityType.sosialisasi, label: "Sosialisasi APUPPT", short: "Sosialisasi", emoji: "🎓", needsCustomer: false },
  { value: CreateActivityBodyActivityType.lainnya, label: "Lainnya", short: "Lainnya", emoji: "📌", needsCustomer: true },
  { value: CreateActivityBodyActivityType.libur, label: "Hari Libur / Tidak Masuk", short: "Libur", emoji: "🏖️", needsCustomer: false },
];

const ACTIVITY_LABELS: Record<string, string> = {
  kyc: "KYC", cdd: "CDD", screening: "Screening",
  monitoring_transaksi: "Monitoring Transaksi", pelaporan: "Pelaporan",
  sosialisasi: "Sosialisasi APUPPT", lainnya: "Lainnya", libur: "Hari Libur",
};

const RISK_CATEGORIES: { value: CreateActivityBodyCustomerRiskCategoriesItem; label: string; color: string }[] = [
  { value: CreateActivityBodyCustomerRiskCategoriesItem.high, label: "High Risk", color: "text-red-600 bg-red-50 border-red-300" },
  { value: CreateActivityBodyCustomerRiskCategoriesItem.medium, label: "Medium Risk", color: "text-amber-600 bg-amber-50 border-amber-300" },
  { value: CreateActivityBodyCustomerRiskCategoriesItem.low, label: "Low Risk", color: "text-emerald-600 bg-emerald-50 border-emerald-300" },
];

const RISK_COLOR: Record<string, string> = {
  high: "text-red-600 bg-red-50 border-red-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low: "text-emerald-600 bg-emerald-50 border-emerald-200",
};
const RISK_LABEL: Record<string, string> = { high: "High Risk", medium: "Medium Risk", low: "Low Risk" };

const FINDING_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "follow_up", label: "Follow Up" },
  { value: "completed", label: "Selesai" },
];

const ROLE_BADGE: Record<string, string> = {
  apuppt: "APUPPT", dk: "DK", du: "DU", owner: "Owner", superadmin: "Superadmin",
};

type ActivityItem = {
  id: string; branchId?: string | null; branchName?: string | null;
  activityType: string; itemsReviewed: number;
  customerRiskCategories?: string[] | null; hasFinding: boolean;
  findingSummary?: string | null; findingStatus?: string | null;
  notes?: string | null; date: string;
  dkReviewedAt?: string | null; dkNotes?: string | null;
  duSignedOffAt?: string | null;
};

type Comment = {
  id: string; activityId: string; content: string;
  createdAt: string; authorId: string;
  authorName: string | null; authorRole: string | null;
};

/* ─── comment thread ─── */
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
        method: "POST",
        body: JSON.stringify({ content: text.trim() }),
      });
      setText("");
      refetch();
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <p className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
        <MessageCircle className="w-3 h-3" />
        Komentar ({comments.length})
      </p>
      {comments.length > 0 && (
        <div className="space-y-2 mb-3">
          {comments.map(c => (
            <div key={c.id} className={`flex gap-2 ${c.authorId === currentUserId ? "flex-row-reverse" : ""}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                c.authorId === currentUserId
                  ? "bg-blue-600 text-white rounded-tr-none"
                  : "bg-white/10 text-slate-200 rounded-tl-none"
              }`}>
                <p className={`font-semibold mb-0.5 ${c.authorId === currentUserId ? "text-blue-100" : "text-slate-400"}`}>
                  {c.authorName ?? "?"} · {c.authorRole ? ROLE_BADGE[c.authorRole] ?? c.authorRole : ""}
                </p>
                <p>{c.content}</p>
                <p className={`text-xs mt-1 ${c.authorId === currentUserId ? "text-blue-200" : "text-slate-500"}`}>
                  {new Date(c.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={1}
          placeholder="Tulis komentar..."
          className="flex-1 px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
        />
        <button
          onClick={submit}
          disabled={posting || !text.trim()}
          className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─── history card ─── */
function HistoryCard({ a, userId }: { a: ActivityItem; userId: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Panel className="px-4 py-3 space-y-2">
      <div
        className="flex items-center justify-between gap-2 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span className="text-xs font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
              {ACTIVITY_TYPES.find(t => t.value === a.activityType)?.emoji ?? ""} {ACTIVITY_LABELS[a.activityType] ?? a.activityType}
            </span>
            {a.branchName && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Building2 className="w-3 h-3" />{a.branchName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            <span>{new Date(a.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
            {a.itemsReviewed > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{a.itemsReviewed} nasabah</span>}
            {a.duSignedOffAt ? (
              <span className="text-xs font-medium text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                <FileCheck2 className="w-3 h-3" />Sign-Off DU
              </span>
            ) : a.dkReviewedAt ? (
              <span className="text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />DK ✓
              </span>
            ) : (
              <span className="text-xs text-slate-500">Pending</span>
            )}
          </div>
        </div>
        <button className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="pt-2 border-t border-white/10 space-y-2 text-xs text-slate-400">
          {a.customerRiskCategories && a.customerRiskCategories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {a.customerRiskCategories.map(rc => (
                <span key={rc} className={`px-2 py-0.5 rounded border ${RISK_COLOR[rc] ?? ""}`}>{RISK_LABEL[rc] ?? rc}</span>
              ))}
            </div>
          )}
          {a.hasFinding && a.findingSummary && (
            <p className="text-amber-300"><span className="font-semibold">Temuan:</span> {a.findingSummary}</p>
          )}
          {a.dkNotes && <p><span className="font-semibold text-slate-400">Catatan DK:</span> {a.dkNotes}</p>}
          {a.notes && <p><span className="font-semibold text-slate-400">Catatan:</span> {a.notes}</p>}
          <CommentThread activityId={a.id} currentUserId={userId} />
        </div>
      )}
    </Panel>
  );
}

/* ─── main page ─── */
export default function Activity() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const queryClient = useQueryClient();

  const { data: activities, isLoading } = useListActivities({ ptId: user?.ptId ?? undefined });
  const { data: branches } = useListBranches({ ptId: user?.ptId ?? undefined });

  const todayActivities = activities?.filter(a => a.date === today) ?? [];
  const pastActivities = activities?.filter(a => a.date !== today) ?? [];
  const alreadyFilledToday = todayActivities.length > 0;

  type FormState = {
    branchId: string;
    activityType: CreateActivityBodyActivityType;
    itemsReviewed: number;
    customerRiskCategories: CreateActivityBodyCustomerRiskCategoriesItem[];
    hasFinding: boolean;
    findingSummary: string;
    findingStatus: CreateActivityBodyFindingStatus;
    notes: string;
  };

  const defaultForm: FormState = {
    branchId: "",
    activityType: CreateActivityBodyActivityType.kyc,
    itemsReviewed: 0,
    customerRiskCategories: [],
    hasFinding: false,
    findingSummary: "",
    findingStatus: CreateActivityBodyFindingStatus.pending,
    notes: "",
  };

  const [form, setForm] = useState<FormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const { mutate: createActivity, isPending: creating } = useCreateActivity<ErrorType<ErrorResponse>>({
    mutation: {
      onSuccess: () => { setShowForm(false); setForm(defaultForm); queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() }); },
      onError: (err) => setError(err.data?.error ?? err.message ?? "Gagal menyimpan aktivitas."),
    },
  });

  const { mutate: updateActivity, isPending: updating } = useUpdateActivity<ErrorType<ErrorResponse>>({
    mutation: {
      onSuccess: () => { setEditingId(null); setShowForm(false); setForm(defaultForm); queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() }); },
      onError: (err) => setError(err.data?.error ?? err.message ?? "Gagal memperbarui aktivitas."),
    },
  });

  const handleEdit = (a: ActivityItem) => {
    setForm({
      branchId: a.branchId ?? "",
      activityType: (a.activityType as CreateActivityBodyActivityType) ?? CreateActivityBodyActivityType.kyc,
      itemsReviewed: a.itemsReviewed,
      customerRiskCategories: (a.customerRiskCategories ?? []) as CreateActivityBodyCustomerRiskCategoriesItem[],
      hasFinding: a.hasFinding,
      findingSummary: a.findingSummary ?? "",
      findingStatus: (a.findingStatus ?? CreateActivityBodyFindingStatus.pending) as CreateActivityBodyFindingStatus,
      notes: a.notes ?? "",
    });
    setEditingId(a.id);
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleRisk = (cat: CreateActivityBodyCustomerRiskCategoriesItem) =>
    setForm(prev => ({
      ...prev,
      customerRiskCategories: prev.customerRiskCategories.includes(cat)
        ? prev.customerRiskCategories.filter(c => c !== cat)
        : [...prev.customerRiskCategories, cat],
    }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!user?.ptId) { setError("Akun Anda tidak terhubung ke PT manapun."); return; }

    const selected = ACTIVITY_TYPES.find(t => t.value === form.activityType);
    const needsCustomer = selected?.needsCustomer ?? true;
    if (needsCustomer && form.itemsReviewed <= 0) { setError("Jumlah nasabah harus lebih dari 0 untuk jenis kegiatan ini."); return; }
    if (needsCustomer && form.customerRiskCategories.length === 0) { setError("Kategori risiko nasabah wajib dipilih minimal satu."); return; }

    const riskCats = form.customerRiskCategories.length > 0 ? form.customerRiskCategories : null;

    if (editingId) {
      updateActivity({
        id: editingId,
        data: {
          branchId: form.branchId || null,
          activityType: form.activityType as UpdateActivityBodyActivityType,
          itemsReviewed: Number(form.itemsReviewed),
          customerRiskCategories: riskCats as UpdateActivityBodyCustomerRiskCategoriesItem[] | null,
          hasFinding: form.hasFinding,
          findingSummary: form.hasFinding ? form.findingSummary || null : null,
          findingStatus: form.hasFinding ? form.findingStatus as UpdateActivityBodyFindingStatus : null,
          notes: form.notes || null,
        },
      });
    } else {
      createActivity({
        data: {
          ptId: user.ptId,
          branchId: form.branchId || null,
          date: today,
          activityType: form.activityType,
          itemsReviewed: Number(form.itemsReviewed),
          customerRiskCategories: riskCats,
          hasFinding: form.hasFinding,
          findingSummary: form.hasFinding ? form.findingSummary || null : null,
          findingStatus: form.hasFinding ? form.findingStatus : null,
          notes: form.notes || null,
        },
      });
    }
  };

  const selectedTypeMeta = ACTIVITY_TYPES.find(t => t.value === form.activityType);
  const needsCustomer = selectedTypeMeta?.needsCustomer ?? true;

  return (
    <PageChrome
      eyebrow={new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      title="Aktivitas Harian"
      description="Catat kegiatan APUPPT hari ini"
    >

      {/* ── Today's status banner ── */}
      {!showForm && (
        <div className="mb-6">
          {alreadyFilledToday ? (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-300">Aktivitas hari ini sudah tercatat!</p>
                  <p className="text-xs text-emerald-500">{todayActivities.length} aktivitas · {today}</p>
                </div>
              </div>
              <div className="space-y-2">
                {todayActivities.map(a => {
                  const ai = a as ActivityItem;
                  return (
                    <div key={a.id} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">
                          {ACTIVITY_TYPES.find(t => t.value === a.activityType)?.emoji} {ACTIVITY_LABELS[a.activityType] ?? a.activityType}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          {a.branchName && <span className="flex items-center gap-0.5"><Building2 className="w-3 h-3" />{a.branchName}</span>}
                          {ai.itemsReviewed > 0 && <span>{ai.itemsReviewed} nasabah</span>}
                          {ai.dkReviewedAt
                            ? <span className="text-emerald-400">✓ DK</span>
                            : <span className="text-amber-400">Menunggu DK</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleEdit(ai)}
                        className="text-slate-500 hover:text-blue-400 transition-colors p-1"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => { setEditingId(null); setForm(defaultForm); setError(""); setShowForm(true); }}
                className="mt-3 w-full py-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/10 transition-colors"
              >
                + Tambah Aktivitas Lagi
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-amber-200 mb-1">Belum ada aktivitas hari ini</p>
              <p className="text-xs text-amber-500 mb-4">Segera catat kegiatan APUPPT untuk {today}</p>
              <button
                onClick={() => { setEditingId(null); setForm(defaultForm); setError(""); setShowForm(true); }}
                className="w-full py-3 rounded-xl bg-sky-500 text-slate-950 text-sm font-bold hover:bg-sky-400 transition-colors"
              >
                📋 Input Aktivitas Sekarang
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Input Form ── */}
      {showForm && (
        <Panel className="mb-6 p-5 pb-20 sm:pb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-100">
              {editingId ? "✏️ Edit Aktivitas" : "📋 Aktivitas Baru — " + today}
            </h3>
            <button
              onClick={() => { setEditingId(null); setShowForm(false); setForm(defaultForm); setError(""); }}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">

            {/* Activity type — visual grid */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Jenis Kegiatan *</label>
              <div className="grid grid-cols-2 gap-2">
                {ACTIVITY_TYPES.map(t => {
                  const selected = form.activityType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm({ ...form, activityType: t.value, customerRiskCategories: [], itemsReviewed: t.needsCustomer ? form.itemsReviewed : 0 })}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                        selected
                          ? "bg-blue-600/20 border-blue-500 text-blue-200"
                          : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"
                      }`}
                    >
                      <span className="text-base flex-shrink-0">{t.emoji}</span>
                      <span className="text-xs font-medium leading-tight">{t.short}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Branch */}
            {branches && branches.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  <Building2 className="w-3.5 h-3.5 inline mr-1" />Cabang (opsional)
                </label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#0e1a2d] border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Semua / Kantor Pusat —</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}

            {/* Jumlah nasabah + risk — only for non-exempt types */}
            {needsCustomer && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    <Users className="w-3.5 h-3.5 inline mr-1" />Jumlah Nasabah Diperiksa *
                  </label>
                  <input
                    type="number" min="1"
                    value={form.itemsReviewed || ""}
                    onChange={(e) => setForm({ ...form, itemsReviewed: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2.5 bg-[#0e1a2d] border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Kategori Risiko Nasabah *</label>
                  <div className="flex gap-2 flex-wrap">
                    {RISK_CATEGORIES.map(rc => {
                      const checked = form.customerRiskCategories.includes(rc.value);
                      return (
                        <button
                          key={rc.value} type="button" onClick={() => toggleRisk(rc.value)}
                          className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                            checked ? rc.color : "text-slate-400 bg-white/5 border-white/10 hover:border-white/20"
                          }`}
                        >
                          {checked ? "✓ " : ""}{rc.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Finding */}
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors">
                <input
                  type="checkbox" checked={form.hasFinding}
                  onChange={(e) => setForm({ ...form, hasFinding: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded accent-amber-500"
                />
                <span className="text-sm font-medium text-slate-300">⚠️ Ada temuan / indikasi pelanggaran</span>
              </label>
              {form.hasFinding && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Ringkasan Temuan *</label>
                    <textarea
                      value={form.findingSummary}
                      onChange={(e) => setForm({ ...form, findingSummary: e.target.value })}
                      rows={2} placeholder="Deskripsikan temuan secara singkat..."
                      className="w-full px-3 py-2 bg-[#0e1a2d] border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Status Temuan</label>
                    <select
                      value={form.findingStatus ?? "pending"}
                      onChange={(e) => setForm({ ...form, findingStatus: e.target.value as CreateActivityBodyFindingStatus })}
                      className="w-full px-3 py-2 bg-[#0e1a2d] border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {FINDING_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Catatan Tambahan (opsional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2} placeholder="Catatan tambahan..."
                className="w-full px-3 py-2.5 bg-[#0e1a2d] border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5 text-xs text-red-400">{error}</div>
            )}

            {/* Submit desktop */}
            <div className="hidden sm:flex gap-3 pt-1">
              {editingId && (
                <button type="button"
                  onClick={() => { setEditingId(null); setShowForm(false); setForm(defaultForm); setError(""); }}
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  Batal
                </button>
              )}
              <button type="submit" disabled={creating || updating}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {creating || updating ? "Menyimpan..." : editingId ? "Perbarui Aktivitas" : "Simpan Aktivitas"}
              </button>
            </div>
          </form>

          {/* Submit mobile — floating above bottom nav */}
          <div className="sm:hidden fixed bottom-16 left-0 right-0 z-30 flex gap-3 border-t border-white/10 bg-[#08111f] px-4 pb-3 pt-2">
            {editingId && (
              <button type="button"
                onClick={() => { setEditingId(null); setShowForm(false); setForm(defaultForm); setError(""); }}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-sm font-medium"
              >
                Batal
              </button>
            )}
            <button type="button" onClick={() => formRef.current?.requestSubmit()} disabled={creating || updating}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {creating || updating ? "Menyimpan..." : editingId ? "Perbarui" : "Simpan Aktivitas"}
            </button>
          </div>
        </Panel>
      )}

      {/* ── Riwayat ── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Riwayat Aktivitas</h2>
        <p className="mb-3 text-xs text-slate-500">Tap kartu untuk lihat detail & komentar. Hanya aktivitas hari ini yang dapat diedit.</p>
        {isLoading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Memuat...</div>
        ) : pastActivities.length === 0 ? (
          <Panel className="py-10 text-center">
            <p className="text-sm text-slate-400">Belum ada riwayat aktivitas.</p>
          </Panel>
        ) : (
          <div className="space-y-2">
            {pastActivities.map(a => (
              <HistoryCard key={a.id} a={a as ActivityItem} userId={user?.id ?? ""} />
            ))}
          </div>
        )}
      </div>
    </PageChrome>
  );
}
