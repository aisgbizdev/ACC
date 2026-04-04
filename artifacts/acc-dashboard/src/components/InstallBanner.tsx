import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "acc-install-dismissed";

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 left-4 right-4 z-40 flex items-start gap-3 rounded-[28px] border border-sky-500/15 bg-[#0c1526] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)] animate-in slide-in-from-bottom-2 sm:bottom-4 sm:left-auto sm:right-4 sm:w-[380px]">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-500/15">
        <span className="text-white text-xs font-bold">ACC</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">Install ACC di HP Anda</p>
        <p className="mt-0.5 text-xs text-slate-400">Akses lebih cepat tanpa membuka browser</p>
        <button
          onClick={handleInstall}
          className="mt-3 flex items-center gap-1.5 rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400"
        >
          <Download className="w-3.5 h-3.5" />
          Install
        </button>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-0.5 text-slate-500 transition-colors hover:text-slate-300"
        aria-label="Tutup"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
