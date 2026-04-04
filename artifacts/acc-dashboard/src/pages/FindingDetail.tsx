import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, MessageSquare, CheckCircle, Edit2, Send } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

type Finding = {
  id: string;
  ptId: string;
  branchId: string | null;
  branchName: string | null;
  reportedBy: string;
  assignedTo: string | null;
  date: string;
  findingText: string;
  status: string;
  deadline: string | null;
  notes: string | null;
  escalationLevel: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

type Comment = {
  id: string;
  findingId: string;
  authorId: string | null;
  authorName: string | null;
  content: string;
  isSystemLog: boolean;
  createdAt: string;
};

type UserOption = {
  id: string;
  name: string;
  role: string;
};

const TICKET_STATUS: Record<string, { label: string; color: string; next?: string }> = {
  pending: { label: "Pending", color: "text-red-600 bg-red-50 border-red-200", next: "in_progress" },
  in_progress: { label: "In Progress", color: "text-blue-600 bg-blue-50 border-blue-200", next: "awaiting_verification" },
  awaiting_verification: { label: "Menunggu Verifikasi", color: "text-amber-600 bg-amber-50 border-amber-200", next: "completed" },
  completed: { label: "Selesai", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
};

const STATUS_ACTIONS: Record<string, string> = {
  in_progress: "Mulai Kerjakan",
  awaiting_verification: "Minta Verifikasi",
  completed: "Selesaikan",
};

function useFinding(id: string) {
  return useQuery<Finding>({
    queryKey: ["finding", id],
    queryFn: () => apiFetch(`/api/findings/${id}`),
    enabled: !!id,
  });
}

function useComments(id: string) {
  return useQuery<Comment[]>({
    queryKey: ["finding-comments", id],
    queryFn: () => apiFetch(`/api/findings/${id}/comments`),
    enabled: !!id,
    refetchInterval: 10000,
  });
}

function useUsers() {
  return useQuery<UserOption[]>({
    queryKey: ["users"],
    queryFn: () => apiFetch("/api/users"),
    staleTime: 5 * 60 * 1000,
  });
}

export default function FindingDetail() {
  const [, params] = useRoute("/findings/:id");
  const id = params?.id ?? "";
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: finding, isLoading } = useFinding(id);
  const { data: comments } = useComments(id);
  const { data: users } = useUsers();

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ findingText: "", deadline: "", assignedTo: "", notes: "" });
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [saving, setSaving] = useState(false);

  const canEdit = user?.role === "dk" || user?.role === "apuppt" || user?.role === "superadmin";

  const startEdit = () => {
    if (!finding) return;
    setEditForm({
      findingText: finding.findingText,
      deadline: finding.deadline ?? "",
      assignedTo: finding.assignedTo ?? "",
      notes: finding.notes ?? "",
    });
    setEditMode(true);
  };

  const saveEdit = async () => {
    if (!finding) return;
    setSaving(true);
    try {
      await apiFetch(`/api/findings/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          findingText: editForm.findingText || undefined,
          deadline: editForm.deadline || null,
          assignedTo: editForm.assignedTo || null,
          notes: editForm.notes || null,
        }),
      });
      qc.invalidateQueries({ queryKey: ["finding", id] });
      qc.invalidateQueries({ queryKey: ["finding-comments", id] });
      setEditMode(false);
    } catch {}
    setSaving(false);
  };

  const advanceStatus = async () => {
    if (!finding) return;
    const currentStatus = TICKET_STATUS[finding.status];
    const nextStatus = currentStatus?.next;
    if (!nextStatus) return;
    setUpdatingStatus(true);
    try {
      await apiFetch(`/api/findings/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      });
      qc.invalidateQueries({ queryKey: ["finding", id] });
      qc.invalidateQueries({ queryKey: ["finding-comments", id] });
    } catch {}
    setUpdatingStatus(false);
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await apiFetch(`/api/findings/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: commentText }),
      });
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["finding-comments", id] });
    } catch {}
    setSubmittingComment(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm">Memuat...</div>
      </div>
    );
  }

  if (!finding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 text-sm">Temuan tidak ditemukan.</div>
      </div>
    );
  }

  const statusInfo = TICKET_STATUS[finding.status] ?? TICKET_STATUS.pending;
  const nextStatus = statusInfo.next;
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = finding.deadline && finding.status !== "completed" && finding.deadline < today;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/findings" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <h1 className="text-lg font-bold text-slate-900">Detail Tiket</h1>
            {finding.escalationLevel > 0 && (
              <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                Eskalasi Level {finding.escalationLevel}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {editMode ? (
                  <textarea
                    value={editForm.findingText}
                    onChange={(e) => setEditForm({ ...editForm, findingText: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                ) : (
                  <p className="text-sm text-slate-800 font-medium leading-relaxed">{finding.findingText}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
                {canEdit && !editMode && (
                  <button onClick={startEdit} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {editMode && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={editForm.deadline}
                    onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ditugaskan Ke</label>
                  <select
                    value={editForm.assignedTo}
                    onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Tidak Ada —</option>
                    {users?.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Catatan</label>
                  <input
                    type="text"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Catatan opsional..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {editMode && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => setEditMode(false)} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs hover:bg-slate-200 transition-colors">
                  Batal
                </button>
                <button onClick={saveEdit} disabled={saving} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-500 disabled:opacity-50 transition-colors">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            )}
          </div>

          <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs border-b border-slate-100">
            <div>
              <span className="text-slate-400">Tanggal Temuan</span>
              <p className="font-medium text-slate-700 mt-0.5">
                {new Date(finding.date + "T00:00:00").toLocaleDateString("id-ID")}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Deadline</span>
              <p className={`font-medium mt-0.5 ${isOverdue ? "text-red-600" : "text-slate-700"}`}>
                {finding.deadline
                  ? <>
                      {new Date(finding.deadline + "T00:00:00").toLocaleDateString("id-ID")}
                      {isOverdue && <span className="ml-1 text-red-500">(Lewat!)</span>}
                    </>
                  : <span className="text-slate-400">—</span>
                }
              </p>
            </div>
            <div>
              <span className="text-slate-400">Ditugaskan Ke</span>
              <p className="font-medium text-slate-700 mt-0.5">
                {finding.assignedTo
                  ? (users?.find((u) => u.id === finding.assignedTo)?.name ?? finding.assignedTo)
                  : <span className="text-slate-400">—</span>
                }
              </p>
            </div>
            {finding.notes && (
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-400">Catatan</span>
                <p className="font-medium text-slate-700 mt-0.5">{finding.notes}</p>
              </div>
            )}
          </div>

          {nextStatus && canEdit && (
            <div className="px-5 py-3">
              <button
                onClick={advanceStatus}
                disabled={updatingStatus}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                {updatingStatus ? "Memperbarui..." : STATUS_ACTIONS[nextStatus] ?? `Ubah ke ${nextStatus}`}
              </button>
            </div>
          )}
        </div>

        {/* Comment thread */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">Thread Komentar</h2>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {!comments || comments.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-slate-400">Belum ada komentar.</div>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className={`px-5 py-3 ${c.isSystemLog ? "bg-slate-50/80" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {c.isSystemLog ? (
                      <span className="text-xs font-medium text-slate-400 italic">Sistem</span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-700">{c.authorName ?? "Unknown"}</span>
                    )}
                    <span className="text-xs text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <p className={`text-sm ${c.isSystemLog ? "text-slate-500 italic" : "text-slate-700"}`}>
                    {c.content}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="px-5 py-3 border-t border-slate-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                placeholder="Tulis komentar..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addComment}
                disabled={submittingComment || !commentText.trim()}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
