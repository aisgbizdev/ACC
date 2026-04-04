import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
import { FileCheck2, Building2, Users, CheckCircle2, ChevronDown, ChevronUp, Clock } from "lucide-react";

const ACTIVITY_LABELS: Record<string, string> = {
  kyc: "KYC",
  cdd: "CDD",
  screening: "Screening",
  monitoring_transaksi: "Monitoring Transaksi",
  pelaporan: "Pelaporan",
  sosialisasi: "Sosialisasi APUPPT",
  lainnya: "Lainnya",
};

const RISK_COLOR: Record<string, string> = {
  high: "text-red-600 bg-red-50 border-red-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

const RISK_LABEL: Record<string, string> = {
  high: "High Risk",
  medium: "Medium Risk",
  low: "Low Risk",
};

export default function DUSignOff() {
  const queryClient = useQueryClient();

  const [filterPt, setFilterPt] = useState("");
  const [filterTab, setFilterTab] = useState<"reviewed" | "signed_off">("reviewed");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activityParams: Record<string, string> = {};
  if (filterPt) activityParams.ptId = filterPt;
  activityParams.reviewStatus = filterTab === "reviewed" ? "reviewed" : "signed_off";

  const { data: activities, isLoading } = useListActivities(activityParams);
  const { data: pts } = useListPts();

  const { mutate: signOff, isPending: signingOff } = useSignOffActivity<ErrorType<ErrorResponse>>({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
      },
    },
  });

  const getPtCode = (ptId: string) => pts?.find(p => p.id === ptId)?.code ?? ptId.slice(0, 8);
  const count = activities?.length ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-violet-600" />
              Sign-Off Aktivitas
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              DU — berikan persetujuan akhir untuk aktivitas yang sudah di-review DK
            </p>
          </div>
          <select
            value={filterPt}
            onChange={(e) => setFilterPt(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua PT</option>
            {pts?.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-5 w-fit">
          <button
            onClick={() => setFilterTab("reviewed")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${filterTab === "reviewed" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Menunggu Sign-Off
            {filterTab === "reviewed" && count > 0 && (
              <span className="ml-1.5 bg-violet-100 text-violet-700 text-xs px-1.5 py-0.5 rounded-full">{count}</span>
            )}
          </button>
          <button
            onClick={() => setFilterTab("signed_off")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${filterTab === "signed_off" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Sudah Sign-Off
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Memuat...</div>
        ) : !activities || activities.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-14 text-center">
            <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400 font-medium">
              {filterTab === "reviewed"
                ? "Tidak ada aktivitas yang menunggu sign-off."
                : "Belum ada aktivitas yang sudah di-sign-off."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((a: DailyActivity) => {
              const isExpanded = expandedId === a.id;
              return (
                <div key={a.id} className={`bg-white rounded-xl border shadow-sm ${
                  filterTab === "signed_off" ? "border-violet-200" : "border-slate-200"
                }`}>
                  <div
                    className="px-4 py-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                            {getPtCode(a.ptId)}
                          </span>
                          <span className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                            {ACTIVITY_LABELS[a.activityType] ?? a.activityType}
                          </span>
                          {a.branchName && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />{a.branchName}
                            </span>
                          )}
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />Disetujui DK
                          </span>
                          {a.duSignedOffAt && (
                            <span className="text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded flex items-center gap-1">
                              <FileCheck2 className="w-3 h-3" />Sign-Off DU
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(a.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {a.itemsReviewed} nasabah
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {filterTab === "reviewed" && !a.duSignedOffAt && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              signOff({ id: a.id });
                            }}
                            disabled={signingOff}
                            className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-500 disabled:opacity-50 transition-colors"
                          >
                            {signingOff ? "..." : "Sign Off"}
                          </button>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 font-medium">Kategori Risiko</span>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {a.customerRiskCategories && a.customerRiskCategories.length > 0
                              ? a.customerRiskCategories.map(rc => (
                                  <span key={rc} className={`px-2 py-0.5 rounded border text-xs ${RISK_COLOR[rc] ?? ""}`}>
                                    {RISK_LABEL[rc] ?? rc}
                                  </span>
                                ))
                              : <span className="text-slate-300">—</span>
                            }
                          </div>
                        </div>
                        {a.findingSummary && (
                          <div>
                            <span className="text-slate-400 font-medium">Temuan</span>
                            <p className="text-slate-700 mt-1">{a.findingSummary}</p>
                          </div>
                        )}
                        {a.notes && (
                          <div>
                            <span className="text-slate-400 font-medium">Catatan APUPPT</span>
                            <p className="text-slate-700 mt-1">{a.notes}</p>
                          </div>
                        )}
                        {a.dkNotes && (
                          <div>
                            <span className="text-slate-400 font-medium">Catatan DK</span>
                            <p className="text-slate-700 mt-1">{a.dkNotes}</p>
                          </div>
                        )}
                        {a.dkReviewedAt && (
                          <div>
                            <span className="text-slate-400 font-medium">Disetujui DK pada</span>
                            <p className="text-slate-700 mt-1">{new Date(a.dkReviewedAt).toLocaleString("id-ID")}</p>
                          </div>
                        )}
                        {a.duSignedOffAt && (
                          <div>
                            <span className="text-slate-400 font-medium">Sign-off DU pada</span>
                            <p className="text-slate-700 mt-1">{new Date(a.duSignedOffAt).toLocaleString("id-ID")}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
