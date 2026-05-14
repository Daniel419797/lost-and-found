"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  ClipboardCheck,
  Handshake,
  Hourglass,
  Laptop,
  Search,
  SearchX,
  Smartphone,
  TicketCheck,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { lostReportsApi } from "@/services/lostReports";
import { foundReportsApi } from "@/services/foundReports";
import { claimsApi } from "@/services/claims";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import type { FoundReport, LostReport } from "@/types";

type Stats = {
  openLost: number;
  awaitingClaim: number;
  pendingClaims: number;
  reunionsThisMonth: number;
  activeMatches: number;
};

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  status: "Found" | "Lost" | "Resolved";
  icon: "phone" | "bottle" | "keys";
  photoUrl?: string;
};

const DEFAULT_STATS: Stats = {
  openLost: 0,
  awaitingClaim: 0,
  pendingClaims: 0,
  reunionsThisMonth: 0,
  activeMatches: 0,
};

function isThisMonth(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function getRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function pickActivityIcon(title: string): ActivityItem["icon"] {
  const normalized = title.toLowerCase();
  if (normalized.includes("key")) return "keys";
  if (normalized.includes("bottle") || normalized.includes("flask")) return "bottle";
  return "phone";
}

function toFoundActivity(report: FoundReport): ActivityItem {
  return {
    id: `found-${report.id}`,
    title: report.itemTitle,
    description: `Found at ${report.locationFound}`,
    createdAt: report.createdAt || report.dateFound,
    status: report.status === "closed" || report.status === "verified" ? "Resolved" : "Found",
    icon: pickActivityIcon(report.itemTitle),
    photoUrl: report.imageUrls?.find(Boolean),
  };
}

function toLostActivity(report: LostReport): ActivityItem {
  return {
    id: `lost-${report.id}`,
    title: report.itemTitle,
    description:
      report.status === "recovered"
        ? "Claim approved - Ready for pickup"
        : `Reported lost near ${report.locationLost}`,
    createdAt: report.createdAt || report.dateLost,
    status: report.status === "recovered" ? "Resolved" : "Lost",
    icon: pickActivityIcon(report.itemTitle),
    photoUrl: report.imageUrls?.find(Boolean),
  };
}

function ActivityIcon({
  photoUrl,
  title,
  type,
}: {
  photoUrl?: string;
  title: string;
  type: ActivityItem["icon"];
}) {
  if (photoUrl) {
    return (
      <div
        aria-label={`${title} photo`}
        className="size-[60px] rounded-lg bg-[#dfe3e4] bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url(${JSON.stringify(photoUrl)})` }}
      />
    );
  }

  if (type === "keys") {
    return (
      <div className="flex size-[60px] items-center justify-center rounded-lg bg-[#dfe3e4] text-[#667173]">
        <TicketCheck className="size-8" />
      </div>
    );
  }

  if (type === "bottle") {
    return (
      <div className="flex size-[60px] items-center justify-center rounded-lg bg-[#dfe3e4] text-[#667173]">
        <Hourglass className="size-8" />
      </div>
    );
  }

  return (
    <div className="flex size-[60px] items-center justify-center rounded-lg bg-[#dfe3e4] text-[#263234]">
      <Smartphone className="size-8" />
    </div>
  );
}

function StatusBadge({ status }: { status: ActivityItem["status"] }) {
  const styles = {
    Found: "bg-[#ebeff1] text-[#182224]",
    Lost: "bg-[#ffd9d5] text-[#9b1c12]",
    Resolved: "bg-[#f0d9ce] text-[#a04a20]",
  }[status];

  return (
    <span className={styles + " rounded-md px-3 py-1 text-sm font-semibold tracking-wide"}>
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isStaff = user?.role === "staff" || user?.role === "admin" || user?.role === "super_admin";
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [recentLost, setRecentLost] = useState<LostReport[]>([]);
  const [recentFound, setRecentFound] = useState<FoundReport[]>([]);
  const [matchedLost, setMatchedLost] = useState<LostReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

      const load = async () => {
      setIsLoading(true);
      const [lostResult, foundResult, claimsResult, recoveredResult, matchedResult] =
        await Promise.allSettled([
          lostReportsApi.list({ status: "open", limit: 50 }),
          foundReportsApi.list({ status: "open", limit: 50 }),
          isStaff
            ? claimsApi.listReviewQueue({ status: "pending", limit: 50 })
            : claimsApi.listMine({ status: "pending", limit: 50 }),
          lostReportsApi.list({ status: "recovered", limit: 100 }),
          lostReportsApi.list({ status: "matched", limit: 10 }),
        ]);

      if (!isMounted) return;

      const lostData = lostResult.status === "fulfilled" ? lostResult.value.data : null;
      const foundData = foundResult.status === "fulfilled" ? foundResult.value.data : null;
      const claimsData = claimsResult.status === "fulfilled" ? claimsResult.value.data : null;
      const recoveredData =
        recoveredResult.status === "fulfilled" ? recoveredResult.value.data : null;
      const matchedData = matchedResult.status === "fulfilled" ? matchedResult.value.data : null;

      setStats({
        openLost: lostData?.total ?? 0,
        awaitingClaim: foundData?.total ?? 0,
        pendingClaims: claimsData?.total ?? 0,
        reunionsThisMonth:
          recoveredData?.data.filter((report) => isThisMonth(report.updatedAt || report.dateLost))
            .length ?? 0,
        activeMatches: matchedData?.total ?? 0,
      });
      setRecentLost(lostData?.data.slice(0, 5) ?? []);
      setRecentFound(foundData?.data.slice(0, 5) ?? []);
      setMatchedLost(matchedData?.data.slice(0, 2) ?? []);

      if (
        [lostResult, foundResult, claimsResult, recoveredResult, matchedResult].some(
          (r) => r.status === "rejected",
        )
      ) {
        toast.error("Some dashboard data could not be loaded.");
      }

      setIsLoading(false);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [isStaff]);

  const activities = useMemo(() => {
    return [...recentFound.map(toFoundActivity), ...recentLost.map(toLostActivity)]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [recentFound, recentLost]);

  const potentialMatches = useMemo(() => {
    return matchedLost.map((report) => ({
      id: report.id,
      title: report.itemTitle,
      icon: report.category === "Books" ? BookOpen : Laptop,
      detail: `${report.category}${report.locationLost ? ` at ${report.locationLost}` : ""}`,
    }));
  }, [matchedLost]);

  return (
    <div className="mx-auto max-w-[1220px]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="font-heading text-[2.7rem] font-bold leading-none tracking-normal text-[#101417]">
            Overview
          </h1>
          <p className="mt-4 text-xl leading-7 text-[#505a5c]">
            Today&apos;s recovery metrics and recent activity.
          </p>
        </div>

        <label className="relative w-full max-w-[320px] xl:mt-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#4e5b5e]" />
          <input
            type="search"
            placeholder="Search item ID or keyword..."
            className="h-12 w-full rounded-lg border border-[#b8c6c4] bg-white pl-12 pr-4 text-base text-[#182224] outline-none transition placeholder:text-[#6b7375] focus:border-[#007a6c] focus:ring-4 focus:ring-[#007a6c]/15"
          />
        </label>
      </div>

      <section className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          [1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-[132px] rounded-xl" />)
        ) : (
          <>
            <MetricCard
              label="Open Lost Reports"
              value={stats.openLost}
              icon={SearchX}
            />
            <MetricCard
              label="Awaiting Claim"
              value={stats.awaitingClaim}
              icon={ClipboardCheck}
            />
            <MetricCard label="Pending Claims" value={stats.pendingClaims} icon={Hourglass} />
            <MetricCard
              label="Reunions (This Month)"
              value={stats.reunionsThisMonth}
              icon={Handshake}
              featured
            />
          </>
        )}
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_385px]">
        <section>
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-heading text-[1.7rem] font-bold tracking-normal text-[#101417]">
              Recent Activity
            </h2>
            <Link href="/lost-reports" className="font-bold text-[#006d62] hover:text-[#00584f]">
              View All
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#c4d0ce] bg-white shadow-sm">
            {isLoading ? (
              [1, 2, 3].map((item) => (
                <div key={item} className="border-b border-[#e0e6e5] p-5 last:border-b-0">
                  <Skeleton className="h-[60px] rounded-lg" />
                </div>
              ))
            ) : activities.length === 0 ? (
              <div className="p-8 text-center text-[#505a5c]">No recent activity yet.</div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="grid gap-4 border-b border-[#e0e6e5] px-5 py-5 last:border-b-0 sm:grid-cols-[60px_minmax(0,1fr)_110px_92px] sm:items-center"
                >
                  <ActivityIcon photoUrl={activity.photoUrl} title={activity.title} type={activity.icon} />
                  <div className="min-w-0">
                    <p className="truncate text-xl font-bold leading-6 text-[#101417]">
                      {activity.title}
                    </p>
                    <p className="mt-1 truncate text-lg text-[#505a5c]">{activity.description}</p>
                  </div>
                  <p className="text-base font-medium text-[#505a5c] sm:text-right">
                    {getRelativeTime(activity.createdAt)}
                  </p>
                  <div className="sm:text-right">
                    <StatusBadge status={activity.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="space-y-8">
          <section className="rounded-xl border border-[#c4d0ce] bg-white p-6 shadow-sm">
            <h2 className="font-heading text-[1.6rem] font-bold tracking-normal text-[#101417]">
              Quick Actions
            </h2>
            <div className="mt-6 space-y-4">
              <Link
                href="/found-reports/new"
                className="flex h-[52px] items-center justify-center gap-3 rounded-lg bg-[#007a6c] text-lg font-bold text-white transition hover:bg-[#006e62]"
              >
                <CirclePlusIcon />
                Report Found Item
              </Link>
              <Link
                href="/lost-reports/new"
                className="flex h-[52px] items-center justify-center gap-3 rounded-lg border border-[#b8c6c4] bg-white text-lg font-bold text-[#101417] transition hover:border-[#007a6c] hover:text-[#006d62]"
              >
                <Search className="size-5" />
                Report Lost Item
              </Link>
            </div>
          </section>

          <section className="rounded-xl border border-[#c4d0ce] bg-[#eef1f1] p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="font-heading text-[1.6rem] font-bold tracking-normal text-[#101417]">
                Potential Matches
              </h2>
              <span className="rounded-full bg-[#d0e4e2] px-4 py-1 text-sm font-bold text-[#006d62]">
                {stats.activeMatches} Active
              </span>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                [1, 2].map((item) => <Skeleton key={item} className="h-[82px] rounded-lg" />)
              ) : potentialMatches.length === 0 ? (
                <div className="rounded-lg border border-[#c4d0ce] bg-white p-5 text-sm text-[#505a5c]">
                  No match candidates yet.
                </div>
              ) : (
                potentialMatches.map((match) => {
                  const Icon = match.icon;
                  return (
                    <div
                      key={match.id}
                      className="flex items-center gap-4 rounded-lg border border-[#c4d0ce] bg-white p-4 shadow-sm"
                    >
                      <div className="flex size-[50px] items-center justify-center rounded-md bg-[#e0e4e5] text-[#007a6c]">
                        <Icon className="size-7" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold text-[#101417]">{match.title}</p>
                        <p className="mt-1 flex items-center gap-3 text-base text-[#505a5c]">
                          <span className="size-2 rounded-full bg-[#007a6c]" />
                          <span className="truncate">{match.detail}</span>
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  featured = false,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  featured?: boolean;
}) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border p-6 shadow-sm",
        featured
          ? "border-[#008a7d] bg-[#078d80] text-white"
          : "border-[#c4d0ce] bg-white text-[#101417]",
      )}
    >
      <p
        className={cn(
          "text-base font-bold uppercase tracking-[0.08em]",
          featured ? "text-white" : "text-[#4c5658]",
        )}
      >
        {label}
      </p>
      <div className="mt-4 flex items-end gap-3">
        <p className="text-[2.55rem] font-bold leading-none">{value}</p>
      </div>
      <Icon
        className={cn(
          "absolute right-6 top-1/2 size-16 -translate-y-1/2",
          featured ? "text-white/20" : "text-[#dce6e5]",
        )}
        strokeWidth={2.2}
      />
    </article>
  );
}

function CirclePlusIcon() {
  return (
    <span className="relative inline-flex size-5 items-center justify-center">
      <span className="absolute h-0.5 w-4 rounded-full bg-current" />
      <span className="absolute h-4 w-0.5 rounded-full bg-current" />
    </span>
  );
}
