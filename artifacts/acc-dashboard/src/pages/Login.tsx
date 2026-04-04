import { useState } from "react";
import { Redirect } from "wouter";
import { login } from "@workspace/api-client-react";
import { useAuth, UserRole } from "@/contexts/AuthContext";

export default function Login() {
  const { user, loading, setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    if (user.role === "apuppt" && user.ptId) {
      return <Redirect to={`/pt/${user.ptId}`} />;
    }
    return <Redirect to="/dashboard" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await login({ email, password });
      setUser({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role as UserRole,
        ptId: data.ptId ?? null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login gagal. Periksa email dan password Anda.";
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
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="nama@acc.local"
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
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

        <div className="mt-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-xs text-slate-400 font-medium mb-2">Akun untuk testing:</p>
          <div className="space-y-1.5 text-xs text-slate-500">
            <div className="flex justify-between"><span>APUPPT SGB</span><span>apuppt.sgb@acc.local</span></div>
            <div className="flex justify-between"><span>DK</span><span>dk@acc.local</span></div>
            <div className="flex justify-between"><span>DU</span><span>du@acc.local</span></div>
            <div className="flex justify-between"><span>Owner</span><span>owner@acc.local</span></div>
            <div className="flex justify-between pt-1 border-t border-slate-700 text-slate-400"><span>Password semua:</span><span className="font-mono">password123</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
