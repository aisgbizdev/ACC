import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { useListPts } from "@workspace/api-client-react";
import { Users, Plus, Edit2, UserX, UserCheck, KeyRound, X, Loader2 } from "lucide-react";

type UserEntry = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  ptId: string | null;
  isActive: boolean;
  createdAt: string;
  ptName: string | null;
  ptCode: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  apuppt: "APUPPT",
  dk: "DK",
  du: "DU",
  owner: "Owner",
  superadmin: "Superadmin",
};

const ROLE_COLORS: Record<string, string> = {
  apuppt: "bg-blue-100 text-blue-700",
  dk: "bg-purple-100 text-purple-700",
  du: "bg-orange-100 text-orange-700",
  owner: "bg-green-100 text-green-700",
  superadmin: "bg-red-100 text-red-700",
};

const ROLES_NEEDING_PT = ["apuppt", "dk", "du"];

type ModalMode = "create" | "edit" | "reset-password" | null;

type FormData = {
  name: string;
  username: string;
  email: string;
  role: string;
  ptId: string;
  password: string;
};

const emptyForm: FormData = {
  name: "",
  username: "",
  email: "",
  role: "apuppt",
  ptId: "",
  password: "",
};

export default function UserManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: pts } = useListPts();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<UserEntry | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [resetPassword, setResetPassword] = useState("");
  const [formError, setFormError] = useState("");

  const { data: users, isLoading } = useQuery<UserEntry[]>({
    queryKey: ["users-management"],
    queryFn: () => apiFetch("/api/users"),
    enabled: user?.role === "superadmin",
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          username: data.username,
          email: data.email,
          role: data.role,
          ptId: ROLES_NEEDING_PT.includes(data.role) && data.ptId ? data.ptId : null,
          password: data.password,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-management"] });
      closeModal();
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FormData> }) =>
      apiFetch(`/api/users/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          role: data.role,
          ptId: data.role && ROLES_NEEDING_PT.includes(data.role) && data.ptId ? data.ptId : null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-management"] });
      closeModal();
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/users/${id}/deactivate`, { method: "PATCH" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users-management"] }),
    onError: (e: Error) => alert(e.message),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/users/${id}/activate`, { method: "PATCH" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users-management"] }),
    onError: (e: Error) => alert(e.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ userId, newPassword }),
      }),
    onSuccess: () => {
      closeModal();
      alert("Password berhasil direset.");
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const closeModal = () => {
    setModalMode(null);
    setSelectedUser(null);
    setFormData(emptyForm);
    setResetPassword("");
    setFormError("");
  };

  const openCreate = () => {
    setFormData(emptyForm);
    setFormError("");
    setModalMode("create");
  };

  const openEdit = (u: UserEntry) => {
    setSelectedUser(u);
    setFormData({
      name: u.name,
      username: u.username,
      email: u.email,
      role: u.role,
      ptId: u.ptId ?? "",
      password: "",
    });
    setFormError("");
    setModalMode("edit");
  };

  const openResetPassword = (u: UserEntry) => {
    setSelectedUser(u);
    setResetPassword("");
    setFormError("");
    setModalMode("reset-password");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (modalMode === "create") {
      createMutation.mutate(formData);
    } else if (modalMode === "edit" && selectedUser) {
      updateMutation.mutate({ id: selectedUser.id, data: formData });
    } else if (modalMode === "reset-password" && selectedUser) {
      if (!resetPassword || resetPassword.length < 6) {
        setFormError("Password minimal 6 karakter.");
        return;
      }
      resetPasswordMutation.mutate({ userId: selectedUser.id, newPassword: resetPassword });
    }
  };

  if (user?.role !== "superadmin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 text-sm">Akses ditolak.</div>
      </div>
    );
  }

  const isPending =
    createMutation.isPending || updateMutation.isPending || resetPasswordMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Manajemen User</h1>
              <p className="text-sm text-slate-500 mt-0.5">Kelola akun pengguna sistem</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah User
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : !users || users.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">Belum ada user terdaftar.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Nama</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Username</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide hidden lg:table-cell">PT</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${!u.isActive ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{u.username}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[u.role] ?? "bg-slate-100 text-slate-700"}`}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                        {u.ptName ? (
                          <span className="text-xs">{u.ptCode} — {u.ptName}</span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Aktif</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Nonaktif</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(u)}
                            title="Edit"
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openResetPassword(u)}
                            title="Reset Password"
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          {u.isActive ? (
                            <button
                              onClick={() => {
                                if (confirm(`Nonaktifkan user ${u.name}?`)) {
                                  deactivateMutation.mutate(u.id);
                                }
                              }}
                              title="Nonaktifkan"
                              disabled={u.id === user?.id || deactivateMutation.isPending}
                              className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (confirm(`Aktifkan kembali user ${u.name}?`)) {
                                  activateMutation.mutate(u.id);
                                }
                              }}
                              title="Aktifkan"
                              disabled={activateMutation.isPending}
                              className="p-1.5 rounded hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors disabled:opacity-30"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                {modalMode === "create" && "Tambah User Baru"}
                {modalMode === "edit" && "Edit User"}
                {modalMode === "reset-password" && "Reset Password"}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
              {modalMode === "reset-password" && selectedUser ? (
                <>
                  <p className="text-sm text-slate-600">
                    Reset password untuk <strong>{selectedUser.name}</strong> ({selectedUser.username})
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Password Baru</label>
                    <input
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      minLength={6}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label htmlFor="user-name" className="block text-xs font-medium text-slate-600 mb-1">Nama Lengkap</label>
                      <input
                        id="user-name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        minLength={2}
                      />
                    </div>
                    {modalMode === "create" && (
                      <div>
                        <label htmlFor="user-username" className="block text-xs font-medium text-slate-600 mb-1">Username</label>
                        <input
                          id="user-username"
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData((f) => ({ ...f, username: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          minLength={3}
                        />
                      </div>
                    )}
                    <div className={modalMode === "create" ? "" : "col-span-2"}>
                      <label htmlFor="user-email" className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                      <input
                        id="user-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="user-role" className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                      <select
                        id="user-role"
                        value={formData.role}
                        onChange={(e) => setFormData((f) => ({ ...f, role: e.target.value, ptId: "" }))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        required
                      >
                        <option value="apuppt">APUPPT</option>
                        <option value="dk">DK</option>
                        <option value="du">DU</option>
                        <option value="owner">Owner</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    </div>
                    {ROLES_NEEDING_PT.includes(formData.role) && (
                      <div>
                        <label htmlFor="user-pt" className="block text-xs font-medium text-slate-600 mb-1">PT</label>
                        <select
                          id="user-pt"
                          value={formData.ptId}
                          onChange={(e) => setFormData((f) => ({ ...f, ptId: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">— Pilih PT —</option>
                          {pts?.map((pt) => (
                            <option key={pt.id} value={pt.id}>{pt.code} — {pt.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {modalMode === "create" && (
                      <div className="col-span-2">
                        <label htmlFor="user-password" className="block text-xs font-medium text-slate-600 mb-1">Password Awal</label>
                        <input
                          id="user-password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                          placeholder="Minimal 6 karakter"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          minLength={6}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {formError && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {modalMode === "create" ? "Tambah" : modalMode === "edit" ? "Simpan" : "Reset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
