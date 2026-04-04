import { Bell, BellOff, CheckCircle, Info } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/contexts/AuthContext";

const ROLE_DESCRIPTIONS: Record<string, { label: string; items: string[] }> = {
  apuppt: {
    label: "APUPPT",
    items: [
      "Ada komentar baru di tiket PT Anda",
      "Tiket di-assign kepada Anda",
    ],
  },
  dk: {
    label: "DK (Divisi Kepatuhan)",
    items: [
      "APUPPT PT Anda menginput aktivitas baru",
      "Ada tiket/temuan baru di PT Anda",
      "Ada komentar baru di tiket PT Anda",
      "PT yang diawasi belum update hari ini (17.00 WIB)",
    ],
  },
  du: {
    label: "DU (Direktur Utama)",
    items: [
      "PT berstatus Merah (belum update atau ada temuan overdue)",
    ],
  },
  owner: {
    label: "Owner",
    items: [
      "Ada PT berstatus Merah",
      "Ada tiket baru",
      "Ringkasan harian pukul 17.00 WIB",
    ],
  },
  superadmin: {
    label: "Super Admin",
    items: [
      "Ada PT berstatus Merah",
      "Ada tiket baru",
      "Ringkasan harian pukul 17.00 WIB",
      "Semua notifikasi sistem",
    ],
  },
};

export default function NotificationSettings() {
  const { user } = useAuth();
  const { permission, subscribed, loading, isSupported, subscribe, unsubscribe } = usePushNotifications();

  const roleInfo = user ? ROLE_DESCRIPTIONS[user.role] : null;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pengaturan Notifikasi</h1>

      {!isSupported && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <Info className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-yellow-800">Browser tidak mendukung</p>
            <p className="text-sm text-yellow-700 mt-1">
              Browser Anda tidak mendukung push notification. Gunakan Chrome, Edge, atau Firefox terbaru, atau install PWA di HP Anda.
            </p>
          </div>
        </div>
      )}

      {isSupported && permission === "denied" && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <BellOff className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-red-800">Notifikasi diblokir</p>
            <p className="text-sm text-red-700 mt-1">
              Anda telah memblokir notifikasi. Untuk mengaktifkan kembali, buka pengaturan browser dan izinkan notifikasi untuk situs ini, lalu muat ulang halaman.
            </p>
          </div>
        </div>
      )}

      {isSupported && permission !== "denied" && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {subscribed ? (
                <Bell className="w-6 h-6 text-green-600" />
              ) : (
                <BellOff className="w-6 h-6 text-gray-400" />
              )}
              <div>
                <p className="font-medium text-gray-900">
                  {subscribed ? "Notifikasi Aktif" : "Notifikasi Tidak Aktif"}
                </p>
                <p className="text-sm text-gray-500">
                  {subscribed
                    ? "Anda akan menerima push notification di perangkat ini"
                    : "Aktifkan untuk mendapat update real-time"}
                </p>
              </div>
            </div>
            <button
              onClick={subscribed ? unsubscribe : subscribe}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
                subscribed
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {loading ? "Memproses..." : subscribed ? "Nonaktifkan" : "Aktifkan"}
            </button>
          </div>
        </div>
      )}

      {roleInfo && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            Notifikasi untuk {roleInfo.label}
          </h2>
          <ul className="space-y-2">
            {roleInfo.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-blue-400 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6 text-center">
        Push notification hanya bekerja pada perangkat yang telah menginstall PWA atau membuka aplikasi di browser yang mendukung.
      </p>
    </div>
  );
}
