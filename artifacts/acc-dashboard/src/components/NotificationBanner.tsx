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
    <div className="border-b border-white/6 bg-[#08111f] px-4 py-3 md:px-8">
      <div className="flex items-center justify-between gap-3 rounded-[24px] border border-sky-500/15 bg-sky-500/[0.05] px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Bell className="w-5 h-5 text-sky-300 shrink-0" />
        <p className="text-sm text-slate-200 leading-tight">
          Aktifkan notifikasi untuk mendapat update real-time tentang aktivitas dan temuan.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleEnable}
          disabled={loading}
          className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-60"
        >
          {loading ? "Memproses..." : "Aktifkan"}
        </button>
        <button
          onClick={handleDismiss}
          className="text-slate-500 hover:text-white transition-colors"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      </div>
    </div>
  );
}
