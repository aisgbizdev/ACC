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
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Edit2, Building2, ClipboardList, Users, CheckCircle2, FileCheck2 } from "lucide-react";
import { PageChrome, Panel } from "@/components/PageChrome";

const ACTIVITY_TYPES: { value: CreateActivityBodyActivityType; label: string }[] = [
  { value: CreateActivityBodyActivityType.kyc, label: "KYC (Know Your Customer)" },
  { value: CreateActivityBodyActivityType.cdd, label: "CDD (Customer Due Diligence)" },
  { value: CreateActivityBodyActivityType.screening, label: "Screening Nasabah" },
  { value: CreateActivityBodyActivityType.monitoring_transaksi, label: "Monitoring Transaksi" },
  { value: CreateActivityBodyActivityType.pelaporan, label: "Pelaporan" },
  { value: CreateActivityBodyActivityType.sosialisasi, label: "Sosialisasi APUPPT" },
  { value: CreateActivityBodyActivityType.lainnya, label: "Lainnya" },
  { value: CreateActivityBodyActivityType.libur, label: "Hari Libur / Tidak Masuk" },
];

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

const RISK_CATEGORIES: { value: CreateActivityBodyCustomerRiskCategoriesItem; label: string; color: string }[] = [
  { value: CreateActivityBodyCustomerRiskCategoriesItem.high, label: "High Risk", color: "text-red-600 bg-red-50 border-red-200" },
  { value: CreateActivityBodyCustomerRiskCategoriesItem.medium, label: "Medium Risk", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { value: CreateActivityBodyCustomerRiskCategoriesItem.low, label: "Low Risk", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
];

const FINDING_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "follow_up", label: "Follow Up" },
  { value: "completed", label: "Selesai" },
];

const RISK_LABEL: Record<string, string> = {
  high: "High Risk",
  medium: "Medium Risk",
  low: "Low Risk",
};

const RISK_COLOR: Record<string, string> = {
  high: "text-red-600 bg-red-50 border-red-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

type ActivityItem = {
  id: string;
  branchId?: string | null;
  branchName?: string | null;
  activityType: string;
  itemsReviewed: number;
  customerRiskCategories?: string[] | null;
  hasFinding: boolean;
  findingSummary?: string | null;
  findingStatus?: string | null;
  notes?: string | null;
  date: string;
  dkReviewedAt?: string | null;
  dkNotes?: string | null;
  duSignedOffAt?: string | null;
};

export default function Activity() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const queryClient = useQueryClient();

  const { data: activities, isLoading } = useListActivities({ ptId: user?.ptId ?? undefined });
  const { data: branches } = useListBranches({ ptId: user?.ptId ?? undefined });

  const todayActivities = activities?.filter(a => a.date === today) ?? [];
  const pastActivities = activities?.filter(a => a.date !== today) ?? [];

  const defaultForm: {
    branchId: string;
    activityType: CreateActivityBodyActivityType;
    itemsReviewed: number;
    customerRiskCategories: CreateActivityBodyCustomerRiskCategoriesItem[];
    hasFinding: boolean;
    findingSummary: string;
    findingStatus: CreateActivityBodyFindingStatus;
    notes: string;
  } = {
    branchId: "",
    activityType: CreateActivityBodyActivityType.kyc,
    itemsReviewed: 0,
    customerRiskCategories: [],
    hasFinding: false,
    findingSummary: "",
    findingStatus: CreateActivityBodyFindingStatus.pending,
    notes: "",
  };

  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const { mutate: createActivity, isPending: creating } = useCreateActivity<ErrorType<ErrorResponse>>({
    mutation: {
      onSuccess: () => {
        setShowForm(false);
        setForm(defaultForm);
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
      },
      onError: (err) => {
        setError(err.data?.error ?? err.message ?? "Gagal menyimpan aktivitas.");
      },
    },
  });

  const { mutate: updateActivity, isPending: updating } = useUpdateActivity<ErrorType<ErrorResponse>>({
    mutation: {
      onSuccess: () => {
        setEditingId(null);
        setShowForm(false);
        setForm(defaultForm);
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
      },
      onError: (err) => {
        setError(err.data?.error ?? err.message ?? "Gagal memperbarui aktivitas.");
      },
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
  };

  const toggleRiskCategory = (cat: CreateActivityBodyCustomerRiskCategoriesItem) => {
    setForm(prev => ({
      ...prev,
      customerRiskCategories: prev.customerRiskCategories.includes(cat)
        ? prev.customerRiskCategories.filter(c => c !== cat)
        : [...prev.customerRiskCategories, cat],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user?.ptId) {
      setError("Akun Anda tidak terhubung ke PT manapun.");
      return;
    }

    const isNonCustomerActivity =
      form.activityType === CreateActivityBodyActivityType.sosialisasi ||
      form.activityType === CreateActivityBodyActivityType.libur;

    if (!isNonCustomerActivity && form.itemsReviewed <= 0) {
      setError("Jumlah nasabah diperiksa harus lebih dari 0 untuk jenis kegiatan ini.");
      return;
    }

    if (!isNonCustomerActivity && form.customerRiskCategories.length === 0) {
      setError("Kategori risiko nasabah wajib dipilih minimal satu untuk jenis kegiatan ini.");
      return;
    }

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

  const ActivityCard = ({ a }: { a: ActivityItem }) => (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
              {ACTIVITY_LABELS[a.activityType] ?? a.activityType}
            </span>
            {a.branchName && (
              <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
                <Building2 className="w-3 h-3" />{a.branchName}
              </span>
            )}
            {a.hasFinding && (
              <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                Ada Temuan
              </span>
            )}
            {a.duSignedOffAt ? (
              <span className="text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded flex items-center gap-1">
                <FileCheck2 className="w-3 h-3" />Sign-Off DU
              </span>
            ) : a.dkReviewedAt ? (
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />Disetujui DK
              </span>
            ) : (
              <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                Menunggu Review
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-400" />
              <strong>{a.itemsReviewed}</strong> nasabah
            </span>
            {a.customerRiskCategories && a.customerRiskCategories.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {a.customerRiskCategories.map(rc => (
                  <span key={rc} className={`px-1.5 py-0.5 rounded border text-xs ${RISK_COLOR[rc] ?? ""}`}>
                    {RISK_LABEL[rc] ?? rc}
                  </span>
                ))}
              </div>
            )}
          </div>
          {a.findingSummary && <p className="text-xs text-slate-500 mt-1">Temuan: {a.findingSummary}</p>}
          {a.notes && <p className="text-xs text-slate-400 mt-0.5">{a.notes}</p>}
        </div>
        <button
          onClick={() => handleEdit(a)}
          className="text-slate-400 hover:text-blue-600 transition-colors p-1"
          title="Edit"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <PageChrome
      eyebrow={new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      title="Aktivitas Harian"
      description="Input, edit, dan review aktivitas APUPPT tanpa mengubah alur data yang sudah ada."
      actions={
        <button
          onClick={() => {
            if (showForm) { setEditingId(null); setForm(defaultForm); setError(""); }
            setShowForm(!showForm);
          }}
          className="flex items-center gap-1.5 rounded-2xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400"
        >
          <ClipboardList className="h-4 w-4" />
          {showForm ? "Tutup Form" : "Input Aktivitas"}
        </button>
      }
    >

        {showForm && (
          <Panel className="mb-6 p-5 pb-20 sm:pb-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-100">
              {editingId ? "Edit Aktivitas" : "Aktivitas Baru"}
            </h3>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  <Building2 className="w-3.5 h-3.5 inline mr-1" />Cabang (opsional)
                </label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#0e1a2d] border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Semua / Kantor Pusat —</option>
                  {branches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Jenis Kegiatan *</label>
                <select
                  value={form.activityType}
                  onChange={(e) => setForm({ ...form, activityType: e.target.value as CreateActivityBodyActivityType })}
                  required
                  className="w-full px-3 py-2.5 bg-[#0e1a2d] border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {form.activityType !== CreateActivityBodyActivityType.sosialisasi &&
               form.activityType !== CreateActivityBodyActivityType.libur && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    <Users className="w-3.5 h-3.5 inline mr-1" />Jumlah Nasabah Diperiksa *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.itemsReviewed}
                    onChange={(e) => setForm({ ...form, itemsReviewed: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 bg-[#0e1a2d] border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {form.activityType !== CreateActivityBodyActivityType.sosialisasi &&
               form.activityType !== CreateActivityBodyActivityType.libur && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Kategori Risiko Nasabah (pilih semua yang relevan)</label>
                <div className="flex gap-2 flex-wrap">
                  {RISK_CATEGORIES.map(rc => {
                    const checked = form.customerRiskCategories.includes(rc.value);
                    return (
                      <button
                        key={rc.value}
                        type="button"
                        onClick={() => toggleRiskCategory(rc.value)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          checked ? rc.color : "text-slate-400 bg-white/5 border-white/10 hover:border-white/20 hover:text-slate-200"
                        }`}
                      >
                        {checked ? "✓ " : ""}{rc.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              )}

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.hasFinding}
                    onChange={(e) => setForm({ ...form, hasFinding: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-slate-300">Ada temuan / indikasi pelanggaran</span>
                </label>
              </div>

              {form.hasFinding && (
                <div className="pl-4 border-l-2 border-amber-400/50 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Ringkasan Temuan *</label>
                    <textarea
                      value={form.findingSummary}
                      onChange={(e) => setForm({ ...form, findingSummary: e.target.value })}
                      rows={2}
                      placeholder="Deskripsikan temuan secara singkat..."
                      className="w-full px-3 py-2 bg-[#0e1a2d] border border-white/10 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Status Temuan</label>
                    <select
                      value={form.findingStatus ?? "pending"}
                      onChange={(e) => setForm({ ...form, findingStatus: e.target.value as CreateActivityBodyFindingStatus })}
                      className="w-full px-3 py-2 bg-[#0e1a2d] border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {FINDING_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Catatan (opsional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Catatan tambahan..."
                  className="w-full px-3 py-2.5 bg-[#0e1a2d] border border-white/10 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-600">{error}</div>
              )}

              <div className="hidden sm:flex gap-3 pt-1">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => { setEditingId(null); setShowForm(false); setForm(defaultForm); setError(""); }}
                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  disabled={creating || updating}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  {creating || updating ? "Menyimpan..." : editingId ? "Perbarui Aktivitas" : "Simpan Aktivitas"}
                </button>
              </div>
            </form>
            <div className="sm:hidden fixed bottom-16 left-0 right-0 z-30 flex gap-3 border-t border-white/10 bg-[#08111f] px-4 pb-3 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setShowForm(false); setForm(defaultForm); setError(""); }}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
              )}
              <button
                type="button"
                onClick={() => formRef.current?.requestSubmit()}
                disabled={creating || updating}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {creating || updating ? "Menyimpan..." : editingId ? "Perbarui Aktivitas" : "Simpan Aktivitas"}
              </button>
            </div>
          </Panel>
        )}

        {todayActivities.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-200">Aktivitas Hari Ini ({todayActivities.length})</h2>
            </div>
            <div className="space-y-2">
              {todayActivities.map(a => <ActivityCard key={a.id} a={a as ActivityItem} />)}
            </div>
          </div>
        )}

        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-200">Riwayat Aktivitas</h2>
          <p className="mb-3 text-xs text-slate-500">Riwayat aktivitas tidak dapat diubah. Hanya aktivitas hari ini yang dapat diedit.</p>
          {isLoading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Memuat...</div>
          ) : pastActivities.length === 0 ? (
            <Panel className="py-10 text-center">
              <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Belum ada riwayat aktivitas.</p>
            </Panel>
          ) : (
            <Panel className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                    <th className="text-left px-4 py-2.5 font-medium">Tanggal</th>
                    <th className="text-left px-4 py-2.5 font-medium">Cabang</th>
                    <th className="text-left px-4 py-2.5 font-medium">Jenis Kegiatan</th>
                    <th className="text-right px-4 py-2.5 font-medium">Nasabah</th>
                    <th className="text-left px-4 py-2.5 font-medium">Kategori Risiko</th>
                    <th className="text-left px-4 py-2.5 font-medium">Temuan</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pastActivities.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {new Date(a.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {a.branchName
                          ? <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-slate-400" />{a.branchName}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                          {ACTIVITY_LABELS[a.activityType] ?? a.activityType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 font-medium">{a.itemsReviewed}</td>
                      <td className="px-4 py-3">
                        {a.customerRiskCategories && a.customerRiskCategories.length > 0
                          ? <div className="flex gap-1 flex-wrap">
                              {a.customerRiskCategories.map(rc => (
                                <span key={rc} className={`px-1.5 py-0.5 rounded border text-xs ${RISK_COLOR[rc] ?? ""}`}>
                                  {RISK_LABEL[rc] ?? rc}
                                </span>
                              ))}
                            </div>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {a.hasFinding
                          ? <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Ada</span>
                          : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {(a as ActivityItem).duSignedOffAt ? (
                          <span className="text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                            <FileCheck2 className="w-3 h-3" />Sign-Off DU
                          </span>
                        ) : (a as ActivityItem).dkReviewedAt ? (
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />DK
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}
        </div>
    </PageChrome>
  );
}
