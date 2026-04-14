import { useState } from "react";
import {
  useListActivities,
  useListPts,
  useSignOffActivity,
  getListActivitiesQueryKey,
  type DailyActivity,
  type ErrorType,
  type ErrorResponse,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FileCheck2, Building2, Users, CheckCircle2, Clock, Paperclip, Download } from "lucide-react";
import { detectActivityScope, stripActivityScopeTag, extractActivityInputTime } from "@/lib/activity-scope";
import { getActivityDocuments, formatFileSize } from "@/lib/activity-documents";
import { getBaseUrl } from "@/lib/api";

const ACTIVITY_LABELS: Record<string, string> = {
  kyc: "KYC",
  cdd: "CDD",
  screening: "Screening",
  monitoring_transaksi: "Monitoring Transaksi",
  pelaporan: "Pelaporan",
  sosialisasi: "Sosialisasi APUPPT",
  lainnya: "Lainnya",
  libur: "Hari Libur",
};

function getDisplayInputTime(notes?: string | null, createdAt?: string): string {
  const fromNotes = extractActivityInputTime(notes);
  if (fromNotes) return fromNotes;
  if (!createdAt) return "--:--";
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return "--:--";
  return parsed.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default function DUSignOff() {
  const queryClient = useQueryClient();
  const [filterPt, setFilterPt] = useState("");
  const [filterScope, setFilterScope] = useState<"" | "daily" | "monthly" | "quarterly">("");
  const [filterTab, setFilterTab] = useState<"pending" | "approved" | "closed">("pending");

  const activityParams: Record<string, string> = {};
  if (filterPt) activityParams.ptId = filterPt;
  activityParams.reviewStatus =
    filterTab === "pending"
      ? "pending_review"
      : filterTab === "approved"
        ? "reviewed"
        : "signed_off";

  const { data: activities, isLoading } = useListActivities(activityParams);
  const { data: pts } = useListPts();
  const filteredActivities = (activities ?? []).filter((a) => {
    if (!filterScope) return true;
    return detectActivityScope(a.notes) === filterScope;
  });

  const { mutate: signOff, isPending: signingOff } = useSignOffActivity<ErrorType<ErrorResponse>>({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
      },
    },
  });

  const getPtCode = (ptId: string) => pts?.find((p) => p.id === ptId)?.code ?? ptId.slice(0, 8);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-6">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <FileCheck2 className="h-5 w-5 text-violet-600" />
            Approval DU
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">Approve laporan APUPPT sebelum upload. Fokus aksi cepat, terutama di mobile.</p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <select
            value={filterPt}
            onChange={(e) => setFilterPt(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 sm:w-auto"
          >
            <option value="">Semua PT</option>
            {pts?.map((p) => (
              <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
            ))}
          </select>
          <select
            value={filterScope}
            onChange={(e) => setFilterScope(e.target.value as "" | "daily" | "monthly" | "quarterly")}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 sm:w-auto"
          >
            <option value="">Semua Scope</option>
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Triwulan</option>
          </select>
        </div>

        <div className="mb-5 flex w-fit gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setFilterTab("pending")}
            className={`rounded-md px-4 py-1.5 text-xs font-medium ${filterTab === "pending" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            Menunggu Review DU
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("approved")}
            className={`rounded-md px-4 py-1.5 text-xs font-medium ${filterTab === "approved" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            Sudah Approve DU
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("closed")}
            className={`rounded-md px-4 py-1.5 text-xs font-medium ${filterTab === "closed" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            Case Closed
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-400">Memuat...</div>
        ) : filteredActivities.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-14 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-slate-200" />
            <p className="text-sm font-medium text-slate-400">Tidak ada data pada tab ini.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredActivities.map((a: DailyActivity) => {
              const docs = getActivityDocuments(a);
              const inputTime = getDisplayInputTime(a.notes, a.createdAt);
              return (
                <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{getPtCode(a.ptId)}</span>
                    <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">{ACTIVITY_LABELS[a.activityType] ?? a.activityType}</span>
                    <span className="rounded border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">{detectActivityScope(a.notes)}</span>
                    {a.branchName && (
                      <span className="flex items-center gap-1 text-xs text-slate-500"><Building2 className="h-3 w-3" />{a.branchName}</span>
                    )}
                  </div>

                  <div className="grid gap-1 text-xs text-slate-600 sm:grid-cols-3">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(a.date).toLocaleDateString("id-ID")}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Jam {inputTime}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{a.itemsReviewed} nasabah</span>
                  </div>

                  {stripActivityScopeTag(a.notes) && (
                    <p className="mt-2 text-xs text-slate-600">{stripActivityScopeTag(a.notes)}</p>
                  )}

                  {docs.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {docs.map((doc) => (
                        <a
                          key={doc.id}
                          href={`${getBaseUrl()}/api/activities/${a.id}/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                        >
                          <span className="min-w-0 flex items-center gap-1.5">
                            <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                            <span className="truncate">{doc.originalName}</span>
                          </span>
                          <span className="ml-2 flex items-center gap-2 text-slate-500">
                            <span>{formatFileSize(doc.size)}</span>
                            <Download className="h-3.5 w-3.5" />
                          </span>
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="mt-3">
                    {filterTab === "pending" ? (
                      <button
                        type="button"
                        onClick={() => signOff({ id: a.id })}
                        disabled={signingOff}
                        className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50"
                      >
                        {signingOff ? "Memproses..." : "Approve / OK"}
                      </button>
                    ) : filterTab === "approved" ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                        DU sudah approve. Menunggu APUPPT update status ke "Laporan Terkirim (Case Closed)".
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                        Laporan telah ditandai Case Closed.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
