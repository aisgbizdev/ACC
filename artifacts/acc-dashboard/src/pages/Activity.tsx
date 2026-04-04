import { useState } from "react";
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
import { CheckCircle, Edit2, Building2, ClipboardList, Users } from "lucide-react";

const ACTIVITY_TYPES: { value: CreateActivityBodyActivityType; label: string }[] = [
  { value: CreateActivityBodyActivityType.kyc, label: "KYC (Know Your Customer)" },
  { value: CreateActivityBodyActivityType.cdd, label: "CDD (Customer Due Diligence)" },
  { value: CreateActivityBodyActivityType.screening, label: "Screening Nasabah" },
  { value: CreateActivityBodyActivityType.monitoring_transaksi, label: "Monitoring Transaksi" },
  { value: CreateActivityBodyActivityType.pelaporan, label: "Pelaporan" },
  { value: CreateActivityBodyActivityType.sosialisasi, label: "Sosialisasi APUPPT" },
  { value: CreateActivityBodyActivityType.lainnya, label: "Lainnya" },
];

const ACTIVITY_LABELS: Record<string, string> = {
  kyc: "KYC",
  cdd: "CDD",
  screening: "Screening",
  monitoring_transaksi: "Monitoring Transaksi",
  pelaporan: "Pelaporan",
  sosialisasi: "Sosialisasi APUPPT",
  lainnya: "Lainnya",
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
      form.activityType === CreateActivityBodyActivityType.pelaporan ||
      form.activityType === CreateActivityBodyActivityType.lainnya;

    if (!isNonCustomerActivity && form.itemsReviewed <= 0) {
      setError("Jumlah nasabah diperiksa harus lebih dari 0 untuk jenis kegiatan ini.");
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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Aktivitas Harian</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <button
            onClick={() => {
              if (showForm) { setEditingId(null); setForm(defaultForm); setError(""); }
              setShowForm(!showForm);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 transition-colors"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            {showForm ? "Tutup Form" : "Input Aktivitas"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">
              {editingId ? "Edit Aktivitas" : "Aktivitas Baru"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  <Building2 className="w-3.5 h-3.5 inline mr-1" />Cabang (opsional)
                </label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Semua / Kantor Pusat —</option>
                  {branches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Jenis Kegiatan *</label>
                <select
                  value={form.activityType}
                  onChange={(e) => setForm({ ...form, activityType: e.target.value as CreateActivityBodyActivityType })}
                  required
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  <Users className="w-3.5 h-3.5 inline mr-1" />Jumlah Nasabah Diperiksa *
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.itemsReviewed}
                  onChange={(e) => setForm({ ...form, itemsReviewed: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">Isi 0 jika kegiatan tidak langsung melibatkan pemeriksaan nasabah</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Kategori Risiko Nasabah (pilih semua yang relevan)</label>
                <div className="flex gap-2 flex-wrap">
                  {RISK_CATEGORIES.map(rc => {
                    const checked = form.customerRiskCategories.includes(rc.value);
                    return (
                      <button
                        key={rc.value}
                        type="button"
                        onClick={() => toggleRiskCategory(rc.value)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          checked ? rc.color : "text-slate-500 bg-slate-50 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {checked ? "✓ " : ""}{rc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.hasFinding}
                    onChange={(e) => setForm({ ...form, hasFinding: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-slate-700">Ada temuan / indikasi pelanggaran</span>
                </label>
              </div>

              {form.hasFinding && (
                <div className="pl-4 border-l-2 border-amber-300 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Ringkasan Temuan *</label>
                    <textarea
                      value={form.findingSummary}
                      onChange={(e) => setForm({ ...form, findingSummary: e.target.value })}
                      rows={2}
                      placeholder="Deskripsikan temuan secara singkat..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Status Temuan</label>
                    <select
                      value={form.findingStatus ?? "pending"}
                      onChange={(e) => setForm({ ...form, findingStatus: e.target.value as CreateActivityBodyFindingStatus })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {FINDING_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Catatan (opsional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Catatan tambahan..."
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-600">{error}</div>
              )}

              <div className="flex gap-3 pt-1">
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
          </div>
        )}

        {todayActivities.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-semibold text-slate-700">Aktivitas Hari Ini ({todayActivities.length})</h2>
            </div>
            <div className="space-y-2">
              {todayActivities.map(a => <ActivityCard key={a.id} a={a as ActivityItem} />)}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Riwayat Aktivitas</h2>
          {isLoading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Memuat...</div>
          ) : pastActivities.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 py-10 text-center">
              <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Belum ada riwayat aktivitas.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                    <th className="text-left px-4 py-2.5 font-medium">Tanggal</th>
                    <th className="text-left px-4 py-2.5 font-medium">Cabang</th>
                    <th className="text-left px-4 py-2.5 font-medium">Jenis Kegiatan</th>
                    <th className="text-right px-4 py-2.5 font-medium">Nasabah</th>
                    <th className="text-left px-4 py-2.5 font-medium">Kategori Risiko</th>
                    <th className="text-left px-4 py-2.5 font-medium">Temuan</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
