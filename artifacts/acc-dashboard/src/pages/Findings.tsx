import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListFindings,
  useListPts,
  useListBranches,
  getListFindingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus, Building2, ExternalLink, Clock } from "lucide-react";
import { apiFetch } from "@/lib/api";

const FINDING_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-red-600 bg-red-50 border-red-200" },
  in_progress: { label: "In Progress", color: "text-blue-600 bg-blue-50 border-blue-200" },
  awaiting_verification: { label: "Menunggu Verifikasi", color: "text-amber-600 bg-amber-50 border-amber-200" },
  follow_up: { label: "Follow Up", color: "text-amber-600 bg-amber-50 border-amber-200" },
  completed: { label: "Selesai", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
};

export default function Findings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPt, setFilterPt] = useState<string>("");
  const [showForm, setShowForm] = useState(false);

  const isGlobalRole = !user?.ptId;

  const params: Record<string, string> = {};
  if (user?.ptId) {
    params.ptId = user.ptId;
  } else if (filterPt) {
    params.ptId = filterPt;
  }
  if (filterStatus) params.status = filterStatus;

  const { data: findings, isLoading } = useListFindings(params);
  const { data: pts } = useListPts();
  const { data: branches } = useListBranches(
    user?.ptId ? { ptId: user.ptId } : filterPt ? { ptId: filterPt } : undefined
  );

  const defaultForm = {
    ptId: user?.ptId ?? "",
    branchId: "",
    date: new Date().toISOString().split("T")[0],
    deadline: "",
    findingText: "",
    status: "pending",
    notes: "",
  };
  const [form, setForm] = useState(defaultForm);
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setFormError("");
    if (!form.findingText.trim()) { setFormError("Deskripsi temuan wajib diisi."); return; }
    const ptId = user?.ptId ?? form.ptId;
    if (!ptId) { setFormError("Pilih PT terlebih dahulu."); return; }
    if (!form.deadline) { setFormError("Deadline wajib diisi."); return; }
    setCreating(true);
    try {
      await apiFetch("/api/findings", {
        method: "POST",
        body: JSON.stringify({
          ptId,
          branchId: form.branchId || null,
          date: form.date,
          deadline: form.deadline,
          findingText: form.findingText,
          status: form.status,
          notes: form.notes || null,
        }),
      });
      setShowForm(false);
      setForm({ ...defaultForm });
      queryClient.invalidateQueries({ queryKey: getListFindingsQueryKey() });
    } catch (e: unknown) {
      const msg = (e instanceof Error) ? e.message : "Gagal menyimpan temuan.";
      setFormError(msg);
    }
    setCreating(false);
  };

  const canCreate = user?.role === "apuppt" || user?.role === "dk";

  const getPtName = (ptId: string) => pts?.find((p) => p.id === ptId)?.code ?? ptId;

  const activePtId = user?.ptId ?? form.ptId;
  const branchesForForm = branches?.filter(b => b.ptId === activePtId) ?? branches ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Temuan</h1>
            <p className="text-sm text-slate-500 mt-0.5">{findings?.length ?? 0} total temuan</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
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
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="awaiting_verification">Menunggu Verifikasi</option>
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
              {user?.role === "dk" && !user.ptId && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">PT *</label>
                  <select
                    value={form.ptId}
                    onChange={(e) => setForm({ ...form, ptId: e.target.value, branchId: "" })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Pilih PT</option>
                    {pts?.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  <Building2 className="w-3.5 h-3.5 inline mr-1" />Cabang (opsional)
                </label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Semua / Kantor Pusat —</option>
                  {branchesForForm.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">Deadline *</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    min={form.date}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                  <option value="in_progress">In Progress</option>
                  <option value="awaiting_verification">Menunggu Verifikasi</option>
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
                  onClick={handleCreate}
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
                const today = new Date().toISOString().split("T")[0];
                const deadline = (f as { deadline?: string | null }).deadline;
                const isOverdue = deadline && f.status !== "completed" && deadline < today;
                return (
                  <div key={f.id} className="px-4 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {getPtName(f.ptId)}
                          </span>
                          {f.branchName && (
                            <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {f.branchName}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            {new Date(f.date).toLocaleDateString("id-ID")}
                          </span>
                          {deadline && (
                            <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : "text-slate-400"}`}>
                              <Clock className="w-3 h-3" />
                              Deadline: {new Date(deadline + "T00:00:00").toLocaleDateString("id-ID")}
                              {isOverdue && " (Lewat!)"}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-800">{f.findingText}</p>
                        {f.notes && <p className="text-xs text-slate-400 mt-1">{f.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        <Link
                          href={`/findings/${f.id}`}
                          className="flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Detail
                        </Link>
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
