"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Filter,
  Inbox,
  Laptop,
  MapPin,
  Search,
  ShieldQuestion,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { claimsApi } from "@/services/claims";
import { foundReportsApi } from "@/services/foundReports";
import { lostReportsApi } from "@/services/lostReports";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import type { Claim, ClaimStatus, FoundReport, LostReport } from "@/types";

type ClaimView = {
  claim: Claim;
  foundReport?: FoundReport;
  lostReport?: LostReport;
  title: string;
  category: string;
  location: string;
  photoUrl?: string;
  evidence: string;
};

type ReviewDialogState = {
  claimId: string;
  action: "approved" | "rejected";
  notes: string;
};

const STATUS_LABELS: Record<ClaimStatus, string> = {
  pending: "Pending Review",
  under_review: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Returned",
};

function shortClaimId(id: string) {
  return `C-${id.slice(0, 8).toUpperCase()}`;
}

function formatClaimDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "MMM d, yyyy");
}

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return `${formatDistanceToNowStrict(date)} ago`;
}

function statusClass(status: ClaimStatus) {
  return {
    pending: "border-[#dca98f] bg-[#f4e8e1] text-[#9a3f1d]",
    under_review: "border-[#dca98f] bg-[#f4e8e1] text-[#9a3f1d]",
    approved: "border-[#a5d6d2] bg-[#dcefed] text-[#006d62]",
    rejected: "border-[#ffd6d6] bg-[#fff0f0] text-[#c20000]",
    completed: "border-[#d7ddde] bg-[#e8ebeb] text-[#3f494c]",
  }[status];
}

function buildClaimViews(
  claims: Claim[],
  foundReports: FoundReport[],
  lostReports: LostReport[],
): ClaimView[] {
  const foundById = new Map(foundReports.map((report) => [report.id, report]));
  const lostById = new Map(lostReports.map((report) => [report.id, report]));

  return claims.map((claim) => {
    const foundReport = claim.foundReportId ? foundById.get(claim.foundReportId) : undefined;
    const lostReport = claim.lostReportId ? lostById.get(claim.lostReportId) : undefined;
    const title = foundReport?.itemTitle ?? lostReport?.itemTitle ?? `Claim ${shortClaimId(claim.id)}`;
    const category = foundReport?.category ?? lostReport?.category ?? "Claim";
    const location =
      foundReport?.locationFound ??
      lostReport?.locationLost ??
      foundReport?.custodyLocation ??
      "Location pending";
    const photoUrl = foundReport?.imageUrls?.find(Boolean) ?? lostReport?.imageUrls?.find(Boolean);

    return {
      claim,
      foundReport,
      lostReport,
      title,
      category,
      location,
      photoUrl,
      evidence: claim.description || "No evidence text was provided.",
    };
  });
}

function claimMatchesSearch(view: ClaimView, search: string) {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return [
    view.claim.id,
    view.title,
    view.category,
    view.location,
    view.evidence,
    view.claim.reviewNotes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(term);
}

export default function ClaimsPage() {
  const { user } = useAuth();
  const isReviewer = user?.role === "staff" || user?.role === "admin" || user?.role === "super_admin";
  const [claims, setClaims] = useState<Claim[]>([]);
  const [foundReports, setFoundReports] = useState<FoundReport[]>([]);
  const [lostReports, setLostReports] = useState<LostReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ClaimStatus>("all");
  const [reviewDialog, setReviewDialog] = useState<ReviewDialogState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const claimRequest = isReviewer
          ? Promise.allSettled([
              claimsApi.listReviewQueue({ status: "pending", limit: 100 }),
              claimsApi.listReviewQueue({ status: "under_review", limit: 100 }),
            ]).then((results) => {
              const merged = new Map<string, Claim>();
              for (const result of results) {
                if (result.status !== "fulfilled") continue;
                for (const claim of result.value.data.data) {
                  merged.set(claim.id, claim);
                }
              }
              return Array.from(merged.values());
            })
          : claimsApi.listMine({ limit: 100 }).then((res) => res.data.data);

        const [claimRows, foundResult, lostResult] = await Promise.all([
          claimRequest,
          foundReportsApi.list({ limit: 250 }),
          lostReportsApi.list({ limit: 250 }),
        ]);

        if (!isMounted) return;
        setClaims(claimRows);
        setFoundReports(foundResult.data.data);
        setLostReports(lostResult.data.data);
      } catch {
        if (isMounted) toast.error("Failed to load claims.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [isReviewer]);

  const claimViews = useMemo(
    () => buildClaimViews(claims, foundReports, lostReports),
    [claims, foundReports, lostReports],
  );

  const visibleClaims = useMemo(() => {
    return claimViews.filter((view) => {
      const matchesStatus = statusFilter === "all" || view.claim.status === statusFilter;
      return matchesStatus && claimMatchesSearch(view, search);
    });
  }, [claimViews, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: claimViews.length,
      pending: claimViews.filter((view) => view.claim.status === "pending" || view.claim.status === "under_review").length,
      approved: claimViews.filter((view) => view.claim.status === "approved" || view.claim.status === "completed").length,
      rejected: claimViews.filter((view) => view.claim.status === "rejected").length,
    };
  }, [claimViews]);

  const reloadAfterReview = async () => {
    const res = await Promise.allSettled([
      claimsApi.listReviewQueue({ status: "pending", limit: 100 }),
      claimsApi.listReviewQueue({ status: "under_review", limit: 100 }),
    ]);
    const merged = new Map<string, Claim>();
    for (const result of res) {
      if (result.status !== "fulfilled") continue;
      for (const claim of result.value.data.data) merged.set(claim.id, claim);
    }
    setClaims(Array.from(merged.values()));
  };

  const handleReview = async () => {
    if (!reviewDialog) return;
    setIsSubmitting(true);
    try {
      await claimsApi.review(reviewDialog.claimId, {
        status: reviewDialog.action,
        reviewNotes:
          reviewDialog.notes.trim() ||
          (reviewDialog.action === "approved"
            ? "Approved after evidence review."
            : "Rejected after evidence review."),
      });
      toast.success(reviewDialog.action === "approved" ? "Claim approved." : "Claim rejected.");
      setReviewDialog(null);
      await reloadAfterReview();
    } catch {
      toast.error("Failed to review claim.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1220px]">
      {isReviewer ? (
        <ReviewQueueView
          claims={visibleClaims}
          isLoading={isLoading}
          onReview={(claimId, action) =>
            setReviewDialog({
              claimId,
              action,
              notes: action === "approved" ? "Approved after evidence review." : "Rejected after evidence review.",
            })
          }
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          totalPending={stats.pending}
        />
      ) : (
        <StudentClaimsView
          claims={visibleClaims}
          isLoading={isLoading}
          search={search}
          setSearch={setSearch}
          stats={stats}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
      )}

      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>
              {reviewDialog?.action === "approved" ? "Approve Claim" : "Reject Claim"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-[#505a5c]">
              Add a reviewer note. This is shown to the claimant after the decision.
            </p>
            <Textarea
              rows={4}
              value={reviewDialog?.notes ?? ""}
              onChange={(event) =>
                setReviewDialog((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={isSubmitting}
              className={cn(
                reviewDialog?.action === "approved"
                  ? "bg-[#007a6c] text-white hover:bg-[#006e62]"
                  : "bg-[#c20000] text-white hover:bg-[#a80000]",
              )}
            >
              {isSubmitting ? "Saving..." : reviewDialog?.action === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentClaimsView({
  claims,
  isLoading,
  search,
  setSearch,
  stats,
  statusFilter,
  setStatusFilter,
}: {
  claims: ClaimView[];
  isLoading: boolean;
  search: string;
  setSearch: (value: string) => void;
  stats: { total: number; pending: number; approved: number; rejected: number };
  statusFilter: "all" | ClaimStatus;
  setStatusFilter: (value: "all" | ClaimStatus) => void;
}) {
  const activeClaims = claims.filter((view) => ["pending", "under_review", "approved"].includes(view.claim.status));
  const pastClaims = claims.filter((view) => ["completed", "rejected"].includes(view.claim.status));

  return (
    <>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#006056]">Student Portal</p>
          <h1 className="mt-1 font-heading text-[2.7rem] font-bold leading-none tracking-normal text-[#101417]">
            My Claims
          </h1>
        </div>
        <SearchAndFilter
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
      </div>

      <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Claims" value={stats.total} icon={ClipboardList} />
        <StatCard label="Pending Review" value={stats.pending} icon={ShieldQuestion} tone="warm" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} tone="teal" />
        <StatCard label="Rejected" value={stats.rejected} icon={XCircle} tone="red" />
      </section>

      <section className="mt-12">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-heading text-[1.75rem] font-bold tracking-normal text-[#101417]">
            Active Claims
          </h2>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className="text-base font-bold text-[#006d62] hover:text-[#00584f]"
          >
            View All
          </button>
        </div>

        {isLoading ? (
          <div className="grid gap-8 lg:grid-cols-2">
            {[1, 2].map((item) => <Skeleton key={item} className="h-[365px] rounded-xl" />)}
          </div>
        ) : activeClaims.length === 0 ? (
          <EmptyState text="No active claims match your filters." />
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {activeClaims.map((view) => <StudentClaimCard key={view.claim.id} view={view} />)}
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="font-heading text-[1.75rem] font-bold tracking-normal text-[#101417]">
          Past History
        </h2>
        <div className="mt-8 overflow-hidden rounded-xl border border-[#d5dddc] bg-white shadow-sm">
          {isLoading ? (
            <div className="p-6">
              <Skeleton className="h-28 rounded-lg" />
            </div>
          ) : pastClaims.length === 0 ? (
            <div className="p-8 text-center text-[#505a5c]">No completed or rejected claims yet.</div>
          ) : (
            <div className="min-w-full overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead className="border-b border-[#dfe6e5] bg-[#fbfcfc]">
                  <tr className="text-sm font-bold uppercase tracking-[0.16em] text-[#263234]">
                    <th className="px-8 py-5">Item</th>
                    <th className="px-8 py-5">Date</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5 text-right">Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {pastClaims.map((view) => (
                    <tr key={view.claim.id} className="border-b border-[#eef2f1] last:border-b-0">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <ReportThumb view={view} size="sm" />
                          <div>
                            <p className="font-bold text-[#101417]">{view.title}</p>
                            <p className="text-sm font-semibold text-[#505a5c]">{shortClaimId(view.claim.id)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-[#505a5c]">{formatClaimDate(view.claim.createdAt)}</td>
                      <td className="px-8 py-5">
                        <StatusPill status={view.claim.status} />
                      </td>
                      <td className="px-8 py-5 text-right text-[#505a5c]">
                        {view.claim.reviewNotes || (view.claim.status === "completed" ? "Item returned" : "Decision recorded")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function ReviewQueueView({
  claims,
  isLoading,
  onReview,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  totalPending,
}: {
  claims: ClaimView[];
  isLoading: boolean;
  onReview: (claimId: string, action: "approved" | "rejected") => void;
  search: string;
  setSearch: (value: string) => void;
  statusFilter: "all" | ClaimStatus;
  setStatusFilter: (value: "all" | ClaimStatus) => void;
  totalPending: number;
}) {
  return (
    <>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="font-heading text-[2.7rem] font-bold leading-none tracking-normal text-[#101417]">
            Claim Review Queue
          </h1>
          <p className="mt-4 text-xl leading-7 text-[#505a5c]">
            Review and process pending recovery requests.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "h-12 rounded-full border px-5 text-lg font-bold transition",
              statusFilter === "all"
                ? "border-transparent bg-[#e6e3e1] text-[#5a5654]"
                : "border-[#b8c6c4] bg-white text-[#101417]",
            )}
          >
            All Pending ({totalPending})
          </button>
          <button type="button" className="h-12 rounded-full border border-[#b8c6c4] bg-white px-5 text-lg font-bold">
            High Confidence
          </button>
          <button type="button" className="h-12 rounded-full border border-[#b8c6c4] bg-white px-5 text-lg font-bold">
            Requires Follow-up
          </button>
        </div>
      </div>

      <div className="mt-8 max-w-[560px]">
        <SearchAndFilter
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
      </div>

      <section className="mt-10">
        {isLoading ? (
          <div className="grid gap-8 lg:grid-cols-2">
            {[1, 2].map((item) => <Skeleton key={item} className="h-[500px] rounded-xl" />)}
          </div>
        ) : claims.length === 0 ? (
          <EmptyState text="No pending claims need review." />
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {claims.map((view) => (
              <ReviewClaimCard key={view.claim.id} view={view} onReview={onReview} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function SearchAndFilter({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
}: {
  search: string;
  setSearch: (value: string) => void;
  statusFilter: "all" | ClaimStatus;
  setStatusFilter: (value: "all" | ClaimStatus) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
      <label className="relative block min-w-0 flex-1 xl:w-[320px]">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#4e5b5e]" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search claims..."
          className="h-12 w-full rounded-lg border border-[#b8c6c4] bg-white pl-12 pr-4 text-base text-[#182224] outline-none transition placeholder:text-[#858e91] focus:border-[#007a6c] focus:ring-4 focus:ring-[#007a6c]/15"
        />
      </label>
      <select
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value as "all" | ClaimStatus)}
        className="h-12 rounded-lg border border-[#b8c6c4] bg-white px-4 text-base font-semibold text-[#182224] outline-none"
        aria-label="Filter claims by status"
      >
        <option value="all">All</option>
        <option value="pending">Pending</option>
        <option value="under_review">Under Review</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="completed">Returned</option>
      </select>
      <button
        type="button"
        className="inline-flex size-12 items-center justify-center rounded-lg border border-[#b8c6c4] bg-white text-[#101417] shadow-sm"
        aria-label="More filters"
      >
        <Filter className="size-5" />
      </button>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "plain",
}: {
  label: string;
  value: number;
  icon: typeof ClipboardList;
  tone?: "plain" | "warm" | "teal" | "red";
}) {
  const accent = {
    plain: "bg-transparent",
    warm: "bg-[#f3e8e2]",
    teal: "bg-[#dfeeed]",
    red: "bg-[#f3e1e1]",
  }[tone];

  return (
    <article className="relative overflow-hidden rounded-xl border border-[#d5dddc] bg-white p-7 shadow-sm">
      <div className={cn("absolute -right-7 -top-7 size-24 rounded-full", accent)} />
      <p className="relative z-10 flex items-center gap-3 text-lg text-[#273235]">
        <Icon className="size-5 text-[#006d62]" />
        {label}
      </p>
      <p className="relative z-10 mt-4 text-[2.45rem] font-bold leading-none text-[#101417]">{value}</p>
    </article>
  );
}

function StudentClaimCard({ view }: { view: ClaimView }) {
  const approved = view.claim.status === "approved";

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border border-[#d5dddc] bg-white shadow-sm",
        approved && "border-[#b7d9d5] shadow-[inset_0_4px_0_#007a6c]",
      )}
    >
      <div className={cn("flex items-center justify-between gap-4 border-b border-[#eef2f1] px-7 py-4", approved && "bg-[#eff7f6]")}>
        <p className="font-mono text-base font-bold tracking-wide text-[#263234]">
          Claim #{shortClaimId(view.claim.id)}
        </p>
        <StatusPill status={view.claim.status} />
      </div>
      <div className="p-7">
        <div className="flex items-start gap-5">
          <ReportThumb view={view} />
          <div className="min-w-0">
            <h3 className="truncate font-heading text-[1.65rem] font-bold leading-tight tracking-normal">
              {view.title}
            </h3>
            <p className="mt-2 flex items-center gap-2 text-lg text-[#505a5c]">
              <MapPin className="size-5 shrink-0 text-[#263234]" />
              <span className="truncate">{view.location}</span>
            </p>
            <p className="mt-2 flex items-center gap-2 text-lg text-[#505a5c]">
              <CalendarDays className="size-5 shrink-0 text-[#263234]" />
              <span>Submitted {formatClaimDate(view.claim.createdAt)}</span>
            </p>
          </div>
        </div>

        <div
          className={cn(
            "mt-7 rounded-lg border p-5",
            approved ? "border-[#c5dedb] bg-[#f1faf9]" : "border-[#dfe5e4] bg-[#f3f4f4]",
          )}
        >
          <p className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.14em] text-[#006056]">
            {approved ? <ClipboardCheck className="size-5" /> : <FileText className="size-5" />}
            {approved ? "Reviewer Note" : "Evidence Provided"}
          </p>
          <p className="mt-3 line-clamp-3 text-lg leading-7 text-[#273235]">
            {approved ? view.claim.reviewNotes || "Your claim was approved." : view.evidence}
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-4 border-t border-[#eef2f1] pt-5 sm:flex-row sm:items-center sm:justify-between">
          {approved ? (
            <p className="flex items-center gap-2 font-bold text-[#c20000]">
              <AlertTriangle className="size-4" />
              Action Required
            </p>
          ) : (
            <div>
              <p className="font-mono text-sm font-bold tracking-[0.12em] text-[#263234]">Next Step</p>
              <p className="text-lg text-[#273235]">Awaiting admin verification</p>
            </div>
          )}
          <Link
            href={`/claims/${view.claim.id}`}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition",
              approved
                ? "bg-[#007a6c] text-white hover:bg-[#006e62]"
                : "border border-[#b8c6c4] bg-white text-[#101417] hover:bg-[#f7f8f8]",
            )}
          >
            {approved ? "Schedule Pickup" : "View Details"}
          </Link>
        </div>
      </div>
    </article>
  );
}

function ReviewClaimCard({
  view,
  onReview,
}: {
  view: ClaimView;
  onReview: (claimId: string, action: "approved" | "rejected") => void;
}) {
  const confidence = computeConfidence(view);
  const strong = confidence >= 75;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-white shadow-sm",
        strong ? "border-[#b7d9d5] shadow-[inset_0_4px_0_#007a6c]" : "border-[#d9c2b7] shadow-[inset_0_4px_0_#9b421f]",
      )}
    >
      <div className="flex items-center justify-between gap-4 px-7 py-7">
        <div className="flex flex-wrap items-center gap-4">
          <span className="rounded-md bg-[#eceeee] px-3 py-1.5 font-mono text-base font-bold">
            ID: CLM-{view.claim.id.slice(0, 4).toUpperCase()}
          </span>
          <span className="flex items-center gap-2 text-lg text-[#273235]">
            <CalendarDays className="size-5" />
            {relativeTime(view.claim.createdAt)}
          </span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-3 rounded-full border px-5 py-2 text-lg font-bold",
            strong ? "border-[#007a6c] bg-[#dcefed] text-[#006d62]" : "border-[#d99f84] bg-[#f4e8e1] text-[#9b421f]",
          )}
        >
          {strong ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
          {confidence}% Match
        </span>
      </div>

      <div className="grid gap-5 px-7 md:grid-cols-2">
        <div className="rounded-lg border border-[#dfe5e4] bg-[#f8f9f9] p-5">
          <div className="flex items-start gap-5">
            <ReportThumb view={view} />
            <div className="min-w-0">
              <p className={cn("text-sm font-bold", strong ? "text-[#006d62]" : "text-[#9b421f]")}>
                {view.category}
              </p>
              <h3 className="mt-2 line-clamp-3 font-heading text-[1.65rem] font-bold leading-tight">
                {view.title}
              </h3>
              <p className="mt-3 text-lg text-[#273235]">Found: {view.location}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#dfe5e4] bg-[#f8f9f9] p-5">
          <p className="flex items-center gap-3 text-lg font-bold text-[#101417]">
            <User className="size-5" />
            Claimant
          </p>
          <p className="mt-5 text-lg leading-7 text-[#273235]">
            User ID:
            <br />
            {view.claim.claimantId || "Unknown"}
          </p>
        </div>
      </div>

      <div className="mx-7 mt-6 rounded-lg border border-[#dfe5e4] bg-[#f3f4f4] p-5">
        <p className="flex items-center gap-3 text-lg font-bold text-[#101417]">
          <ShieldQuestion className="size-5" />
          Evidence Summary
        </p>
        <p className="mt-3 line-clamp-3 text-lg leading-7 text-[#273235]">{view.evidence}</p>
      </div>

      <div className="mt-8 flex flex-col gap-4 border-t border-[#cbd6d4] bg-[#fbfcfc] px-7 py-5 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="ghost" className="mr-auto text-lg font-bold text-[#c20000]" onClick={() => onReview(view.claim.id, "rejected")}>
          Reject
        </Button>
        <Link
          href={`/claims/${view.claim.id}`}
          className="inline-flex h-10 items-center justify-center rounded-md px-4 text-lg font-bold text-[#006d62] transition hover:bg-[#f7f8f8]"
        >
          View Details
        </Link>
        <Button className="bg-[#007a6c] text-lg font-bold text-white hover:bg-[#006e62]" onClick={() => onReview(view.claim.id, "approved")}>
          Approve
        </Button>
      </div>
    </article>
  );
}

function ReportThumb({ view, size = "md" }: { view: ClaimView; size?: "sm" | "md" }) {
  const classes = size === "sm" ? "size-12" : "size-20";
  if (view.photoUrl) {
    return (
      <div
        aria-label={`${view.title} photo`}
        className={cn(classes, "shrink-0 rounded-lg bg-[#dfe3e4] bg-cover bg-center")}
        role="img"
        style={{ backgroundImage: `url(${JSON.stringify(view.photoUrl)})` }}
      />
    );
  }

  const Icon = view.category === "Books" ? BookOpen : view.category === "Electronics" ? Laptop : Inbox;
  return (
    <div className={cn(classes, "flex shrink-0 items-center justify-center rounded-lg bg-[#e0e4e5] text-[#667173]")}>
      <Icon className={size === "sm" ? "size-7" : "size-10"} />
    </div>
  );
}

function StatusPill({ status }: { status: ClaimStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-bold", statusClass(status))}>
      {status === "approved" || status === "completed" ? <CheckCircle2 className="size-4" /> : null}
      {status === "rejected" ? <XCircle className="size-4" /> : null}
      {(status === "pending" || status === "under_review") ? <span className="size-2 rounded-full bg-current" /> : null}
      {STATUS_LABELS[status]}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#b8c6c4] bg-white p-10 text-center text-lg text-[#505a5c]">
      {text}
    </div>
  );
}

function computeConfidence(view: ClaimView) {
  let score = 45;
  if (view.claim.lostReportId) score += 25;
  if (view.evidence.length > 80) score += 18;
  if (view.evidence.length > 160) score += 10;
  if (view.foundReport?.brand && view.evidence.toLowerCase().includes(view.foundReport.brand.toLowerCase())) score += 5;
  if (view.foundReport?.color && view.evidence.toLowerCase().includes(view.foundReport.color.toLowerCase())) score += 5;
  return Math.min(score, 98);
}
