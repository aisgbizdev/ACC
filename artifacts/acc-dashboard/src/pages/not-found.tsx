import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md mx-4 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex mb-4 gap-2 items-center">
          <AlertCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
          <h1 className="text-2xl font-bold text-slate-900">404 Halaman Tidak Ditemukan</h1>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Halaman yang Anda cari tidak tersedia.
        </p>
      </div>
    </div>
  );
}
