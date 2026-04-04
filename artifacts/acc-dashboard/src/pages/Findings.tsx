import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useListFindings, useListPts, useCreateFinding, useCompleteFinding, getListFindingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus, CheckCircle, Filter } from "lucide-react";

const FINDING_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-red-600 bg-red-50 border-red-200" },
  follow_up: { label: "Follow Up", color: "text-amber-600 bg-amber-50 border-amber-200" },
  completed: { label: "Selesai", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
};

export default function Findings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showForm, setShowForm] = useState(false);

  const params: Record<string, string> = {};
  if (user?.role === "apuppt" && user.ptId) params.ptId = user.ptId;
  if (filterStatus) params.status = filterStatus;

  const { data: findings, isLoading } = useListFindings(params);
  const { data: pts } = useListPts();

  const [form, setForm] = useState({
    ptId: user?.ptId ?? "",
    date: new Date().toISOString().split("T")[0],
    findingText: "",
    status: "pending",
    notes: "",
  });
  const [formError, setFormError] = useState("");

  const { mutate: createFinding, isPending: creating } = useCreateFinding({
    mutation: {
      onSuccess: () => {
        setShowForm(false);
        setForm({ ptId: user?.ptId ?? "", date: new Date().toISOString().split("T")[0], findingText: "", status: "pending", notes: "" });
        queryClient.invalidateQueries({ queryKey: getListFindingsQueryKey() });
      },
      onError: (err: any) => {
        setFormError(err?.data?.error ?? "Gagal menyimpan temuan.");
      },
    },
  });

  const { mutate: completeFinding } = useCompleteFinding({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFindingsQueryKey() });
      },
    },
  });

  const canCreate = user?.role === "apuppt" || user?.role === "dk";
  const canComplete = user?.role === "apuppt" || user?.role === "dk";

  const getPtName = (ptId: string) => pts?.find((p) => p.id === ptId)?.code ?? ptId;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Temuan</h1>
            <p className="text-sm text-slate-500 mt-0.5">{findings?.length ?? 0} total temuan</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="follow_up">Follow Up</option>
              <option value="completed">Selesai</option>
            </select>
            {canCreate && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Temuan
              </button>
            )}
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Temuan Baru</h3>
            <div className="space-y-3">
              {user?.role === "dk" && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">PT</label>
                  <select
                    value={form.ptId}
                    onChange={(e) => setForm({ ...form, ptId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Pilih PT</option>
                    {pts?.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Deskripsi Temuan *</label>
                <textarea
                  value={form.findingText}
                  onChange={(e) => setForm({ ...form, findingText: e.target.value })}
                  rows={3}
                  placeholder="Deskripsikan temuan secara lengkap..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="completed">Selesai</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Catatan (opsional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{formError}</div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowForm(false); setFormError(""); }}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    setFormError("");
                    if (!form.findingText.trim()) { setFormError("Deskripsi temuan wajib diisi."); return; }
                    createFinding({ data: { ptId: form.ptId || user!.ptId!, date: form.date, findingText: form.findingText, status: form.status as any, notes: form.notes || null } });
                  }}
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  {creating ? "Menyimpan..." : "Simpan Temuan"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-400">Memuat...</div>
          ) : !findings || findings.length === 0 ? (
            <div className="py-12 text-center">
              <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Tidak ada temuan{filterStatus ? ` dengan status ini` : ""}.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {findings.map((f) => {
                const statusInfo = FINDING_STATUS[f.status] ?? FINDING_STATUS.pending;
                return (
                  <div key={f.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {getPtName(f.ptId)}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(f.date).toLocaleDateString("id-ID")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-800">{f.findingText}</p>
                        {f.notes && <p className="text-xs text-slate-400 mt-1">{f.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {canComplete && f.status !== "completed" && (
                          (user?.role === "dk" || (user?.role === "apuppt" && f.ptId === user.ptId)) && (
                            <button
                              onClick={() => completeFinding({ id: f.id })}
                              className="flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-300 text-xs text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Selesaikan
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
