"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Download,
  MoreVertical,
  PieChart,
  Search,
  Settings,
  ShieldCheck,
  Timer,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { adminApi, type AdminMetrics } from "@/services/admin";
import { foundReportsApi } from "@/services/foundReports";
import { lostReportsApi } from "@/services/lostReports";
import { cn } from "@/lib/utils";
import type { FoundReport, ItemCategory, LostReport } from "@/types";

type WeekBucket = {
  label: string;
  reported: number;
  returned: number;
};

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function categoryColor(index: number) {
  return ["#007a6c", "#9b421f", "#758281", "#606060", "#c8d3d2"][index % 5];
}

function hashPosition(seed: string, axis: "x" | "y") {
  const text = `${seed}-${axis}`;
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 1000;
  }
  return 8 + (hash % 84);
}

function getReportLocation(report: LostReport | FoundReport) {
  return "locationLost" in report ? report.locationLost : report.locationFound;
}

function buildWeeklyBuckets(lostReports: LostReport[], foundReports: FoundReport[]): WeekBucket[] {
  const buckets: WeekBucket[] = Array.from({ length: 5 }, (_, index) => ({
    label: `Wk ${index + 1}`,
    reported: 0,
    returned: 0,
  }));

  const allReports = [
    ...lostReports.map((report) => ({
      createdAt: report.createdAt || report.dateLost,
      updatedAt: report.updatedAt || report.dateLost,
      returned: report.status === "recovered",
    })),
    ...foundReports.map((report) => ({
      createdAt: report.createdAt || report.dateFound,
      updatedAt: report.updatedAt || report.dateFound,
      returned: report.status === "claimed" || report.status === "closed",
    })),
  ];

  for (const report of allReports) {
    const created = new Date(report.createdAt);
    if (!Number.isNaN(created.getTime())) {
      buckets[Math.min(4, Math.max(0, Math.floor(created.getDate() / 7)))].reported += 1;
    }
    const updated = new Date(report.updatedAt);
    if (report.returned && !Number.isNaN(updated.getTime())) {
      buckets[Math.min(4, Math.max(0, Math.floor(updated.getDate() / 7)))].returned += 1;
    }
  }

  return buckets;
}

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [lostReports, setLostReports] = useState<LostReport[]>([]);
  const [foundReports, setFoundReports] = useState<FoundReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    const [metricsResult, lostResult, foundResult] = await Promise.allSettled([
      adminApi.getMetrics(),
      lostReportsApi.list({ limit: 500 }),
      foundReportsApi.list({ limit: 500 }),
    ]);

    if (metricsResult.status === "fulfilled") {
      setMetrics(metricsResult.value.data.data);
    }
    if (lostResult.status === "fulfilled") {
      setLostReports(lostResult.value.data.data);
    }
    if (foundResult.status === "fulfilled") {
      setFoundReports(foundResult.value.data.data);
    }

    if ([metricsResult, lostResult, foundResult].some((result) => result.status === "rejected")) {
      toast.error("Some analytics data could not be loaded.");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    queueMicrotask(() => {
      void load();
    });
  }, [isAdmin, load]);

  const analytics = useMemo(() => {
    const totalReported = lostReports.length + foundReports.length;
    const returnedFromReports =
      lostReports.filter((report) => report.status === "recovered").length +
      foundReports.filter((report) => report.status === "claimed" || report.status === "closed").length;
    const returned = Math.max(returnedFromReports, metrics?.handovers_completed ?? 0);
    const recoveryRate = totalReported ? (returned / totalReported) * 100 : 0;
    const avgDays = metrics?.avg_resolution_time_days ?? 0;
    return { totalReported, returned, recoveryRate, avgDays };
  }, [foundReports, lostReports, metrics]);

  const categoryRows = useMemo(() => {
    const counts = new Map<ItemCategory, number>();
    for (const report of [...lostReports, ...foundReports]) {
      counts.set(report.category, (counts.get(report.category) ?? 0) + 1);
    }
    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count], index) => ({
        category,
        count,
        percent: percent(count, total),
        color: categoryColor(index),
      }));
  }, [foundReports, lostReports]);

  const weekBuckets = useMemo(() => buildWeeklyBuckets(lostReports, foundReports), [foundReports, lostReports]);
  const maxVolume = Math.max(1, ...weekBuckets.flatMap((bucket) => [bucket.reported, bucket.returned]));
  const heatmapReports = useMemo(() => [...lostReports, ...foundReports].slice(0, 18), [foundReports, lostReports]);

  const exportReport = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total reported", analytics.totalReported],
      ["Items returned", analytics.returned],
      ["Recovery rate", `${analytics.recoveryRate.toFixed(1)}%`],
      ["Average reunion time", `${analytics.avgDays.toFixed(1)} days`],
      ["Claims total", metrics?.claims_total ?? 0],
      ["Claims pending", metrics?.claims_pending ?? 0],
      ["Claims approved", metrics?.claims_approved ?? 0],
      ["Claims rejected", metrics?.claims_rejected ?? 0],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "lost-found-analytics.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-dashed border-[#b8c6c4] bg-white p-10 text-center text-lg text-[#505a5c]">
        <ShieldCheck className="mx-auto mb-3 size-7 text-[#006d62]" />
        Admin access required.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1220px]">
      <div className="flex min-h-[50px] flex-col gap-4 border-b border-[#c9d4d2] pb-5 xl:flex-row xl:items-center xl:justify-end">
        <label className="relative block w-full max-w-[320px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#263234]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search records..."
            className="h-12 w-full rounded-full border border-[#b8c6c4] bg-white pl-12 pr-4 text-lg outline-none transition focus:border-[#007a6c] focus:ring-4 focus:ring-[#007a6c]/15"
          />
        </label>
        <div className="flex items-center gap-7 text-[#006056]">
          <Bell className="size-5" />
          <UserCircle className="size-7" />
        </div>
      </div>

      <div className="mt-9 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="font-heading text-[2.65rem] font-bold leading-none tracking-normal text-[#101417]">
            Analytics Overview
          </h1>
          <p className="mt-4 text-xl leading-7 text-[#273235]">
            System-wide performance and recovery metrics.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" className="h-12 rounded-lg border-[#b8c6c4] bg-white px-5 text-base font-bold">
            <CalendarDays className="mr-2 size-5" />
            Last 30 Days
          </Button>
          <Button onClick={exportReport} className="h-12 rounded-lg bg-[#007a6c] px-5 text-base font-bold text-white hover:bg-[#006e62]">
            <Download className="mr-2 size-5" />
            Export Report
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-9 space-y-8">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-[152px] rounded-xl" />)}
          </div>
          <Skeleton className="h-[430px] rounded-xl" />
        </div>
      ) : (
        <>
          <section className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Reported" value={analytics.totalReported.toLocaleString()} delta="+ live" icon={Bell} tone="red" />
            <MetricCard label="Items Returned" value={analytics.returned.toLocaleString()} delta={`${metrics?.claims_approved ?? 0} approved`} icon={CheckCircle2} tone="teal" />
            <MetricCard label="Recovery Rate" value={`${analytics.recoveryRate.toFixed(1)}%`} delta={`${metrics?.claims_pending ?? 0} pending`} icon={PieChart} tone="brown" />
            <MetricCard label="Avg. Reunion Time" value={`${analytics.avgDays.toFixed(1)}`} suffix="Days" delta={`${metrics?.claims_rejected ?? 0} rejected`} icon={Timer} tone="gray" />
          </section>

          <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_385px]">
            <section className="rounded-xl border border-[#b8c6c4] bg-white p-8 shadow-sm">
              <PanelHeader title="Reported vs. Returned Volume" />
              <div className="mt-9 border-y border-[#dfe6e5] py-5">
                <div className="flex h-[215px] items-end justify-around gap-7">
                  {weekBuckets.map((bucket) => (
                    <div key={bucket.label} className="flex h-full min-w-[80px] flex-col justify-end">
                      <div className="flex flex-1 items-end justify-center gap-3 border-b border-[#c7d1cf]">
                        <span
                          className="w-7 rounded-t-sm bg-[#bdcbc9]"
                          style={{ height: `${Math.max(8, (bucket.reported / maxVolume) * 185)}px` }}
                          title={`${bucket.reported} reported`}
                        />
                        <span
                          className="w-7 rounded-t-sm bg-[#007a6c]"
                          style={{ height: `${Math.max(8, (bucket.returned / maxVolume) * 185)}px` }}
                          title={`${bucket.returned} returned`}
                        />
                      </div>
                      <p className="mt-4 text-center text-base font-medium">{bucket.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex justify-center gap-8 text-lg text-[#273235]">
                <span className="flex items-center gap-3"><span className="size-3 rounded-full bg-[#bdcbc9]" />Reported Lost</span>
                <span className="flex items-center gap-3"><span className="size-3 rounded-full bg-[#007a6c]" />Returned</span>
              </div>
            </section>

            <section className="rounded-xl border border-[#b8c6c4] bg-white p-8 shadow-sm">
              <PanelHeader title="Items by Category" />
              <div className="mt-9 space-y-7">
                {categoryRows.length === 0 ? (
                  <p className="text-[#505a5c]">No report categories yet.</p>
                ) : (
                  categoryRows.map((row) => (
                    <div key={row.category}>
                      <div className="mb-2 flex items-center justify-between gap-4 text-lg">
                        <p className="flex min-w-0 items-center gap-3 font-bold">
                          <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                          <span className="truncate">{row.category}</span>
                        </p>
                        <span>{row.percent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#e4e7e7]">
                        <div className="h-full rounded-full" style={{ width: `${row.percent}%`, backgroundColor: row.color }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_385px]">
            <section className="overflow-hidden rounded-xl border border-[#b8c6c4] bg-white shadow-sm">
              <div className="flex flex-col gap-4 p-8 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-heading text-[1.75rem] font-bold tracking-normal">Campus Activity Heatmap</h2>
                  <p className="mt-2 text-lg text-[#273235]">
                    Concentration of lost/found reports across primary buildings.
                  </p>
                </div>
                <div className="flex rounded-lg bg-[#e7ebeb] p-1">
                  <button className="rounded-md bg-white px-5 py-2 font-medium shadow-sm">Lost</button>
                  <button className="rounded-md px-5 py-2 font-medium">Found</button>
                </div>
              </div>
              <div className="relative h-[400px] bg-[linear-gradient(135deg,#ccd6d5_0_18%,#eef2f1_18%_26%,#b9c8c7_26%_39%,#e5ebea_39%_52%,#bfd0ce_52%_67%,#e8eeee_67%_100%)] opacity-90">
                <div className="absolute inset-0 bg-[#dce7e6]/65" />
                <div className="absolute inset-x-[35%] inset-y-0 bg-[#6bbcb6]/20 blur-3xl" />
                {heatmapReports.map((report) => (
                  <span
                    key={report.id}
                    className="absolute size-5 rounded-full border border-white/60 bg-[#8ce4dc]/70 shadow-[0_0_22px_8px_rgba(0,122,108,0.22)]"
                    style={{
                      left: `${hashPosition(report.id, "x")}%`,
                      top: `${hashPosition(getReportLocation(report) || report.id, "y")}%`,
                    }}
                    title={report.itemTitle}
                  />
                ))}
                <div className="absolute bottom-6 right-6 grid gap-3">
                  <button className="flex size-10 items-center justify-center rounded bg-white text-2xl shadow">+</button>
                  <button className="flex size-10 items-center justify-center rounded bg-white text-2xl shadow">-</button>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[#b8c6c4] bg-white p-8 shadow-sm">
              <h2 className="font-heading text-[1.75rem] font-bold tracking-normal">Scheduled Reports</h2>
              <div className="mt-6 space-y-5">
                <ReportExportCard
                  title="Weekly Executive Summary"
                  description="Contains current recovery rates, volume changes, and claim decisions."
                  tag="PDF"
                  cadence="Generated every Monday"
                  onDownload={exportReport}
                />
                <ReportExportCard
                  title="Raw Data Export (CSV)"
                  description="Exports loaded item, status, category, and claim metric data."
                  tag="CSV"
                  cadence="On Demand"
                  onDownload={exportReport}
                />
              </div>
              <Button variant="outline" className="mt-6 h-12 w-full rounded-lg border-[#b8c6c4] bg-white text-lg font-bold">
                <Settings className="mr-2 size-5" />
                Manage Exports
              </Button>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  delta,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  delta: string;
  icon: typeof Bell;
  tone: "red" | "teal" | "brown" | "gray";
}) {
  const colors = {
    red: "bg-[#ffd9d5] text-[#c20000]",
    teal: "bg-[#008a7d] text-white",
    brown: "bg-[#b75d35] text-white",
    gray: "bg-[#e0e4e5] text-[#263234]",
  }[tone];

  return (
    <article className="rounded-xl border border-[#b8c6c4] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-base font-bold uppercase tracking-[0.14em] text-[#263234]">{label}</p>
        <span className={cn("flex size-11 items-center justify-center rounded-md", colors)}>
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-5 text-[2.65rem] font-bold leading-none">
        {value}
        {suffix && <span className="ml-2 text-xl font-medium">{suffix}</span>}
      </p>
      <p className="mt-3 text-base text-[#006d62]">{delta}</p>
    </article>
  );
}

function PanelHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="font-heading text-[1.75rem] font-bold tracking-normal">{title}</h2>
      <MoreVertical className="size-6 text-[#263234]" />
    </div>
  );
}

function ReportExportCard({
  title,
  description,
  tag,
  cadence,
  onDownload,
}: {
  title: string;
  description: string;
  tag: string;
  cadence: string;
  onDownload: () => void;
}) {
  return (
    <article className="rounded-lg border border-[#b8c6c4] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-bold text-[#101417]">{title}</h3>
        <button type="button" onClick={onDownload} aria-label={`Download ${title}`}>
          <Download className="size-5" />
        </button>
      </div>
      <p className="mt-4 text-lg leading-7 text-[#273235]">{description}</p>
      <div className="mt-5 flex items-center gap-3">
        <span className="rounded-md bg-[#eceeee] px-3 py-2 font-mono text-sm font-bold">{tag}</span>
        <span className="font-medium text-[#273235]">{cadence}</span>
      </div>
    </article>
  );
}
