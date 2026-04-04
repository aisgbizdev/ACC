import { useState, useRef } from "react";
import { Camera, User, KeyRound, CheckCircle, Eye, EyeOff, Pencil, X } from "lucide-react";
import { changePassword } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Redirect } from "wouter";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const ROLE_LABELS: Record<string, string> = {
  apuppt: "APUPPT",
  dk: "DK (Direktur Kepatuhan)",
  du: "DU (Direktur Utama)",
  owner: "Owner",
  superadmin: "Superadmin",
};

export default function Profile() {
  const { user, loading, setUser, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState("");

  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState("");

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-slate-500 text-sm">Memuat...</div></div>;
  if (!user) return <Redirect to="/login" />;

  const avatarSrc = user.avatarUrl ? `${API_BASE}${user.avatarUrl}?t=${Date.now()}` : null;

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Ukuran foto maksimal 2MB.");
      return;
    }
    setAvatarError("");
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch(`${API_BASE}/api/auth/profile/avatar`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Gagal mengunggah foto.");
      const data = await res.json() as { avatarUrl?: string | null };
      setUser({ ...user, avatarUrl: data.avatarUrl ?? null });
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Gagal mengunggah foto.");
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleEditName = () => {
    setNameValue(user.name);
    setEditingName(true);
    setNameSuccess(false);
    setNameError("");
  };

  const handleSaveName = async () => {
    if (!nameValue.trim() || nameValue.trim().length < 2) {
      setNameError("Nama minimal 2 karakter.");
      return;
    }
    setNameLoading(true);
    setNameError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: nameValue.trim() }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan nama.");
      const data = await res.json() as { name: string };
      setUser({ ...user, name: data.name });
      setEditingName(false);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Gagal menyimpan nama.");
    } finally {
      setNameLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (newPassword !== confirmPassword) {
      setPwError("Password baru tidak cocok.");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("Password baru minimal 6 karakter.");
      return;
    }
    setPwLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Gagal mengubah password.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Profil Saya</h1>

      {/* Avatar & Identity */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              onClick={handleAvatarClick}
              className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-slate-300 hover:border-blue-400 transition-colors group"
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-400 group-hover:text-blue-400 transition-colors" />
              )}
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
            {avatarLoading && (
              <div className="absolute inset-0 bg-white/70 rounded-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Info + Name Edit */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {editingName ? (
                <div className="flex items-center gap-1.5 w-full">
                  <input
                    autoFocus
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                    className="flex-1 text-base font-semibold text-slate-800 bg-slate-50 border border-blue-400 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Nama lengkap"
                  />
                  <button onClick={handleSaveName} disabled={nameLoading} className="p-1 rounded text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors">
                    {nameLoading ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                  <button onClick={() => { setEditingName(false); setNameError(""); }} className="p-1 rounded text-slate-400 hover:bg-slate-50 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-base font-semibold text-slate-800 truncate">{user.name}</span>
                  <button onClick={handleEditName} className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors flex-shrink-0">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {nameSuccess && <span className="text-xs text-green-600 font-medium">Tersimpan!</span>}
                </>
              )}
            </div>
            {nameError && <p className="text-xs text-red-500 mb-1">{nameError}</p>}
            <p className="text-sm text-slate-500 mb-1">@{user.username}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
        </div>

        {avatarError && (
          <p className="mt-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{avatarError}</p>
        )}
        <p className="mt-3 text-xs text-slate-400">Klik foto untuk menggantinya. Format JPG/PNG, maks. 2MB.</p>
      </div>

      {/* Info Akun */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" />
          Informasi Akun
        </h2>
        <div className="space-y-3">
          {[
            { label: "Username", value: user.username },
            { label: "Email", value: user.email },
            { label: "Jabatan", value: ROLE_LABELS[user.role] ?? user.role },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
              <span className="text-xs text-slate-500">{label}</span>
              <span className="text-xs font-medium text-slate-800">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ganti Password */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-slate-400" />
          Ganti Password
        </h2>

        {pwSuccess ? (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">Password berhasil diubah</p>
              <p className="text-xs text-green-600">Gunakan password baru saat login berikutnya.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            {[
              { label: "Password Saat Ini", value: currentPassword, setter: setCurrentPassword, show: showCurrent, toggler: () => setShowCurrent(!showCurrent) },
              { label: "Password Baru", value: newPassword, setter: setNewPassword, show: showNew, toggler: () => setShowNew(!showNew), hint: "Minimal 6 karakter" },
              { label: "Konfirmasi Password Baru", value: confirmPassword, setter: setConfirmPassword, show: showConfirm, toggler: () => setShowConfirm(!showConfirm) },
            ].map(({ label, value, setter, show, toggler, hint }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 pr-10 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button type="button" onClick={toggler} tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
              </div>
            ))}

            {pwError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-600">{pwError}</div>
            )}

            <button
              type="submit"
              disabled={pwLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
            >
              {pwLoading ? "Menyimpan..." : "Ganti Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
