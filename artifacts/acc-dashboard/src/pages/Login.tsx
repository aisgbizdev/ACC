import { useState } from "react";
import { Redirect, Link } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { login } from "@workspace/api-client-react";
import { useAuth, UserRole } from "@/contexts/AuthContext";

const ACCOUNT_GROUPS = [
  {
    group: "Solid Gold Berjangka (SGB)",
    items: [
      { username: "apuppt.sgb", label: "APUPPT — SGB" },
      { username: "dk.sgb",     label: "DK — SGB" },
      { username: "du.sgb",     label: "DU — SGB" },
    ],
  },
  {
    group: "Rifan Financindo Berjangka (RFB)",
    items: [
      { username: "apuppt.rfb", label: "APUPPT — RFB" },
      { username: "dk.rfb",     label: "DK — RFB" },
      { username: "du.rfb",     label: "DU — RFB" },
    ],
  },
  {
    group: "Best Profit Futures (BPF)",
    items: [
      { username: "apuppt.bpf", label: "APUPPT — BPF" },
      { username: "dk.bpf",     label: "DK — BPF" },
      { username: "du.bpf",     label: "DU — BPF" },
    ],
  },
  {
    group: "Kontak Perkasa Futures (KPF)",
    items: [
      { username: "apuppt.kpf", label: "APUPPT — KPF" },
      { username: "dk.kpf",     label: "DK — KPF" },
      { username: "du.kpf",     label: "DU — KPF" },
    ],
  },
  {
    group: "Equity World Futures (EWF)",
    items: [
      { username: "apuppt.ewf", label: "APUPPT — EWF" },
      { username: "dk.ewf",     label: "DK — EWF" },
      { username: "du.ewf",     label: "DU — EWF" },
    ],
  },
  {
    group: "————————————",
    items: [
      { username: "owner",      label: "Owner" },
      { username: "superadmin", label: "Superadmin" },
    ],
  },
];

export default function Login() {
  const { user, loading, setUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 text-sm">Memuat...</div>
      </div>
    );
  }

  if (user) {
    if (user.ptId) {
      return <Redirect to={`/pt/${user.ptId}`} />;
    }
    return <Redirect to="/dashboard" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await login({ username, password, rememberMe });
      setUser({
        id: data.id,
        name: data.name,
        username: data.username,
        email: data.email,
        role: data.role as UserRole,
        ptId: data.ptId ?? null,
        avatarUrl: ((data as unknown) as Record<string, unknown>).avatarUrl as string | null ?? null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login gagal. Periksa username dan password Anda.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-lg font-bold text-white">ACC</span>
          </div>
          <h1 className="text-xl font-bold text-white">APUPPT Control Center</h1>
          <p className="mt-1 text-sm text-slate-400">Masuk ke akun Anda</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Jabatan / Akun</label>
              <select
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
              >
                <option value="" disabled>— Pilih akun —</option>
                {ACCOUNT_GROUPS.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.items.map((acc) => (
                      <option key={acc.username} value={acc.username}>
                        {acc.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-blue-500"
                />
                <span className="text-xs text-slate-400">Ingat Saya</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Lupa Password?
              </Link>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg px-3 py-2.5 text-xs text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
            >
              {submitting ? "Memproses..." : "Masuk"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">Password semua akun: <span className="font-mono text-slate-400">password123</span></p>
      </div>
    </div>
  );
}
