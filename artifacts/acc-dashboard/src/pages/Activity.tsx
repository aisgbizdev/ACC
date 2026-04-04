import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateActivity, useUpdateActivity, useListActivities } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Plus, Edit2 } from "lucide-react";
import { getListActivitiesQueryKey } from "@workspace/api-client-react";

const ACTIVITY_TYPES = [
  { value: "transaction_review", label: "Review Transaksi" },
  { value: "kyc_document_review", label: "Review Dokumen KYC" },
  { value: "branch_follow_up", label: "Follow Up Cabang" },
  { value: "transaction_analysis", label: "Analisis Transaksi" },
  { value: "source_of_fund_verification", label: "Verifikasi Sumber Dana" },
  { value: "report_preparation", label: "Penyusunan Laporan" },
  { value: "meeting_coordination", label: "Koordinasi Rapat" },
  { value: "apuppt_socialization", label: "Sosialisasi APUPPT" },
];

const FINDING_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "follow_up", label: "Follow Up" },
  { value: "completed", label: "Selesai" },
];

export default function Activity() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const queryClient = useQueryClient();

  const { data: activities, isLoading } = useListActivities({ ptId: user?.ptId ?? undefined, date: today });

  const todayActivity = activities?.[0];

  const [form, setForm] = useState({
    activityType: "transaction_review",
    itemsReviewed: 0,
    hasFinding: false,
    findingSummary: "",
    findingStatus: "pending",
    notes: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { mutate: createActivity, isPending: creating } = useCreateActivity({
    mutation: {
      onSuccess: () => {
        setSubmitted(true);
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
      },
      onError: (err: any) => {
        setError(err?.data?.error ?? "Gagal menyimpan aktivitas.");
      },
    },
  });

  const { mutate: updateActivity, isPending: updating } = useUpdateActivity({
    mutation: {
      onSuccess: () => {
        setSubmitted(true);
        setIsEditing(false);
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
      },
      onError: (err: any) => {
        setError(err?.data?.error ?? "Gagal memperbarui aktivitas.");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user?.ptId) {
      setError("Akun Anda tidak terhubung ke PT manapun.");
      return;
    }

    const payload = {
      ptId: user.ptId,
      date: today,
      activityType: form.activityType as any,
      itemsReviewed: Number(form.itemsReviewed),
      hasFinding: form.hasFinding,
      findingSummary: form.hasFinding ? form.findingSummary || null : null,
      findingStatus: form.hasFinding ? (form.findingStatus as any) : null,
      notes: form.notes || null,
    };

    if (isEditing && todayActivity) {
      updateActivity({ id: todayActivity.id, data: payload });
    } else {
      createActivity({ data: payload });
    }
  };

  const startEdit = () => {
    if (!todayActivity) return;
    setForm({
      activityType: todayActivity.activityType,
      itemsReviewed: todayActivity.itemsReviewed,
      hasFinding: todayActivity.hasFinding,
      findingSummary: todayActivity.findingSummary ?? "",
      findingStatus: todayActivity.findingStatus ?? "pending",
      notes: todayActivity.notes ?? "",
    });
    setSubmitted(false);
    setIsEditing(true);
    setError("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm">Memuat...</div>
      </div>
    );
  }

  const showSuccess = submitted && !isEditing;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Input Aktivitas Harian</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date(today).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {todayActivity && !isEditing && !showSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800">Aktivitas hari ini sudah diinput</p>
                <p className="text-xs text-emerald-600">Klik Edit untuk melakukan perubahan</p>
              </div>
            </div>
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          </div>
        )}

        {showSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 text-center">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-emerald-800">
              {isEditing ? "Aktivitas berhasil diperbarui!" : "Aktivitas berhasil disimpan!"}
            </p>
          </div>
        )}

        {(!todayActivity || isEditing) && !showSuccess && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Jenis Aktivitas *</label>
                <select
                  value={form.activityType}
                  onChange={(e) => setForm({ ...form, activityType: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Jumlah Item Diperiksa *</label>
                <input
                  type="number"
                  min={0}
                  value={form.itemsReviewed}
                  onChange={(e) => setForm({ ...form, itemsReviewed: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.hasFinding}
                    onChange={(e) => setForm({ ...form, hasFinding: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Ada Temuan</span>
                </label>
              </div>

              {form.hasFinding && (
                <div className="pl-4 border-l-2 border-amber-200 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Ringkasan Temuan</label>
                    <textarea
                      value={form.findingSummary}
                      onChange={(e) => setForm({ ...form, findingSummary: e.target.value })}
                      rows={3}
                      placeholder="Deskripsi singkat temuan..."
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Status Temuan</label>
                    <select
                      value={form.findingStatus}
                      onChange={(e) => setForm({ ...form, findingStatus: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {FINDING_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
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
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-600">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => { setIsEditing(false); setError(""); }}
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
                  {creating || updating ? "Menyimpan..." : isEditing ? "Perbarui Aktivitas" : "Simpan Aktivitas"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
