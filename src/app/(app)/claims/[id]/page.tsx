"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Mail,
  MapPin,
  Search,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { claimsApi } from "@/services/claims";
import { foundReportsApi } from "@/services/foundReports";
import { handoversApi } from "@/services/handovers";
import { lostReportsApi } from "@/services/lostReports";
import { cn } from "@/lib/utils";
import type { Claim, FoundReport, Handover, LostReport } from "@/types";

function formatClaimReference(id: string) {
  return `CLM-${id.slice(0, 8).toUpperCase()}`;
}

function formatPickupDate(value?: string) {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "MMM d, h:mm a");
}

function formatPickupWindow(value?: string) {
  if (!value) return "Pending scheduling";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const end = new Date(date);
  end.setHours(end.getHours() + 2);
  return `${format(date, "h:mm a")} - ${format(end, "h:mm a")}`;
}

function deriveFallbackPickupTime(claim?: Claim) {
  if (!claim?.reviewedAt && !claim?.updatedAt) return undefined;
  const base = new Date(claim.reviewedAt || claim.updatedAt);
  if (Number.isNaN(base.getTime())) return undefined;
  base.setDate(base.getDate() + 2);
  base.setHours(14, 0, 0, 0);
  return base.toISOString();
}

export default function ClaimPickupDetailsPage() {
  const params = useParams<{ id: string }>();
  const claimId = params.id;
  const [claim, setClaim] = useState<Claim | null>(null);
  const [foundReport, setFoundReport] = useState<FoundReport | null>(null);
  const [lostReport, setLostReport] = useState<LostReport | null>(null);
  const [handover, setHandover] = useState<Handover | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const claimRes = await claimsApi.getById(claimId);
        const loadedClaim = claimRes.data.data;
        const [foundResult, lostResult, handoverResult] = await Promise.allSettled([
          loadedClaim.foundReportId ? foundReportsApi.getById(loadedClaim.foundReportId) : Promise.resolve(null),
          loadedClaim.lostReportId ? lostReportsApi.getById(loadedClaim.lostReportId) : Promise.resolve(null),
          handoversApi.list({ claimId: loadedClaim.id, limit: 200 }),
        ]);

        if (!isMounted) return;
        setClaim(loadedClaim);
        setFoundReport(
          foundResult.status === "fulfilled" && foundResult.value
            ? foundResult.value.data.data
            : null,
        );
        setLostReport(
          lostResult.status === "fulfilled" && lostResult.value
            ? lostResult.value.data.data
            : null,
        );
        setHandover(
          handoverResult.status === "fulfilled"
            ? handoverResult.value.data.data[0] ?? null
            : null,
        );
      } catch {
        if (isMounted) toast.error("Failed to load claim details.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [claimId]);

  const itemTitle = foundReport?.itemTitle ?? lostReport?.itemTitle ?? "Claim Details";
  const pickupTime = handover?.handoverTime ?? deriveFallbackPickupTime(claim ?? undefined);
  const pickupPoint =
    handover?.handoverPoint ??
    foundReport?.custodyLocation ??
    foundReport?.locationFound ??
    "Campus Security Office";
  const officer = handover?.officerUserId ?? claim?.reviewedBy ?? "Recovery staff";

  const qrCells = useMemo(() => {
    const source = (claimId || "claim").padEnd(49, "0");
    return Array.from({ length: 49 }, (_, index) => {
      const code = source.charCodeAt(index % source.length);
      return (code + index) % 3 !== 0;
    });
  }, [claimId]);

  const saveVerificationPass = () => {
    const text = [
      `Claim Reference: ${formatClaimReference(claimId)}`,
      `Item: ${itemTitle}`,
      `Pickup: ${pickupPoint}`,
      `Time: ${formatPickupDate(pickupTime)}`,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${formatClaimReference(claimId)}-pickup-pass.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1220px] space-y-6">
        <Skeleton className="h-14 max-w-xl rounded-full" />
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid gap-8 xl:grid-cols-[490px_minmax(0,1fr)]">
          <Skeleton className="h-[625px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="rounded-xl border border-dashed border-[#b8c6c4] bg-white p-10 text-center text-lg text-[#505a5c]">
        Claim not found.
      </div>
    );
  }

  const ready = claim.status === "approved" || claim.status === "completed";

  return (
    <div className="mx-auto max-w-[1220px]">
      <div className="flex min-h-[50px] flex-col gap-4 border-b border-[#c9d4d2] pb-5 xl:flex-row xl:items-center xl:justify-between">
        <label className="relative block w-full max-w-[560px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#263234]" />
          <input
            type="search"
            placeholder="Search items, locations..."
            className="h-12 w-full rounded-full border border-[#b8c6c4] bg-white pl-12 pr-4 text-lg outline-none transition focus:border-[#007a6c] focus:ring-4 focus:ring-[#007a6c]/15"
          />
        </label>
        <div className="flex items-center gap-7 text-[#006056]">
          <Bell className="size-5" />
          <UserCircle className="size-7" />
        </div>
      </div>

      <div className="mt-9 flex flex-wrap items-center gap-3 text-lg text-[#263234]">
        <Link href="/claims" className="hover:text-[#006d62]">Claims</Link>
        <ChevronRight className="size-4" />
        <span>Pickup Details</span>
      </div>

      <div className="mt-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="font-heading text-[2.65rem] font-bold leading-none tracking-normal text-[#101417]">
            {itemTitle}
          </h1>
          <p className="mt-3 text-xl text-[#273235]">
            Claim Reference: <span className="font-bold">#{formatClaimReference(claim.id)}</span>
          </p>
        </div>
        <span
          className={cn(
            "inline-flex w-fit items-center gap-2 rounded-full px-5 py-2 text-sm font-bold uppercase tracking-[0.08em]",
            ready ? "bg-[#008a7d] text-white" : "bg-[#f4e8e1] text-[#9b421f]",
          )}
        >
          <CheckCircle2 className="size-4" />
          {ready ? "Ready for Pickup" : "Verification Pending"}
        </span>
      </div>

      <div className="mt-9 grid gap-8 xl:grid-cols-[490px_minmax(0,1fr)]">
        <section className="rounded-xl border border-[#d5dddc] bg-white p-8 text-center shadow-sm shadow-[inset_0_4px_0_#007a6c]">
          <h2 className="font-heading text-[1.8rem] font-bold tracking-normal">Verification Pass</h2>
          <div className="mx-auto mt-9 max-w-[285px] rounded-xl border border-[#b8c6c4] bg-[#f8fbfb] p-3">
            <div className="relative border border-[#007a6c] bg-[#263234] p-8">
              <div className="mx-auto grid size-36 grid-cols-7 gap-1 bg-white p-3">
                {qrCells.map((active, index) => (
                  <span key={index} className={active ? "bg-[#263234]" : "bg-white"} />
                ))}
              </div>
              <span className="absolute -left-1 -top-1 size-6 border-l-2 border-t-2 border-[#007a6c]" />
              <span className="absolute -right-1 -top-1 size-6 border-r-2 border-t-2 border-[#007a6c]" />
              <span className="absolute -bottom-1 -left-1 size-6 border-b-2 border-l-2 border-[#007a6c]" />
              <span className="absolute -bottom-1 -right-1 size-6 border-b-2 border-r-2 border-[#007a6c]" />
            </div>
          </div>
          <p className="mt-9 text-xl text-[#101417]">Present this code to staff upon arrival.</p>
          <p className="mx-auto mt-4 max-w-[360px] text-base leading-7 text-[#273235]">
            Ensure your brightness is turned up for faster scanning. Valid ID may be required.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={saveVerificationPass}
            className="mt-8 h-14 w-full rounded-lg border-[#b8c6c4] bg-white text-lg font-bold"
          >
            <Download className="mr-3 size-5" />
            Save to Device
          </Button>
        </section>

        <div className="space-y-8">
          <section className="rounded-xl border border-[#d5dddc] bg-white p-8 shadow-sm">
            <h2 className="font-heading text-[1.75rem] font-bold tracking-normal">Claim Status</h2>
            <div className="mt-9 grid grid-cols-2 gap-6 sm:grid-cols-4">
              <StatusStep label="Reviewed" complete />
              <StatusStep label="Verified" complete={ready} />
              <StatusStep label="Ready" current={ready && claim.status !== "completed"} complete={claim.status === "completed"} />
              <StatusStep label="Collected" complete={claim.status === "completed"} />
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_335px]">
            <section className="rounded-xl border border-[#d5dddc] bg-white p-8 shadow-sm">
              <h2 className="flex items-center gap-3 font-heading text-[1.65rem] font-bold tracking-normal">
                <MapPin className="size-7 text-[#007a6c]" />
                Pickup Location
              </h2>
              <div className="mt-6 overflow-hidden rounded-lg bg-[#dfe5e4]">
                <div className="relative h-40 bg-[linear-gradient(135deg,#d1d7d8_0_18%,#f0f2f2_18%_27%,#c3cbcc_27%_38%,#ecefed_38%_55%,#b8c3c5_55%_70%,#e6e9e9_70%_100%)]">
                  <MapPin className="absolute left-1/2 top-12 size-12 -translate-x-1/2 text-[#70787a]" />
                  <span className="absolute bottom-3 left-3 rounded bg-[#3d4446] px-3 py-1 text-sm font-bold text-white">
                    Campus Recovery
                  </span>
                </div>
              </div>
              <p className="mt-6 text-xl font-bold text-[#101417]">{pickupPoint}</p>
              <p className="mt-2 text-lg leading-7 text-[#273235]">
                {foundReport?.custodyLocation
                  ? `Use the desk at ${foundReport.custodyLocation}.`
                  : "Bring a valid campus ID and your verification pass."}
              </p>
            </section>

            <aside className="space-y-8">
              <section className="rounded-xl border border-[#d5dddc] bg-white p-8 shadow-sm">
                <h2 className="flex items-center gap-3 font-heading text-[1.65rem] font-bold tracking-normal">
                  <Clock3 className="size-7 text-[#007a6c]" />
                  Scheduled Time
                </h2>
                <div className="mt-6 rounded-lg border border-[#b8c6c4] bg-[#f8fbfb] p-5">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#273235]">
                    {pickupTime ? formatPickupDate(pickupTime).split(",")[0] : "Pending"}
                  </p>
                  <p className="mt-3 text-[1.65rem] font-bold leading-tight">{formatPickupWindow(pickupTime)}</p>
                </div>
                <Button variant="outline" className="mt-5 h-12 w-full rounded-lg border-[#b8c6c4] bg-white text-base font-bold text-[#006d62]">
                  Reschedule Pickup
                </Button>
              </section>

              <section className="rounded-xl border border-[#d5dddc] bg-white p-8 shadow-sm">
                <div className="flex items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="flex size-14 items-center justify-center rounded-full bg-[#dfeeed] text-[#006d62]">
                      <UserCircle className="size-9" />
                    </div>
                    <div>
                      <p className="text-base text-[#505a5c]">Assigned Officer</p>
                      <p className="break-all text-xl font-bold text-[#101417]">{officer}</p>
                    </div>
                  </div>
                  <Mail className="size-7 text-[#006d62]" />
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusStep({
  label,
  complete = false,
  current = false,
}: {
  label: string;
  complete?: boolean;
  current?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-full border-2",
          complete || current ? "border-[#007a6c] text-[#007a6c]" : "border-[#b8c6c4] text-transparent",
        )}
      >
        {complete ? <CheckCircle2 className="size-7" /> : current ? <span className="size-4 rounded-full bg-[#007a6c]" /> : null}
      </span>
      <span className={cn("text-sm font-bold uppercase tracking-[0.12em]", complete || current ? "text-[#006056]" : "text-[#101417]")}>
        {label}
      </span>
    </div>
  );
}
