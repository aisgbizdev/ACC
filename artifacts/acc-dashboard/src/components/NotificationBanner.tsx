import { useState } from "react";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function NotificationBanner() {
  const { permission, subscribed, loading, isSupported, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem("notif-banner-dismissed") === "true";
  });

  if (!isSupported) return null;
  if (permission === "granted" && subscribed) return null;
  if (permission === "denied") return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("notif-banner-dismissed", "true");
    setDismissed(true);
  };

  const handleEnable = async () => {
    const ok = await subscribe();
    if (ok) {
      setDismissed(true);
    }
  };

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Bell className="w-5 h-5 text-blue-600 shrink-0" />
        <p className="text-sm text-blue-800 leading-tight">
          Aktifkan notifikasi untuk mendapat update real-time tentang aktivitas dan temuan.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleEnable}
          disabled={loading}
          className="text-sm font-medium bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {loading ? "Memproses..." : "Aktifkan"}
        </button>
        <button
          onClick={handleDismiss}
          className="text-blue-500 hover:text-blue-700 transition-colors"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
