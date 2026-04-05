import { type ElementType } from "react";
import { Link } from "wouter";
import { useGetDashboardSummary } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileBarChart,
  FileCheck2,
  FileText,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";

const STATUS_ORDER: Record<string, number> = { red: 0, yellow: 1, green: 2 };

const STATUS_THEME = {
  green: {
    label: "Hijau",
    dot: "bg-emerald-400",
    badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    text: "text-emerald-300",
  },
  yellow: {
    label: "Kuning",
    dot: "bg-amber-400",
    badge: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    text: "text-amber-300",
  },
  red: {
    label: "Merah",
    dot: "bg-rose-400",
    badge: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    text: "text-rose-300",
  },
};

type PtStatus = {
  id: string;
  code: string;
  name: string;
  status: string;
  consecutiveRedDays: number;
  overdueCount: number;
  openFindingsCount: number;
  lastActivityDate?: string | null;
};

type QuickAction = {
  href: string;
  label: string;
  desc: string;
  icon: ElementType;
  roles: string[];
};

const QUICK_ACTIONS: QuickAction[] = [
  { href: "/activity", label: "Input Aktivitas", desc: "Laporan harian", icon: FileText, roles: ["apuppt"] },
  { href: "/activities", label: "Aktivitas", desc: "Daftar laporan", icon: ClipboardList, roles: ["dk", "superadmin"] },
  { href: "/findings", label: "Temuan", desc: "Kelola tiket", icon: AlertTriangle, roles: ["apuppt", "dk", "du", "owner", "superadmin"] },
  { href: "/review", label: "Review DK", desc: "Validasi update", icon: ClipboardCheck, roles: ["dk", "superadmin"] },
  { href: "/signoff", label: "Sign-Off DU", desc: "Final approval", icon: FileCheck2, roles: ["du", "superadmin"] },
  { href: "/reports", label: "Laporan", desc: "Lihat ringkasan", icon: FileBarChart, roles: ["dk", "du", "owner", "superadmin"] },
];

function formatLastUpdate(lastActivityDate: string | null | undefined): string {
  if (!lastActivityDate) return "Belum pernah update";
  const d = new Date(`${lastActivityDate}T00:00:00`);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function getStatusDetail(pt: PtStatus): string {
  const today = new Date().toISOString().split("T")[0];
  const isUpdatedToday = pt.lastActivityDate === today;

  if (pt.status === "red") {
    const parts: string[] = [];
    if (!isUpdatedToday) parts.push("Belum update hari ini");
    if (pt.overdueCount > 0) parts.push(`${pt.overdueCount} overdue`);
    if (pt.openFindingsCount > 0) parts.push(`${pt.openFindingsCount} terbuka`);
    return parts.join(" • ") || "Status kritis";
  }

  if (pt.status === "yellow") {
    if (pt.overdueCount > 0) return `${pt.overdueCount} temuan overdue`;
    if (pt.openFindingsCount > 0) return `${pt.openFindingsCount} temuan terbuka`;
    return "Perlu perhatian";
  }

  return "Update aman";
}

function StatusMeter({
  label,
  value,
  total,
  tone,
  href,
}: {
  label: string;
  value: number;
  total: number;
  tone: "green" | "yellow" | "red";
  href?: string;
}) {
  const pct = total === 0 ? 0 : Math.max(6, Math.round((value / total) * 100));
  const color =
    tone === "green"
      ? "from-emerald-400 to-emerald-500"
      : tone === "yellow"
        ? "from-amber-400 to-amber-500"
        : "from-rose-400 to-rose-500";

  const inner = (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/6">
        <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-xl p-2 -mx-2 transition-colors hover:bg-white/[0.03]">
        {inner}
      </Link>
    );
  }
  return inner;
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: number;
  icon: ElementType;
  tone: "blue" | "green" | "amber" | "rose";
  href?: string;
}) {
  const toneClasses = {
    blue: "bg-sky-500/10 text-sky-300",
    green: "bg-emerald-500/10 text-emerald-300",
    amber: "bg-amber-500/10 text-amber-300",
    rose: "bg-rose-500/10 text-rose-300",
  };

  const inner = (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <p className="mt-3 text-5xl font-semibold tracking-tight text-white">{value}</p>
      </div>
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-[28px] border border-white/8 bg-[#0b1525] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.28)] transition-colors hover:border-white/14 hover:bg-[#0d1a2f]">
        {inner}
      </Link>
    );
  }

  return (
    <div className="rounded-[28px] border border-white/8 bg-[#0b1525] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
      {inner}
    </div>
  );
}

function QuickActionRail({ role }: { role: string }) {
  const items = QUICK_ACTIONS.filter((item) => item.roles.includes(role));
  if (items.length === 0) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-[26px] border border-white/8 bg-[#0b1525] px-5 py-4 transition-all hover:border-sky-400/30 hover:bg-[#0d192d]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useGetDashboardSummary();

  const sortedPTs: PtStatus[] = data?.ptStatuses
    ? [...data.ptStatuses].sort((a, b) => {
        const aOrder = STATUS_ORDER[a.status] ?? 2;
        const bOrder = STATUS_ORDER[b.status] ?? 2;
        if (aOrder !== bOrder) return aOrder - bOrder;
        if (a.consecutiveRedDays !== b.consecutiveRedDays) return b.consecutiveRedDays - a.consecutiveRedDays;
        if (a.overdueCount !== b.overdueCount) return b.overdueCount - a.overdueCount;
        return a.code.localeCompare(b.code);
      })
    : [];

  const totalPts = sortedPTs.length;
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const firstName = user?.name?.split(" ")[0] ?? "User";
  const totalOpenFindings = sortedPTs.reduce((sum, pt) => sum + pt.openFindingsCount, 0);
  const totalOverdue = sortedPTs.reduce((sum, pt) => sum + pt.overdueCount, 0);
  const overduePts = sortedPTs.filter((pt) => pt.overdueCount > 0);
  const redStreakPts = sortedPTs.filter((pt) => pt.consecutiveRedDays >= 2);
  const ptSubtitle =
    user?.role === "apuppt"
      ? sortedPTs[0]
        ? `${sortedPTs[0].code} • ${sortedPTs[0].name}`
        : "Status PT Anda"
      : "Overview tim untuk seluruh PT";

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#040914] px-4 py-6 md:px-8 md:py-8">
        <div className="flex min-h-[60vh] items-center justify-center rounded-[32px] border border-white/6 bg-[#08111f]">
          <p className="text-sm text-slate-500">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#040914] px-4 py-6 md:px-8 md:py-8">
        <div className="flex min-h-[60vh] items-center justify-center rounded-[32px] border border-white/6 bg-[#08111f]">
          <p className="text-sm text-slate-500">Tidak ada data dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#040914] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[36px] border border-white/6 bg-[#060d19] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.35)] md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.28em] text-slate-500">{today}</p>
              <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
                Dashboard Operasional
              </h1>
              <p className="mt-3 max-w-2xl text-base text-slate-400">
                Ringkasan cepat untuk {firstName}. {ptSubtitle}
              </p>
            </div>

            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/[0.05] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {user?.role === "apuppt" && sortedPTs[0] ? (
            <>
              <StatCard label="PT Saya" value={1} icon={Users} tone="blue" href={`/pt/${sortedPTs[0].id}`} />
              <StatCard label="Status Hijau" value={data.greenCount} icon={CheckCircle2} tone="green" href={`/pt/${sortedPTs[0].id}`} />
              <StatCard label="Perlu Perhatian" value={data.yellowCount} icon={Clock3} tone="amber" href="/findings" />
              <StatCard label="Status Kritis" value={data.redCount} icon={ShieldAlert} tone="rose" href="/findings" />
            </>
          ) : (
            <>
              <StatCard label="Total PT" value={totalPts} icon={Users} tone="blue" href="/reports" />
              <StatCard label="Status Hijau" value={data.greenCount} icon={CheckCircle2} tone="green" href="/kpi" />
              <StatCard label="Perlu Perhatian" value={data.yellowCount} icon={Clock3} tone="amber" href="/findings" />
              <StatCard label="Status Kritis" value={data.redCount} icon={ShieldAlert} tone="rose" href="/findings" />
            </>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="rounded-[30px] border border-white/8 bg-[#0b1525] p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ringkasan Status</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Situasi Operasional Hari Ini</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300">
                <Activity className="h-5 w-5" />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5">
                <StatusMeter label="PT Aman" value={data.greenCount} total={Math.max(totalPts, 1)} tone="green" href={user?.role === "apuppt" && sortedPTs[0] ? `/pt/${sortedPTs[0].id}` : "/kpi"} />
                <StatusMeter label="Perlu Perhatian" value={data.yellowCount} total={Math.max(totalPts, 1)} tone="yellow" href="/findings" />
                <StatusMeter label="Kritis" value={data.redCount} total={Math.max(totalPts, 1)} tone="red" href="/findings" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <Link href="/findings" className="block rounded-[24px] border border-white/6 bg-[#0e1a2d] p-4 transition-colors hover:border-white/12 hover:bg-[#111f35]">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Temuan Terbuka</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{totalOpenFindings}</p>
                  <p className="mt-2 text-sm text-slate-400">Total tiket aktif lintas PT.</p>
                </Link>
                <Link href="/findings" className="block rounded-[24px] border border-white/6 bg-[#0e1a2d] p-4 transition-colors hover:border-amber-500/20 hover:bg-amber-500/5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Deadline Lewat</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{totalOverdue}</p>
                  <p className="mt-2 text-sm text-slate-400">Fokus utama untuk penanganan cepat.</p>
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/8 bg-[#0b1525] p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Perlu Perhatian</p>
                <h2 className="text-2xl font-semibold text-white">Panel Prioritas</h2>
              </div>
            </div>

            <div className="space-y-3">
              {overduePts.length === 0 && redStreakPts.length === 0 ? (
                <div className="rounded-[24px] border border-emerald-500/10 bg-emerald-500/5 p-4 text-sm text-emerald-300">
                  Tidak ada prioritas kritis saat ini.
                </div>
              ) : (
                <>
                  {redStreakPts.slice(0, 5).map((pt) => (
                    <Link
                      key={`red-${pt.id}`}
                      href={`/pt/${pt.id}`}
                      className="flex items-center justify-between rounded-[22px] border border-rose-500/10 bg-rose-500/[0.05] px-4 py-3 transition-colors hover:bg-rose-500/[0.08]"
                    >
                      <div>
                        <p className="font-semibold text-white">{pt.code}</p>
                        <p className="text-sm text-slate-400">{pt.name}</p>
                      </div>
                      <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
                        Merah {pt.consecutiveRedDays} hari
                      </span>
                    </Link>
                  ))}

                  {overduePts.slice(0, 5).map((pt) => (
                    <Link
                      key={`overdue-${pt.id}`}
                      href={`/pt/${pt.id}`}
                      className="flex items-center justify-between rounded-[22px] border border-amber-500/10 bg-amber-500/[0.05] px-4 py-3 transition-colors hover:bg-amber-500/[0.08]"
                    >
                      <div>
                        <p className="font-semibold text-white">{pt.code}</p>
                        <p className="text-sm text-slate-400">{pt.name}</p>
                      </div>
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                        {pt.overdueCount} overdue
                      </span>
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
        </section>

        {user && (
          <section className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Akses Cepat</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Navigasi Kerja Harian</h2>
            </div>
            <QuickActionRail role={user.role} />
          </section>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
          <div className="overflow-hidden rounded-[30px] border border-white/8 bg-[#0b1525]">
            <div className="flex items-center justify-between border-b border-white/6 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Daftar PT</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Status PT Saat Ini</h2>
              </div>
              <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-slate-400">
                {sortedPTs.length} PT
              </span>
            </div>

            <div className="divide-y divide-white/6">
              {sortedPTs.map((pt) => {
                const theme =
                  STATUS_THEME[pt.status as keyof typeof STATUS_THEME] ?? STATUS_THEME.red;

                return (
                  <Link
                    key={pt.id}
                    href={`/pt/${pt.id}`}
                    className="grid gap-3 px-6 py-5 transition-colors hover:bg-white/[0.025] md:grid-cols-[140px_1fr_auto]"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`h-3 w-3 rounded-full ${theme.dot}`} />
                      <div>
                        <p className="text-lg font-semibold text-white">{pt.code}</p>
                        <p className="text-xs text-slate-500">{theme.label}</p>
                      </div>
                    </div>

                    <div>
                      <p className="font-medium text-slate-200">{pt.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{getStatusDetail(pt)}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Update terakhir: {formatLastUpdate(pt.lastActivityDate)}
                      </p>
                    </div>

                    <div className="flex items-start md:justify-end">
                      <div className="flex flex-wrap gap-2">
                        {pt.consecutiveRedDays >= 2 && (
                          <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
                            {pt.consecutiveRedDays} hari merah
                          </span>
                        )}
                        {pt.overdueCount > 0 && (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                            {pt.overdueCount} overdue
                          </span>
                        )}
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${theme.badge}`}>
                          {theme.label}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-white/8 bg-[#0b1525] p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Distribusi</p>
                  <h2 className="text-2xl font-semibold text-white">Status Count</h2>
                </div>
              </div>

              <div className="space-y-4">
                {([
                  ["Hijau", data.greenCount, "green", "/kpi"],
                  ["Kuning", data.yellowCount, "yellow", "/findings"],
                  ["Merah", data.redCount, "red", "/findings"],
                ] as const).map(([label, value, tone, href]) => (
                  <Link key={label} href={href} className="block rounded-[22px] border border-white/6 bg-[#0e1a2d] p-4 transition-colors hover:border-white/12 hover:bg-[#111f35]">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-slate-300">{label}</span>
                      <span className="text-2xl font-semibold text-white">{value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/6">
                      <div
                        className={`h-full rounded-full ${
                          tone === "green"
                            ? "bg-emerald-400"
                            : tone === "yellow"
                              ? "bg-amber-400"
                              : "bg-rose-400"
                        }`}
                        style={{
                          width: `${totalPts === 0 ? 0 : Math.max(8, Math.round((value / totalPts) * 100))}%`,
                        }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/8 bg-[#0b1525] p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ringkasan Cepat</p>
                  <h2 className="text-2xl font-semibold text-white">Highlight Operasional</h2>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <Link href={user?.role === "apuppt" && sortedPTs[0] ? `/pt/${sortedPTs[0].id}` : "/kpi"} className="flex items-center justify-between rounded-[22px] border border-white/6 bg-[#0e1a2d] px-4 py-3 text-slate-300 transition-colors hover:border-emerald-500/20 hover:bg-emerald-500/5 hover:text-white">
                  <span>PT aman</span>
                  <span className="font-semibold text-emerald-400">{data.greenCount}</span>
                </Link>
                <Link href="/findings" className="flex items-center justify-between rounded-[22px] border border-white/6 bg-[#0e1a2d] px-4 py-3 text-slate-300 transition-colors hover:border-amber-500/20 hover:bg-amber-500/5 hover:text-white">
                  <span>Perlu perhatian</span>
                  <span className="font-semibold text-amber-400">{data.yellowCount}</span>
                </Link>
                <Link href="/findings" className="flex items-center justify-between rounded-[22px] border border-white/6 bg-[#0e1a2d] px-4 py-3 text-slate-300 transition-colors hover:border-rose-500/20 hover:bg-rose-500/5 hover:text-white">
                  <span>Kritis</span>
                  <span className="font-semibold text-rose-400">{data.redCount}</span>
                </Link>
                <Link href="/findings" className="flex items-center justify-between rounded-[22px] border border-white/6 bg-[#0e1a2d] px-4 py-3 text-slate-300 transition-colors hover:border-white/12 hover:bg-[#111f35] hover:text-white">
                  <span>Total temuan terbuka</span>
                  <span className="font-semibold text-white">{totalOpenFindings}</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
