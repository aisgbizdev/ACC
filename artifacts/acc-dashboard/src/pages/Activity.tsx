import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateActivity,
  useUpdateActivity,
  useListActivities,
  useListBranches,
  getListActivitiesQueryKey,
  CreateActivityBodyActivityType,
  CreateActivityBodyCustomerRiskCategoriesItem,
  CreateActivityBodyFindingStatus,
  UpdateActivityBodyActivityType,
  UpdateActivityBodyCustomerRiskCategoriesItem,
  UpdateActivityBodyFindingStatus,
  type ErrorType,
  type ErrorResponse,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  CheckCircle2, Edit2, Building2, Users, FileCheck2,
  AlertCircle, MessageCircle, Send, X, ChevronDown, ChevronUp,
  Paperclip, Download, CalendarDays, Clock3,
} from "lucide-react";
import { PageChrome, Panel } from "@/components/PageChrome";
import { apiFetch, getBaseUrl } from "@/lib/api";
import { getActivityDocuments, formatFileSize } from "@/lib/activity-documents";

/* â”€â”€â”€ constants â”€â”€â”€ */
const ACTIVITY_TYPES: {
  value: CreateActivityBodyActivityType;
  label: string;
  short: string;
  emoji: string;
  needsCustomer: boolean;
}[] = [
  { value: CreateActivityBodyActivityType.kyc, label: "KYC (Know Your Customer)", short: "KYC", emoji: "🪪", needsCustomer: true },
  { value: CreateActivityBodyActivityType.cdd, label: "CDD (Customer Due Diligence)", short: "CDD", emoji: "🔍", needsCustomer: true },
  { value: CreateActivityBodyActivityType.screening, label: "Screening Nasabah", short: "Screening", emoji: "🛡️", needsCustomer: true },
  { value: CreateActivityBodyActivityType.monitoring_transaksi, label: "Monitoring Transaksi", short: "Monitoring", emoji: "📊", needsCustomer: true },
  { value: CreateActivityBodyActivityType.pelaporan, label: "Pelaporan", short: "Pelaporan", emoji: "📝", needsCustomer: true },
  { value: CreateActivityBodyActivityType.sosialisasi, label: "Sosialisasi APUPPT", short: "Sosialisasi", emoji: "🎓", needsCustomer: false },
  { value: CreateActivityBodyActivityType.lainnya, label: "Lainnya", short: "Lainnya", emoji: "📌", needsCustomer: true },
  { value: CreateActivityBodyActivityType.libur, label: "Hari Libur / Tidak Masuk", short: "Libur", emoji: "🏖️", needsCustomer: false },
];

const ACTIVITY_LABELS: Record<string, string> = {
  kyc: "KYC", cdd: "CDD", screening: "Screening",
  monitoring_transaksi: "Monitoring Transaksi", pelaporan: "Pelaporan",
  sosialisasi: "Sosialisasi APUPPT", lainnya: "Lainnya", libur: "Hari Libur",
};

const RISK_CATEGORIES: { value: CreateActivityBodyCustomerRiskCategoriesItem; label: string; color: string }[] = [
  { value: CreateActivityBodyCustomerRiskCategoriesItem.high, label: "High Risk", color: "text-red-600 bg-red-50 border-red-300" },
  { value: CreateActivityBodyCustomerRiskCategoriesItem.medium, label: "Medium Risk", color: "text-amber-600 bg-amber-50 border-amber-300" },
  { value: CreateActivityBodyCustomerRiskCategoriesItem.low, label: "Low Risk", color: "text-emerald-600 bg-emerald-50 border-emerald-300" },
];

const RISK_COLOR: Record<string, string> = {
  high: "text-red-600 bg-red-50 border-red-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low: "text-emerald-600 bg-emerald-50 border-emerald-200",
};
const RISK_LABEL: Record<string, string> = { high: "High Risk", medium: "Medium Risk", low: "Low Risk" };

const FINDING_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "follow_up", label: "Follow Up" },
  { value: "completed", label: "Selesai" },
];

const ROLE_BADGE: Record<string, string> = {
  apuppt: "APUPPT", dk: "DK", du: "DU", owner: "Owner", superadmin: "Superadmin",
};

type ActivityItem = {
  id: string; branchId?: string | null; branchName?: string | null;
  activityType: string; itemsReviewed: number;
  customerRiskCategories?: string[] | null; hasFinding: boolean;
  findingSummary?: string | null; findingStatus?: string | null;
  notes?: string | null; date: string;
  inputTime?: string | null;
  createdAt?: string; updatedAt?: string;
  documents?: unknown;
  dkReviewedAt?: string | null; dkNotes?: string | null;
  duSignedOffAt?: string | null;
};

type Comment = {
  id: string; activityId: string; content: string;
  createdAt: string; authorId: string;
  authorName: string | null; authorRole: string | null;
};

export type ActivityView = "daily" | "monthly" | "quarterly";
type EntryScope = ActivityView;

const SCOPE_TAG: Record<EntryScope, string> = {
  daily: "[scope:daily]",
  monthly: "[scope:monthly]",
  quarterly: "[scope:quarterly]",
};

function extractScopeAndNotes(rawNotes?: string | null): { scope: EntryScope; cleanNotes: string; activityTime: string | null } {
  const notes = (rawNotes ?? "").trim();
  const extractTime = (value: string): { cleanNotes: string; activityTime: string | null } => {
    const match = value.match(/^\[time:(\d{2}:\d{2})\]\s*/);
    if (!match) return { cleanNotes: value, activityTime: null };
    return { cleanNotes: value.slice(match[0].length).trim(), activityTime: match[1] };
  };
  if (notes.startsWith(SCOPE_TAG.monthly)) {
    const withoutScope = notes.slice(SCOPE_TAG.monthly.length).trim();
    const { cleanNotes, activityTime } = extractTime(withoutScope);
    return {
      scope: "monthly",
      cleanNotes,
      activityTime,
    };
  }
  if (notes.startsWith(SCOPE_TAG.quarterly)) {
    const withoutScope = notes.slice(SCOPE_TAG.quarterly.length).trim();
    const { cleanNotes, activityTime } = extractTime(withoutScope);
    return {
      scope: "quarterly",
      cleanNotes,
      activityTime,
    };
  }
  if (notes.startsWith(SCOPE_TAG.daily)) {
    const withoutScope = notes.slice(SCOPE_TAG.daily.length).trim();
    const { cleanNotes, activityTime } = extractTime(withoutScope);
    return {
      scope: "daily",
      cleanNotes,
      activityTime,
    };
  }
  const { cleanNotes, activityTime } = extractTime(notes);
  return { scope: "daily", cleanNotes, activityTime };
}

function encodeNotesWithScope(scope: EntryScope, notes?: string, activityTime?: string): string {
  const clean = (notes ?? "").trim();
  const timeTag = activityTime ? `[time:${activityTime}]` : "";
  if (clean && timeTag) return `${SCOPE_TAG[scope]} ${timeTag} ${clean}`;
  if (clean) return `${SCOPE_TAG[scope]} ${clean}`;
  if (timeTag) return `${SCOPE_TAG[scope]} ${timeTag}`;
  return SCOPE_TAG[scope];
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatMonthLabel(monthKey: string): string {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

function getMonthRange(monthKey: string): { start: string; end: string } {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!year || !month) {
    return { start: `${monthKey}-01`, end: `${monthKey}-31` };
  }
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${year}-${pad2(month)}-01`,
    end: `${year}-${pad2(month)}-${pad2(lastDay)}`,
  };
}

function getQuarterRange(year: number, quarter: 1 | 2 | 3 | 4): { start: string; end: string } {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const endDay = new Date(year, endMonth, 0).getDate();
  return {
    start: `${year}-${pad2(startMonth)}-01`,
    end: `${year}-${pad2(endMonth)}-${pad2(endDay)}`,
  };
}

function formatActivityTime(value?: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCurrentTimeValue(): string {
  const now = new Date();
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

/* â”€â”€â”€ comment thread â”€â”€â”€ */
function CommentThread({ activityId, currentUserId }: { activityId: string; currentUserId: string }) {
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const { data: comments = [], refetch } = useQuery<Comment[]>({
    queryKey: ["activity-comments", activityId],
    queryFn: () => apiFetch(`/api/activities/${activityId}/comments`),
  });

  const submit = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      await apiFetch(`/api/activities/${activityId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: text.trim() }),
      });
      setText("");
      refetch();
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <p className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
        <MessageCircle className="w-3 h-3" />
        Komentar ({comments.length})
      </p>
      {comments.length > 0 && (
        <div className="space-y-2 mb-3">
          {comments.map(c => (
            <div key={c.id} className={`flex gap-2 ${c.authorId === currentUserId ? "flex-row-reverse" : ""}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                c.authorId === currentUserId
                  ? "bg-blue-600 text-white rounded-tr-none"
                  : "bg-white/10 text-slate-200 rounded-tl-none"
              }`}>
                <p className={`font-semibold mb-0.5 ${c.authorId === currentUserId ? "text-blue-100" : "text-slate-400"}`}>
                  {c.authorName ?? "?"} · {c.authorRole ? ROLE_BADGE[c.authorRole] ?? c.authorRole : ""}
                </p>
                <p>{c.content}</p>
                <p className={`text-xs mt-1 ${c.authorId === currentUserId ? "text-blue-200" : "text-slate-500"}`}>
                  {new Date(c.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={1}
          placeholder="Tulis komentar..."
          className="flex-1 px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
        />
        <button
          onClick={submit}
          disabled={posting || !text.trim()}
          className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* â”€â”€â”€ history card â”€â”€â”€ */
function HistoryCard({ a, userId }: { a: ActivityItem; userId: string }) {
  const [expanded, setExpanded] = useState(false);
  const docs = getActivityDocuments(a);
  const displayTime = a.inputTime ?? formatActivityTime(a.createdAt);

  return (
    <Panel className="px-4 py-3 space-y-2">
      <div
        className="flex items-center justify-between gap-2 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span className="text-xs font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
              {ACTIVITY_TYPES.find(t => t.value === a.activityType)?.emoji ?? ""} {ACTIVITY_LABELS[a.activityType] ?? a.activityType}
            </span>
            {a.branchName && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Building2 className="w-3 h-3" />{a.branchName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            <span className="flex flex-col leading-tight">
              <span>{new Date(a.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
              {displayTime && (
                <span className="text-[11px] text-slate-500/90">Jam {displayTime}</span>
              )}
            </span>
            {a.itemsReviewed > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{a.itemsReviewed} nasabah</span>}
            {a.duSignedOffAt ? (
              <span className="text-xs font-medium text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                <FileCheck2 className="w-3 h-3" />Sign-Off DU
              </span>
            ) : a.dkReviewedAt ? (
              <span className="text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />DK ✓
              </span>
            ) : (
              <span className="text-xs text-slate-500">Pending</span>
            )}
          </div>
        </div>
        <button className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="pt-2 border-t border-white/10 space-y-2 text-xs text-slate-400">
          {a.customerRiskCategories && a.customerRiskCategories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {a.customerRiskCategories.map(rc => (
                <span key={rc} className={`px-2 py-0.5 rounded border ${RISK_COLOR[rc] ?? ""}`}>{RISK_LABEL[rc] ?? rc}</span>
              ))}
            </div>
          )}
          {a.hasFinding && a.findingSummary && (
            <p className="text-amber-300"><span className="font-semibold">Temuan:</span> {a.findingSummary}</p>
          )}
          {a.dkNotes && <p><span className="font-semibold text-slate-400">Catatan DK:</span> {a.dkNotes}</p>}
          {a.notes && <p><span className="font-semibold text-slate-400">Catatan:</span> {a.notes}</p>}
          {docs.length > 0 && (
            <div>
              <p className="mb-1 text-slate-400 font-semibold">Dokumen</p>
              <div className="space-y-1.5">
                {docs.map((doc) => (
                  <a
                    key={doc.id}
                    href={`${getBaseUrl()}/api/activities/${a.id}/documents/${doc.id}/download`}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-slate-300 hover:bg-white/10"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{doc.originalName}</span>
                    </span>
                    <span className="ml-2 flex items-center gap-2 text-slate-400">
                      <span>{formatFileSize(doc.size)}</span>
                      <Download className="h-3.5 w-3.5" />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
          <CommentThread activityId={a.id} currentUserId={userId} />
        </div>
      )}
    </Panel>
  );
}

/* â”€â”€â”€ main page â”€â”€â”€ */
export default function Activity({
  initialView = "daily",
  showTabs = true,
}: {
  initialView?: ActivityView;
  showTabs?: boolean;
}) {
  const { user } = useAuth();
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const [activityView, setActivityView] = useState<ActivityView>(initialView);
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}`);
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4>((Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4);
  const [selectedQuarterYear, setSelectedQuarterYear] = useState(now.getFullYear());
  const queryClient = useQueryClient();

  useEffect(() => {
    setActivityView(initialView);
  }, [initialView]);

  const { data: activities, isLoading } = useListActivities({ ptId: user?.ptId ?? undefined });
  const { data: branches } = useListBranches({ ptId: user?.ptId ?? undefined });

  const activitiesWithScope = (activities ?? []).map((a) => {
    const { scope, cleanNotes, activityTime } = extractScopeAndNotes((a as ActivityItem).notes);
    return { ...a, notes: cleanNotes || null, scope, inputTime: activityTime };
  });

  const dailyActivities = activitiesWithScope.filter((a) => a.scope === "daily");
  const todayActivities = dailyActivities.filter(a => a.date === today);
  const pastActivities = dailyActivities.filter(a => a.date !== today);
  const alreadyFilledToday = todayActivities.length > 0;
  const monthRange = getMonthRange(selectedMonth);
  const quarterRange = getQuarterRange(selectedQuarterYear, selectedQuarter);

  const getDefaultDateForView = (view: ActivityView): string => {
    if (view === "daily") return today;
    if (view === "monthly") {
      return today >= monthRange.start && today <= monthRange.end ? today : monthRange.start;
    }
    return today >= quarterRange.start && today <= quarterRange.end ? today : quarterRange.start;
  };

  type FormState = {
    date: string;
    activityTime: string;
    branchId: string;
    activityType: CreateActivityBodyActivityType;
    itemsReviewed: number;
    customerRiskCategories: CreateActivityBodyCustomerRiskCategoriesItem[];
    hasFinding: boolean;
    findingSummary: string;
    findingStatus: CreateActivityBodyFindingStatus;
    notes: string;
  };

  const buildDefaultForm = (view: ActivityView): FormState => ({
    date: getDefaultDateForView(view),
    activityTime: getCurrentTimeValue(),
    branchId: "",
    activityType: CreateActivityBodyActivityType.kyc,
    itemsReviewed: 0,
    customerRiskCategories: [],
    hasFinding: false,
    findingSummary: "",
    findingStatus: CreateActivityBodyFindingStatus.pending,
    notes: "",
  });

  const [form, setForm] = useState<FormState>(() => buildDefaultForm(activityView));
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [formOpenedAt, setFormOpenedAt] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const openNativePicker = (input: HTMLInputElement | null) => {
    if (!input) return;
    const pickerCapable = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerCapable.showPicker === "function") {
      pickerCapable.showPicker();
      return;
    }
    input.focus();
    input.click();
  };

  const { mutateAsync: createActivity, isPending: creating } = useCreateActivity<ErrorType<ErrorResponse>>({
    mutation: {
      onError: (err) => setError(err.data?.error ?? err.message ?? "Gagal menyimpan aktivitas."),
    },
  });

  const { mutateAsync: updateActivity, isPending: updating } = useUpdateActivity<ErrorType<ErrorResponse>>({
    mutation: {
      onError: (err) => setError(err.data?.error ?? err.message ?? "Gagal memperbarui aktivitas."),
    },
  });

  const resetFormState = () => {
    setEditingId(null);
    setShowForm(false);
    setFormOpenedAt(null);
    setForm(buildDefaultForm(activityView));
    setDocumentFiles([]);
    setError("");
  };

  const uploadDocuments = async (activityId: string, files: File[]) => {
    if (files.length === 0) return;
    const formData = new FormData();
    for (const file of files) {
      formData.append("documents", file);
    }
    await apiFetch(`/api/activities/${activityId}/documents`, {
      method: "POST",
      body: formData,
    });
  };

  const handleEdit = (a: ActivityItem) => {
    const { cleanNotes, activityTime } = extractScopeAndNotes(a.notes);
    setForm({
      date: a.date,
      activityTime: activityTime ?? formatActivityTime(a.createdAt)?.replace(".", ":") ?? getCurrentTimeValue(),
      branchId: a.branchId ?? "",
      activityType: (a.activityType as CreateActivityBodyActivityType) ?? CreateActivityBodyActivityType.kyc,
      itemsReviewed: a.itemsReviewed,
      customerRiskCategories: (a.customerRiskCategories ?? []) as CreateActivityBodyCustomerRiskCategoriesItem[],
      hasFinding: a.hasFinding,
      findingSummary: a.findingSummary ?? "",
      findingStatus: (a.findingStatus ?? CreateActivityBodyFindingStatus.pending) as CreateActivityBodyFindingStatus,
      notes: cleanNotes,
    });
    setEditingId(a.id);
    setFormOpenedAt(a.createdAt ?? null);
    setShowForm(true);
    setError("");
    setDocumentFiles([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (showForm && !editingId && !formOpenedAt) {
      setFormOpenedAt(new Date().toISOString());
    }
  }, [showForm, editingId, formOpenedAt]);

  const toggleRisk = (cat: CreateActivityBodyCustomerRiskCategoriesItem) =>
    setForm(prev => ({
      ...prev,
      customerRiskCategories: prev.customerRiskCategories.includes(cat)
        ? prev.customerRiskCategories.filter(c => c !== cat)
        : [...prev.customerRiskCategories, cat],
    }));

  const handleActivityTypeChange = (activityType: CreateActivityBodyActivityType) => {
    const selectedMeta = ACTIVITY_TYPES.find((t) => t.value === activityType);
    const isHoliday = activityType === CreateActivityBodyActivityType.libur;

    setForm((prev) => ({
      ...prev,
      activityType,
      customerRiskCategories: [],
      itemsReviewed: selectedMeta?.needsCustomer ? prev.itemsReviewed : 0,
      branchId: isHoliday ? "" : prev.branchId,
      hasFinding: isHoliday ? false : prev.hasFinding,
      findingSummary: isHoliday ? "" : prev.findingSummary,
      findingStatus: isHoliday ? CreateActivityBodyFindingStatus.pending : prev.findingStatus,
    }));

    if (isHoliday) {
      setDocumentFiles([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!user?.ptId) { setError("Akun Anda tidak terhubung ke PT manapun."); return; }
    if (!form.date) { setError("Tanggal aktivitas wajib diisi."); return; }
    if (!form.activityTime) { setError("Jam aktivitas wajib diisi."); return; }
    if (activityView === "monthly" && (form.date < monthRange.start || form.date > monthRange.end)) {
      setError("Tanggal harus berada di bulan yang dipilih.");
      return;
    }
    if (activityView === "quarterly" && (form.date < quarterRange.start || form.date > quarterRange.end)) {
      setError("Tanggal harus berada di triwulan yang dipilih.");
      return;
    }

    const selected = ACTIVITY_TYPES.find(t => t.value === form.activityType);
    const needsCustomer = selected?.needsCustomer ?? true;
    const isHolidayActivity = form.activityType === CreateActivityBodyActivityType.libur;
    if (needsCustomer && form.itemsReviewed < 0) { setError("Jumlah nasabah tidak boleh negatif untuk jenis kegiatan ini."); return; }

    const riskCats = form.customerRiskCategories.length > 0 ? form.customerRiskCategories : null;

    try {
      let activityId = editingId;

      if (editingId) {
        const updated = await updateActivity({
          id: editingId,
          data: {
            branchId: isHolidayActivity ? null : form.branchId || null,
            activityType: form.activityType as UpdateActivityBodyActivityType,
            itemsReviewed: Number(form.itemsReviewed),
            customerRiskCategories: riskCats as UpdateActivityBodyCustomerRiskCategoriesItem[] | null,
            hasFinding: isHolidayActivity ? false : form.hasFinding,
            findingSummary: !isHolidayActivity && form.hasFinding ? form.findingSummary || null : null,
            findingStatus: !isHolidayActivity && form.hasFinding ? form.findingStatus as UpdateActivityBodyFindingStatus : null,
            notes: encodeNotesWithScope(activityView, form.notes, form.activityTime),
          },
        });
        activityId = updated.id;
      } else {
        const created = await createActivity({
          data: {
            ptId: user.ptId,
            branchId: isHolidayActivity ? null : form.branchId || null,
            date: form.date,
            activityType: form.activityType,
            itemsReviewed: Number(form.itemsReviewed),
            customerRiskCategories: riskCats,
            hasFinding: isHolidayActivity ? false : form.hasFinding,
            findingSummary: !isHolidayActivity && form.hasFinding ? form.findingSummary || null : null,
            findingStatus: !isHolidayActivity && form.hasFinding ? form.findingStatus : null,
            notes: encodeNotesWithScope(activityView, form.notes, form.activityTime),
          },
        });
        activityId = created.id;
      }

      if (!isHolidayActivity && activityId && documentFiles.length > 0) {
        setUploadingDocs(true);
        await uploadDocuments(activityId, documentFiles);
      }

      resetFormState();
      await queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
    } catch (err) {
      setError((err as Error).message ?? "Gagal menyimpan aktivitas.");
    } finally {
      setUploadingDocs(false);
    }
  };

  const selectedTypeMeta = ACTIVITY_TYPES.find(t => t.value === form.activityType);
  const needsCustomer = selectedTypeMeta?.needsCustomer ?? true;
  const isHolidayActivity = form.activityType === CreateActivityBodyActivityType.libur;

  const monthlyActivities = activitiesWithScope.filter(a => a.scope === "monthly" && a.date.startsWith(selectedMonth));
  const monthlyItemsReviewed = monthlyActivities.reduce((sum, a) => sum + (a.itemsReviewed ?? 0), 0);
  const monthlyFindings = monthlyActivities.filter(a => a.hasFinding).length;
  const monthlyReviewed = monthlyActivities.filter(a => Boolean((a as ActivityItem).dkReviewedAt)).length;
  const monthlySignedOff = monthlyActivities.filter(a => Boolean((a as ActivityItem).duSignedOffAt)).length;

  const quarterStartMonth = (selectedQuarter - 1) * 3 + 1;
  const quarterEndMonth = quarterStartMonth + 2;
  const quarterlyActivities = activitiesWithScope.filter(a => a.scope === "quarterly" && a.date >= quarterRange.start && a.date <= quarterRange.end);
  const quarterlyItemsReviewed = quarterlyActivities.reduce((sum, a) => sum + (a.itemsReviewed ?? 0), 0);
  const quarterlyFindings = quarterlyActivities.filter(a => a.hasFinding).length;
  const quarterlyReviewed = quarterlyActivities.filter(a => Boolean((a as ActivityItem).dkReviewedAt)).length;
  const quarterlySignedOff = quarterlyActivities.filter(a => Boolean((a as ActivityItem).duSignedOffAt)).length;

  const quarterMonthBuckets = [0, 1, 2].map((offset) => {
    const monthNumber = quarterStartMonth + offset;
    const monthKey = `${selectedQuarterYear}-${pad2(monthNumber)}`;
    const monthActivities = quarterlyActivities.filter((a) => a.date.startsWith(monthKey));
    return {
      monthKey,
      total: monthActivities.length,
      itemsReviewed: monthActivities.reduce((sum, a) => sum + (a.itemsReviewed ?? 0), 0),
      findings: monthActivities.filter((a) => a.hasFinding).length,
    };
  });

  const viewTitle: Record<ActivityView, string> = {
    daily: "Aktivitas Daily",
    monthly: "Aktivitas Monthly",
    quarterly: "Aktivitas Triwulan",
  };

  const viewDescription: Record<ActivityView, string> = {
    daily: "Kelola aktivitas harian APUPPT.",
    monthly: "Ringkasan aktivitas per bulan.",
    quarterly: "Ringkasan aktivitas per triwulan.",
  };

  useEffect(() => {
    if (!showForm && !editingId) {
      setForm(buildDefaultForm(activityView));
      setDocumentFiles([]);
    }
  }, [activityView, selectedMonth, selectedQuarter, selectedQuarterYear]);

  return (
    <PageChrome
      eyebrow={new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      title={showTabs ? "Aktivitas" : viewTitle[activityView]}
      description={showTabs ? "Kelola aktivitas harian, pantau ringkasan bulanan, dan evaluasi triwulan." : viewDescription[activityView]}
    >

      {/* â”€â”€ Today's status banner â”€â”€ */}
      {showTabs && (
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { key: "daily", label: "Daily" },
          { key: "monthly", label: "Monthly" },
          { key: "quarterly", label: "Triwulan" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActivityView(tab.key as ActivityView)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              activityView === tab.key
                ? "bg-blue-600 text-white"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      )}

      {activityView === "daily" && !showForm && (
        <div className="mb-6">
          {alreadyFilledToday ? (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-300">Aktivitas hari ini sudah tercatat!</p>
                  <p className="text-xs text-emerald-500">{todayActivities.length} aktivitas · {today}</p>
                </div>
              </div>
              <div className="space-y-2">
                {todayActivities.map(a => {
                  const ai = a as ActivityItem;
                  return (
                    <div key={a.id} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">
                          {ACTIVITY_TYPES.find(t => t.value === a.activityType)?.emoji} {ACTIVITY_LABELS[a.activityType] ?? a.activityType}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          {a.branchName && <span className="flex items-center gap-0.5"><Building2 className="w-3 h-3" />{a.branchName}</span>}
                          {ai.itemsReviewed > 0 && <span>{ai.itemsReviewed} nasabah</span>}
                          {ai.dkReviewedAt
                            ? <span className="text-emerald-400">✓ DK</span>
                            : <span className="text-amber-400">Menunggu DK</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleEdit(ai)}
                        className="text-slate-500 hover:text-blue-400 transition-colors p-1"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => { setEditingId(null); setForm(buildDefaultForm(activityView)); setDocumentFiles([]); setError(""); setShowForm(true); }}
                className="mt-3 w-full py-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/10 transition-colors"
              >
                + Tambah Aktivitas Lagi
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-amber-200 mb-1">Belum ada aktivitas hari ini</p>
              <p className="text-xs text-amber-500 mb-4">Segera catat kegiatan APUPPT untuk {today}</p>
              <button
                onClick={() => { setEditingId(null); setForm(buildDefaultForm(activityView)); setDocumentFiles([]); setError(""); setShowForm(true); }}
                className="w-full py-3 rounded-xl bg-sky-500 text-slate-950 text-sm font-bold hover:bg-sky-400 transition-colors"
              >
                📋 Input Aktivitas Sekarang
              </button>
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ Input Form â”€â”€ */}
      {showForm && (
        <Panel className="mb-6 p-5 pb-20 sm:pb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                {editingId ? "Edit Aktivitas" : `Aktivitas Baru — ${form.date}`}
              </h3>
              {!editingId && formOpenedAt && (
                <p className="mt-1 text-xs text-slate-400">Jam {formatActivityTime(formOpenedAt)}</p>
              )}
            </div>
            <button
              onClick={resetFormState}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">

            {/* Activity type â€” visual grid */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Jenis Kegiatan *</label>
              <div className="grid grid-cols-2 gap-2">
                {ACTIVITY_TYPES.map(t => {
                  const selected = form.activityType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => handleActivityTypeChange(t.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                        selected
                          ? "bg-blue-600/20 border-blue-500 text-blue-200"
                          : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"
                      }`}
                    >
                      <span className="text-base flex-shrink-0">{t.emoji}</span>
                      <span className="text-xs font-medium leading-tight">{t.short}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Tanggal Aktivitas *</label>
              <div className="relative">
                <input
                  ref={dateInputRef}
                  type="date"
                  value={form.date}
                  min={activityView === "monthly" ? monthRange.start : activityView === "quarterly" ? quarterRange.start : undefined}
                  max={activityView === "monthly" ? monthRange.end : activityView === "quarterly" ? quarterRange.end : today}
                  disabled={Boolean(editingId)}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full appearance-none px-3 pr-11 py-2.5 bg-[#0e1a2d] border border-white/10 rounded-xl text-sm text-slate-200 [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:pointer-events-none"
                />
                <button
                  type="button"
                  onClick={() => openNativePicker(dateInputRef.current)}
                  disabled={Boolean(editingId)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-white/20 bg-white/10 p-1 text-white hover:bg-white/20 disabled:opacity-60"
                  aria-label="Pilih tanggal"
                >
                  <CalendarDays className="h-4 w-4" />
                </button>
              </div>
              {activityView === "daily" && (
                <p className="mt-1 text-[11px] text-slate-500">Mode Daily bisa pilih tanggal sampai hari ini (tidak bisa tanggal masa depan).</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Jam Aktivitas *</label>
              <div className="relative">
                <input
                  ref={timeInputRef}
                  type="time"
                  value={form.activityTime}
                  onChange={(e) => setForm({ ...form, activityTime: e.target.value })}
                  className="w-full appearance-none px-3 pr-11 py-2.5 bg-[#0e1a2d] border border-white/10 rounded-xl text-sm text-slate-200 [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:pointer-events-none"
                />
                <button
                  type="button"
                  onClick={() => openNativePicker(timeInputRef.current)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-white/20 bg-white/10 p-1 text-white hover:bg-white/20"
                  aria-label="Pilih jam"
                >
                  <Clock3 className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Isi jam saat aktivitas dikerjakan (format 24 jam).</p>
            </div>

            {/* Branch */}
            {!isHolidayActivity && branches && branches.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  <Building2 className="w-3.5 h-3.5 inline mr-1" />Cabang (opsional)
                </label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#0e1a2d] border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Semua / Kantor Pusat —</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}

            {/* Jumlah nasabah + risk â€” only for non-exempt types */}
            {needsCustomer && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    <Users className="w-3.5 h-3.5 inline mr-1" />Jumlah Nasabah Diperiksa *
                  </label>
                  <input
                    type="number" min="0"
                    value={String(form.itemsReviewed)}
                    onChange={(e) => setForm({ ...form, itemsReviewed: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2.5 bg-[#0e1a2d] border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Nilai 0 diperbolehkan.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Kategori Risiko Nasabah (opsional)</label>
                  <div className="flex gap-2 flex-wrap">
                    {RISK_CATEGORIES.map(rc => {
                      const checked = form.customerRiskCategories.includes(rc.value);
                      return (
                        <button
                          key={rc.value} type="button" onClick={() => toggleRisk(rc.value)}
                          className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                            checked ? rc.color : "text-slate-400 bg-white/5 border-white/10 hover:border-white/20"
                          }`}
                        >
                          {checked ? "✓ " : ""}{rc.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Finding */}
            {!isHolidayActivity && (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors">
                <input
                  type="checkbox" checked={form.hasFinding}
                  onChange={(e) => setForm({ ...form, hasFinding: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded accent-amber-500"
                />
                <span className="text-sm font-medium text-slate-300">⚠️ Ada temuan / indikasi pelanggaran</span>
              </label>
              {form.hasFinding && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Ringkasan Temuan *</label>
                    <textarea
                      value={form.findingSummary}
                      onChange={(e) => setForm({ ...form, findingSummary: e.target.value })}
                      rows={2} placeholder="Deskripsikan temuan secara singkat..."
                      className="w-full px-3 py-2 bg-[#0e1a2d] border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Status Temuan</label>
                    <select
                      value={form.findingStatus ?? "pending"}
                      onChange={(e) => setForm({ ...form, findingStatus: e.target.value as CreateActivityBodyFindingStatus })}
                      className="w-full px-3 py-2 bg-[#0e1a2d] border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {FINDING_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Catatan Tambahan (opsional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2} placeholder="Catatan tambahan..."
                className="w-full px-3 py-2.5 bg-[#0e1a2d] border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {!isHolidayActivity && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Upload Dokumen (opsional)</label>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png"
                onChange={(e) => setDocumentFiles(Array.from(e.target.files ?? []))}
                className="w-full rounded-xl border border-white/10 bg-[#0e1a2d] px-3 py-2 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-slate-100"
              />
              <p className="mt-1 text-[11px] text-slate-500">Maks 10 file, ukuran per file maks 10MB.</p>
              {documentFiles.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {documentFiles.map((file) => (
                    <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-slate-300">
                      <span className="truncate pr-2">{file.name}</span>
                      <span className="text-slate-500">{formatFileSize(file.size)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5 text-xs text-red-400">{error}</div>
            )}

            {/* Submit desktop */}
            <div className="hidden sm:flex gap-3 pt-1">
              {editingId && (
                <button type="button"
                  onClick={resetFormState}
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  Batal
                </button>
              )}
              <button type="submit" disabled={creating || updating || uploadingDocs}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {creating || updating || uploadingDocs ? "Menyimpan..." : editingId ? "Perbarui Aktivitas" : "Simpan Aktivitas"}
              </button>
            </div>
          </form>

          {/* Submit mobile â€” floating above bottom nav */}
          <div className="sm:hidden fixed bottom-16 left-0 right-0 z-30 flex gap-3 border-t border-white/10 bg-[#08111f] px-4 pb-3 pt-2">
            {editingId && (
              <button type="button"
                onClick={resetFormState}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-sm font-medium"
              >
                Batal
              </button>
            )}
            <button type="button" onClick={() => formRef.current?.requestSubmit()} disabled={creating || updating || uploadingDocs}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {creating || updating || uploadingDocs ? "Menyimpan..." : editingId ? "Perbarui" : "Simpan Aktivitas"}
            </button>
          </div>
        </Panel>
      )}

      {/* â”€â”€ Riwayat â”€â”€ */}
      {activityView === "daily" && (
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Riwayat Aktivitas</h2>
        <p className="mb-3 text-xs text-slate-500">Tap kartu untuk lihat detail & komentar. Hanya aktivitas hari ini yang dapat diedit.</p>
        {isLoading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Memuat...</div>
        ) : pastActivities.length === 0 ? (
          <Panel className="py-10 text-center">
            <p className="text-sm text-slate-400">Belum ada riwayat aktivitas.</p>
          </Panel>
        ) : (
          <div className="space-y-2">
            {pastActivities.map(a => (
              <HistoryCard key={a.id} a={a as ActivityItem} userId={user?.id ?? ""} />
            ))}
          </div>
        )}
      </div>
      )}

      {activityView === "monthly" && (
        <>
          <Panel className="mb-6 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Ringkasan Bulanan</h2>
                <p className="text-xs text-slate-400 mt-1">Pilih bulan untuk melihat total aktivitas, review, dan temuan.</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 bg-[#0e1a2d] border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setForm(buildDefaultForm("monthly")); setDocumentFiles([]); setError(""); setShowForm(true); }}
                  className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 transition-colors"
                >
                  Input Bulanan
                </button>
              </div>
            </div>
          </Panel>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Panel className="p-4"><p className="text-xs text-slate-400">Periode</p><p className="mt-1 text-lg font-semibold text-slate-100">{formatMonthLabel(selectedMonth)}</p></Panel>
            <Panel className="p-4"><p className="text-xs text-slate-400">Total Aktivitas</p><p className="mt-1 text-lg font-semibold text-slate-100">{monthlyActivities.length}</p></Panel>
            <Panel className="p-4"><p className="text-xs text-slate-400">Nasabah Diperiksa</p><p className="mt-1 text-lg font-semibold text-slate-100">{monthlyItemsReviewed}</p></Panel>
            <Panel className="p-4"><p className="text-xs text-slate-400">Temuan</p><p className="mt-1 text-lg font-semibold text-amber-300">{monthlyFindings}</p></Panel>
            <Panel className="p-4"><p className="text-xs text-slate-400">Review DK</p><p className="mt-1 text-lg font-semibold text-emerald-300">{monthlyReviewed}</p></Panel>
            <Panel className="p-4"><p className="text-xs text-slate-400">Sign-Off DU</p><p className="mt-1 text-lg font-semibold text-violet-300">{monthlySignedOff}</p></Panel>
          </div>

          <Panel className="p-5">
            <h3 className="text-sm font-semibold text-slate-100 mb-3">Daftar Aktivitas Bulan Ini</h3>
            {monthlyActivities.length === 0 ? (
              <p className="text-sm text-slate-400">Belum ada aktivitas untuk bulan yang dipilih.</p>
            ) : (
              <div className="space-y-2">
                {monthlyActivities
                  .slice()
                  .sort((a, b) => {
                    const byDate = b.date.localeCompare(a.date);
                    if (byDate !== 0) return byDate;
                    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
                  })
                  .map((a) => (
                    <div key={a.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-slate-300">
                      <div className="flex flex-wrap items-start gap-2">
                        <span className="text-slate-100 font-medium leading-tight">
                          <span className="block">{new Date(`${a.date}T00:00:00`).toLocaleDateString("id-ID")}</span>
                          {(a as ActivityItem).inputTime || formatActivityTime((a as ActivityItem).createdAt) ? (
                            <span className="block text-[11px] text-slate-400 font-normal">
                              Jam {(a as ActivityItem).inputTime ?? formatActivityTime((a as ActivityItem).createdAt)}
                            </span>
                          ) : null}
                        </span>
                        <span className="rounded bg-blue-500/15 px-2 py-0.5 text-blue-200">{ACTIVITY_LABELS[a.activityType] ?? a.activityType}</span>
                        {a.hasFinding && <span className="rounded bg-amber-500/15 px-2 py-0.5 text-amber-300">Ada Temuan</span>}
                      </div>
                      <p className="mt-1 text-slate-400">{a.itemsReviewed} nasabah diperiksa</p>
                    </div>
                  ))}
              </div>
            )}
          </Panel>
        </>
      )}

      {activityView === "quarterly" && (
        <>
          <Panel className="mb-6 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Ringkasan Triwulan</h2>
                <p className="text-xs text-slate-400 mt-1">Lihat performa aktivitas per 3 bulan.</p>
              </div>
              <div className="flex gap-2">
                <select
                  value={String(selectedQuarterYear)}
                  onChange={(e) => setSelectedQuarterYear(Number(e.target.value))}
                  className="px-3 py-2 bg-[#0e1a2d] border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <select
                  value={String(selectedQuarter)}
                  onChange={(e) => setSelectedQuarter(Number(e.target.value) as 1 | 2 | 3 | 4)}
                  className="px-3 py-2 bg-[#0e1a2d] border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">Triwulan 1</option>
                  <option value="2">Triwulan 2</option>
                  <option value="3">Triwulan 3</option>
                  <option value="4">Triwulan 4</option>
                </select>
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setForm(buildDefaultForm("quarterly")); setDocumentFiles([]); setError(""); setShowForm(true); }}
                  className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 transition-colors"
                >
                  Input Triwulan
                </button>
              </div>
            </div>
          </Panel>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Panel className="p-4"><p className="text-xs text-slate-400">Periode</p><p className="mt-1 text-lg font-semibold text-slate-100">Q{selectedQuarter} {selectedQuarterYear}</p></Panel>
            <Panel className="p-4"><p className="text-xs text-slate-400">Total Aktivitas</p><p className="mt-1 text-lg font-semibold text-slate-100">{quarterlyActivities.length}</p></Panel>
            <Panel className="p-4"><p className="text-xs text-slate-400">Nasabah Diperiksa</p><p className="mt-1 text-lg font-semibold text-slate-100">{quarterlyItemsReviewed}</p></Panel>
            <Panel className="p-4"><p className="text-xs text-slate-400">Temuan</p><p className="mt-1 text-lg font-semibold text-amber-300">{quarterlyFindings}</p></Panel>
            <Panel className="p-4"><p className="text-xs text-slate-400">Review DK</p><p className="mt-1 text-lg font-semibold text-emerald-300">{quarterlyReviewed}</p></Panel>
            <Panel className="p-4"><p className="text-xs text-slate-400">Sign-Off DU</p><p className="mt-1 text-lg font-semibold text-violet-300">{quarterlySignedOff}</p></Panel>
          </div>

          <Panel className="p-5">
            <h3 className="text-sm font-semibold text-slate-100 mb-3">Breakdown Per Bulan</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {quarterMonthBuckets.map((bucket) => (
                <div key={bucket.monthKey} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-medium text-slate-100">{formatMonthLabel(bucket.monthKey)}</p>
                  <p className="mt-2 text-xs text-slate-400">Aktivitas: <span className="text-slate-200 font-medium">{bucket.total}</span></p>
                  <p className="text-xs text-slate-400">Nasabah: <span className="text-slate-200 font-medium">{bucket.itemsReviewed}</span></p>
                  <p className="text-xs text-slate-400">Temuan: <span className="text-amber-300 font-medium">{bucket.findings}</span></p>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </PageChrome>
  );
}

