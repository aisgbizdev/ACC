import { Link } from "wouter";
import { KeyRound, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/logo-apu.png" alt="Logo APU" className="w-12 h-12 rounded-xl object-cover mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white">APUPPT Control Center</h1>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="text-base font-semibold text-white">Lupa Password</h2>
          </div>

          <p className="text-sm text-slate-300 mb-4">
            Reset password tidak dapat dilakukan secara mandiri. Silakan hubungi <span className="font-semibold text-white">Superadmin</span> untuk mereset password Anda.
          </p>

          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 mb-4">
            <p className="text-xs text-slate-400 mb-2 font-medium">Kontak Superadmin:</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Username Superadmin</span>
              <span className="text-xs font-mono text-white bg-slate-700 px-2 py-0.5 rounded">superadmin</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Sampaikan username Anda kepada Superadmin. Setelah password direset, segera ganti password Anda melalui menu <span className="text-slate-400">Ubah Password</span>.
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Login
          </Link>
        </div>
      </div>
    </div>
  );
}
