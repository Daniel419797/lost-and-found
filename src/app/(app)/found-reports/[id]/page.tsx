"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  Circle,
  FileText,
  KeyRound,
  Laptop,
  MapPin,
  Package,
  Shirt,
  ShieldCheck,
  Trophy,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { claimsApi } from "@/services/claims";
import { foundReportsApi } from "@/services/foundReports";
import { cn } from "@/lib/utils";
import type { FoundReport, FoundReportStatus } from "@/types";

type ReportVisual = {
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: string;
};

function getReportVisual(report: FoundReport): ReportVisual {
  const text = `${report.itemTitle} ${report.category} ${report.description ?? ""}`.toLowerCase();
  if (text.includes("key")) return { Icon: KeyRound, tone: "bg-[#e0e4e5] text-[#667173]" };
  if (report.category === "Electronics") return { Icon: Laptop, tone: "bg-[#dde8eb] text-[#007a6c]" };
  if (report.category === "Books") return { Icon: BookOpen, tone: "bg-[#e6e0d6] text-[#745833]" };
  if (report.category === "Documents") return { Icon: FileText, tone: "bg-[#e2e5ea] text-[#415063]" };
  if (report.category === "Clothing") return { Icon: Shirt, tone: "bg-[#e7e0e6] text-[#6b4d66]" };
  if (report.category === "Sports") return { Icon: Trophy, tone: "bg-[#e7e4d7] text-[#6a612d]" };
  if (report.category === "Food") return { Icon: Utensils, tone: "bg-[#eadfd8] text-[#7b4d35]" };
  if (report.category === "Bags") return { Icon: BriefcaseBusiness, tone: "bg-[#e0e4e5] text-[#4f6064]" };
  return { Icon: Package, tone: "bg-[#e0e4e5] text-[#667173]" };
}

function formatReportDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "MMM d, yyyy");
}

function formatReportDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "MMM d, yyyy - h:mm a");
}

function getAvailabilityLabel(status: FoundReportStatus) {
  if (status === "open") return "Available for Claim";
  if (status === "verified") return "Under Review";
  if (status === "claimed") return "Claimed";
  return "Closed";
}

function statusClass(status: FoundReportStatus) {
  return {
    open: "bg-[#e7eeee] text-[#101417]",
    verified: "bg-[#fff0e8] text-[#9b3f18]",
    claimed: "bg-[#e5e8e8] text-[#596365]",
    closed: "bg-[#e5e8e8] text-[#596365]",
  }[status];
}

function userLabel(userId: string) {
  if (!userId) return "Finder unavailable";
  return `Finder ID ${userId.slice(0, 8)}`;
}

export default function FoundReportDetailPage() {
  const params = useParams<{ id: string }>();
  const reportId = typeof params.id === "string" ? params.id : "";
  const [report, setReport] = useState<FoundReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const [claimDetails, setClaimDetails] = useState("");
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadReport = async () => {
      setIsLoading(true);
      try {
        const res = await foundReportsApi.getById(reportId);
        if (!isMounted) return;
        setReport(res.data.data);
      } catch {
        if (!isMounted) return;
        toast.error("Failed to load found report.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (reportId) {
      void loadReport();
    }

    return () => {
      isMounted = false;
    };
  }, [reportId]);

  const submitClaim = async () => {
    if (!report) return;
    if (claimDetails.trim().length < 10) {
      toast.error("Add at least 10 characters of ownership detail.");
      return;
    }

    setIsSubmittingClaim(true);
    try {
      await claimsApi.create({
        foundReportId: report.id,
        description: claimDetails.trim(),
      });
      toast.success("Claim submitted for review.");
      setClaimDetails("");
      setIsClaimDialogOpen(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to submit claim.";
      toast.error(msg);
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1220px]">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-8 h-[470px] rounded-xl" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-[1220px] rounded-xl border border-dashed border-[#b8c6c4] bg-white p-10 text-center text-lg text-[#505a5c]">
        Found report not found.
      </div>
    );
  }

  const visual = getReportVisual(report);
  const Icon = visual.Icon;
  const photoUrl = report.imageUrls?.find(Boolean);
  const availableForClaim = report.status === "open";

  return (
    <div className="mx-auto max-w-[1220px]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/found-reports"
            className="inline-flex items-center gap-3 text-lg text-[#273235] hover:text-[#006d62]"
          >
            <ArrowLeft className="size-5" />
            Back to Found Items
          </Link>
          <h1 className="mt-6 font-heading text-[2.7rem] font-bold leading-none tracking-normal text-[#101417]">
            {report.itemTitle}
          </h1>
        </div>

        <span
          className={cn(
            "inline-flex h-9 items-center gap-3 rounded-full px-5 text-base font-bold",
            statusClass(report.status),
          )}
        >
          <span className={cn("size-2.5 rounded-full", availableForClaim ? "bg-[#007a6c]" : "bg-[#9aa3a5]")} />
          {getAvailabilityLabel(report.status)}
        </span>
      </div>

      <div className="mt-9 grid gap-8 xl:grid-cols-[minmax(0,1fr)_385px]">
        <main className="space-y-8">
          <section className="rounded-xl border border-[#e0e5e4] bg-white p-5 shadow-sm">
            <div className="aspect-[1.78] overflow-hidden rounded-lg bg-[#dfe3e4]">
              {photoUrl ? (
                <div
                  aria-label={`${report.itemTitle} photo`}
                  className="h-full w-full bg-cover bg-center"
                  role="img"
                  style={{ backgroundImage: `url(${JSON.stringify(photoUrl)})` }}
                />
              ) : (
                <div className={cn("flex h-full w-full items-center justify-center", visual.tone)}>
                  <Icon className="size-24" strokeWidth={2.4} />
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#e0e5e4] bg-white p-8 shadow-sm">
            <h2 className="font-heading text-[1.7rem] font-bold tracking-normal text-[#101417]">
              Item Description
            </h2>
            <p className="mt-5 text-xl leading-8 text-[#273235]">
              {report.description || "No public description was provided for this item."}
            </p>
          </section>

          <section className="rounded-xl border border-[#e0e5e4] bg-white p-8 shadow-sm">
            <h2 className="font-heading text-[1.7rem] font-bold tracking-normal text-[#101417]">
              Recovery Timeline
            </h2>
            <div className="mt-8 space-y-8">
              <TimelineStep
                active
                title="Reported Found"
                detail={formatReportDateTime(report.createdAt || report.dateFound)}
              />
              <TimelineStep
                active={report.status !== "open"}
                title="Matched"
                detail={report.status === "open" ? "Waiting for potential owner to submit a claim." : "A claim or review workflow has started."}
              />
              <TimelineStep
                active={report.status === "claimed" || report.status === "closed"}
                title="Claimed"
                detail={report.status === "claimed" || report.status === "closed" ? "Claim workflow completed or item closed." : "Pending user action."}
              />
            </div>
          </section>
        </main>

        <aside className="space-y-8">
          <section className="rounded-xl border border-[#e0e5e4] bg-white p-8 shadow-sm">
            <h2 className="font-heading text-[1.7rem] font-bold tracking-normal text-[#101417]">
              Is this yours?
            </h2>
            <p className="mt-5 text-lg leading-7 text-[#273235]">
              You will need to provide specific details not shown here to prove ownership.
            </p>
            <Button
              type="button"
              disabled={!availableForClaim}
              onClick={() => setIsClaimDialogOpen(true)}
              className="mt-8 h-[56px] w-full rounded-lg bg-[#007a6c] text-lg font-bold text-white hover:bg-[#006e62]"
            >
              Submit Claim
              <ArrowRight className="ml-3 size-5" />
            </Button>
          </section>

          <section className="overflow-hidden rounded-xl border border-[#e0e5e4] bg-white shadow-sm">
            <h2 className="border-b border-[#e0e5e4] px-8 py-5 text-base font-bold uppercase tracking-[0.12em] text-[#182224]">
              Item Details
            </h2>
            <DetailRow label="Category" value={report.category} chip />
            <DetailRow label="Brand" value={report.brand || "Not provided"} />
            <DetailRow label="Color" value={report.color || "Not provided"} color={report.color} />
            <DetailRow label="Date Found" value={formatReportDate(report.dateFound)} />
            <div className="px-8 py-5">
              <p className="flex items-center gap-2 text-lg text-[#273235]">
                <MapPin className="size-5" />
                Location
              </p>
              <p className="mt-3 text-lg text-[#101417]">{report.locationFound}</p>
              {report.custodyLocation && (
                <p className="mt-1 text-base text-[#505a5c]">Custody: {report.custodyLocation}</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#e0e5e4] bg-white p-8 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-lg bg-[#d9e7e5] text-[#007a6c]">
                <ShieldCheck className="size-8" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#505a5c]">Found By</p>
                <p className="mt-1 text-lg font-bold text-[#101417]">{userLabel(report.userId)}</p>
                <p className="text-lg text-[#505a5c]">Campus recovery network</p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <Dialog open={isClaimDialogOpen} onOpenChange={setIsClaimDialogOpen}>
        <DialogContent className="bg-white p-6 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#101417]">Submit Claim</DialogTitle>
            <DialogDescription>
              Provide private details that prove this item belongs to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={claimDetails}
              onChange={(event) => setClaimDetails(event.target.value)}
              placeholder="Describe private identifying details, contents, marks, serials, or context not visible in the report."
              rows={5}
            />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsClaimDialogOpen(false)}
                disabled={isSubmittingClaim}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitClaim}
                disabled={isSubmittingClaim}
                className="bg-[#007a6c] text-white hover:bg-[#006e62]"
              >
                {isSubmittingClaim ? "Submitting..." : "Submit Claim"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({
  chip,
  color,
  label,
  value,
}: {
  chip?: boolean;
  color?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#edf0f0] px-8 py-5 last:border-b-0">
      <p className="text-lg text-[#273235]">{label}</p>
      {chip ? (
        <span className="rounded-md bg-[#eceeee] px-3 py-2 text-lg text-[#101417]">{value}</span>
      ) : color ? (
        <span className="flex items-center gap-3 text-lg text-[#101417]">
          <span className="size-3.5 rounded-full bg-[#c7cdcf]" />
          {value}
        </span>
      ) : (
        <p className="text-right text-lg text-[#101417]">{value}</p>
      )}
    </div>
  );
}

function TimelineStep({ active, detail, title }: { active?: boolean; detail: string; title: string }) {
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)] gap-5">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-full",
            active ? "bg-[#007a6c] text-white" : "bg-[#eef1f1] text-[#9aa3a5]",
          )}
        >
          {active ? <CheckCircle2 className="size-5" /> : <Circle className="size-5 fill-current" />}
        </span>
      </div>
      <div>
        <p className={cn("text-lg font-bold", active ? "text-[#101417]" : "text-[#8a9395]")}>{title}</p>
        <p className={cn("mt-1 text-lg", active ? "text-[#101417]" : "text-[#8a9395]")}>{detail}</p>
      </div>
    </div>
  );
}
