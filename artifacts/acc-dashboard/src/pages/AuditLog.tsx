import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useListPts } from "@workspace/api-client-react";

type UserOption = { id: string; name: string; role: string; };

type AuditLogEntry = {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ptId: string | null;
  beforeData: unknown;
  afterData: unknown;
  ipAddress: string | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  submit_activity: "Submit Aktivitas",
  create_finding: "Buat Temuan",
  update_finding: "Edit Temuan",
  complete_finding: "Selesaikan Temuan",
  dk_review: "DK Tinjau",
  du_signoff: "DU Sign-Off",
  add_comment: "Tambah Komentar",
  escalate_ticket: "Eskalasi Tiket",
};

export default function AuditLog() {
  const { user } = useAuth();
  const { data: pts } = useListPts();

  const [filterPt, setFilterPt] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const { data: users } = useQuery<UserOption[]>({
    queryKey: ["users"],
    queryFn: () => apiFetch("/api/users"),
    enabled: user?.role === "superadmin",
    staleTime: 5 * 60 * 1000,
  });

  const params = new URLSearchParams();
  if (filterPt) params.set("ptId", filterPt);
  if (filterUser) params.set("userId", filterUser);
  if (filterAction) params.set("action", filterAction);
  if (filterStartDate) params.set("startDate", filterStartDate);
  if (filterEndDate) params.set("endDate", filterEndDate);

  const { data: logs, isLoading, refetch } = useQuery<AuditLogEntry[]>({
    queryKey: ["audit-logs", filterPt, filterUser, filterAction, filterStartDate, filterEndDate],
    queryFn: () => apiFetch(`/api/audit-logs?${params.toString()}`),
    enabled: user?.role === "superadmin",
  });

  if (user?.role !== "superadmin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 text-sm">Akses ditolak.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Audit Log</h1>
              <p className="text-sm text-slate-500 mt-0.5">Riwayat semua perubahan sistem</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            Muat Ulang
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">PT</label>
            <select
              value={filterPt}
              onChange={(e) => setFilterPt(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua PT</option>
              {pts?.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Pengguna</label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Pengguna</option>
              {users?.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Jenis Aksi</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Aksi</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-400">Memuat log...</div>
          ) : !logs || logs.length === 0 ? (
            <div className="py-12 text-center">
              <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Tidak ada log ditemukan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Waktu</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Pengguna</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Aksi</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Objek</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.slice().reverse().map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(log.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit", second: "2-digit"
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-700">{log.userName ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {log.resourceType}
                        {log.resourceId && <span className="ml-1 text-slate-400">#{log.resourceId.slice(0, 8)}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{log.ipAddress ?? "—"}</td>
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
