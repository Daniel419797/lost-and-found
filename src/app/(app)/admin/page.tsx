"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Download,
  MoreVertical,
  PieChart,
  Search,
  ShieldCheck,
  Timer,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { adminApi, type AdminMetrics, type AdminUser, type AuditLogRow } from "@/services/admin";
import { foundReportsApi } from "@/services/foundReports";
import { lostReportsApi } from "@/services/lostReports";
import { cn } from "@/lib/utils";
import type { FoundReport, ItemCategory, LostReport, UserRole } from "@/types";

type WeekBucket = {
  label: string;
  reported: number;
  returned: number;
};

async function loadAllLostReports(): Promise<LostReport[]> {
  const rows: LostReport[] = [];
  let offset = 0;
  const limit = 200;

  while (true) {
    const res = await lostReportsApi.list({ limit, offset });
    rows.push(...res.data.data);
    if (rows.length >= res.data.total || res.data.data.length === 0) return rows;
    offset += res.data.data.length;
  }
}

async function loadAllFoundReports(): Promise<FoundReport[]> {
  const rows: FoundReport[] = [];
  let offset = 0;
  const limit = 200;

  while (true) {
    const res = await foundReportsApi.list({ limit, offset });
    rows.push(...res.data.data);
    if (rows.length >= res.data.total || res.data.data.length === 0) return rows;
    offset += res.data.data.length;
  }
}

async function loadAllAdminUsers(): Promise<AdminUser[]> {
  const rows: AdminUser[] = [];
  let offset = 0;
  const limit = 200;

  while (true) {
    const res = await adminApi.getUsers({ limit, offset });
    rows.push(...res.data.data.rows);
    if (rows.length >= res.data.data.total || res.data.data.rows.length === 0) return rows;
    offset += res.data.data.rows.length;
  }
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function categoryColor(index: number) {
  return ["#007a6c", "#9b421f", "#758281", "#606060", "#c8d3d2"][index % 5];
}

function getReportLocation(report: LostReport | FoundReport) {
  return "locationLost" in report ? report.locationLost : report.locationFound;
}

function buildWeeklyBuckets(lostReports: LostReport[], foundReports: FoundReport[]): WeekBucket[] {
  const dayMs = 86_400_000;
  const now = Date.now();
  const windowStart = now - 35 * dayMs;
  const labels = ["4w ago", "3w ago", "2w ago", "Last week", "This week"];
  const buckets: WeekBucket[] = labels.map((label) => ({
    label,
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

  const bucketFor = (value: string): number | null => {
    const time = new Date(value).getTime();
    if (!Number.isFinite(time) || time < windowStart || time > now) return null;
    return Math.min(4, Math.floor((time - windowStart) / (7 * dayMs)));
  };

  for (const report of allReports) {
    const reportedBucket = bucketFor(report.createdAt);
    if (reportedBucket !== null) buckets[reportedBucket].reported += 1;
    const returnedBucket = report.returned ? bucketFor(report.updatedAt) : null;
    if (returnedBucket !== null) buckets[returnedBucket].returned += 1;
  }

  return buckets;
}

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [lostReports, setLostReports] = useState<LostReport[]>([]);
  const [foundReports, setFoundReports] = useState<FoundReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    const [metricsResult, lostResult, foundResult, auditResult, usersResult] =
      await Promise.allSettled([
        adminApi.getMetrics(),
        loadAllLostReports(),
        loadAllFoundReports(),
        adminApi.getAuditLogs({ limit: 12, offset: 0 }),
        loadAllAdminUsers(),
      ]);

    if (metricsResult.status === "fulfilled") {
      setMetrics(metricsResult.value.data.data);
    }
    if (lostResult.status === "fulfilled") {
      setLostReports(lostResult.value);
    }
    if (foundResult.status === "fulfilled") {
      setFoundReports(foundResult.value);
    }
    if (auditResult.status === "fulfilled") {
      setAuditLogs(auditResult.value.data.data.rows ?? []);
    }
    if (usersResult.status === "fulfilled") {
      setAdminUsers(usersResult.value);
    }

    if (
      [metricsResult, lostResult, foundResult, auditResult, usersResult].some(
        (result) => result.status === "rejected",
      )
    ) {
      toast.error("Some admin data could not be loaded.");
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
  const locationRows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const report of [...lostReports, ...foundReports]) {
      const location = getReportLocation(report).trim();
      if (!location) continue;
      counts.set(location, (counts.get(location) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([location, count]) => ({ location, count }));
  }, [foundReports, lostReports]);
  const maxLocationCount = Math.max(1, ...locationRows.map((row) => row.count));
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return adminUsers;
    return adminUsers.filter((entry) =>
      [entry.displayName, entry.email, entry.role].join(" ").toLowerCase().includes(term),
    );
  }, [adminUsers, search]);

  const updateRole = async (target: AdminUser, role: UserRole) => {
    if (target.role === role) return;
    setRoleUpdatingId(target.id);
    try {
      const res = await adminApi.updateUserRole(target.id, role);
      setAdminUsers((rows) => rows.map((row) => (row.id === target.id ? res.data.data : row)));
      toast.success(`${target.displayName}'s role updated to ${role.replace("_", " ")}.`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to update user role.";
      toast.error(message);
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const downloadCsv = (fileName: string, rows: Array<Array<string | number>>) => {
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportReport = () => {
    downloadCsv("lost-found-analytics.csv", [
      ["Metric", "Value"],
      ["Total reported", analytics.totalReported],
      ["Items returned", analytics.returned],
      ["Recovery rate", `${analytics.recoveryRate.toFixed(1)}%`],
      ["Average reunion time", `${analytics.avgDays.toFixed(1)} days`],
      ["Claims total", metrics?.claims_total ?? 0],
      ["Claims pending", metrics?.claims_pending ?? 0],
      ["Claims approved", metrics?.claims_approved ?? 0],
      ["Claims rejected", metrics?.claims_rejected ?? 0],
    ]);
  };

  const exportRawData = () => {
    const rows: Array<Array<string | number>> = [
      ["Type", "ID", "Item", "Category", "Status", "Location", "Event date", "Created at"],
      ...lostReports.map((report) => [
        "lost",
        report.id,
        report.itemTitle,
        report.category,
        report.status,
        report.locationLost,
        report.dateLost,
        report.createdAt ?? "",
      ]),
      ...foundReports.map((report) => [
        "found",
        report.id,
        report.itemTitle,
        report.category,
        report.status,
        report.locationFound,
        report.dateFound,
        report.createdAt ?? "",
      ]),
    ];
    downloadCsv("lost-found-report-data.csv", rows);
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
            placeholder="Search users..."
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
          <span className="inline-flex h-12 items-center rounded-lg border border-[#b8c6c4] bg-white px-5 text-base font-bold text-[#273235]">
            All-time data
          </span>
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
              <PanelHeader title="Last 5 Weeks — Reported vs. Returned" />
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
            <section className="rounded-xl border border-[#b8c6c4] bg-white p-8 shadow-sm">
              <h2 className="font-heading text-[1.75rem] font-bold tracking-normal">Top Reported Locations</h2>
              <p className="mt-2 text-lg text-[#273235]">
                Ranked from the actual location text on lost and found reports.
              </p>
              <div className="mt-7 space-y-5">
                {locationRows.length === 0 ? (
                  <p className="text-[#505a5c]">No report locations yet.</p>
                ) : (
                  locationRows.map((row) => (
                    <div key={row.location}>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className="truncate font-bold text-[#101417]">{row.location}</span>
                        <span className="shrink-0 text-sm text-[#505a5c]">{row.count} reports</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#e4e7e7]">
                        <div
                          className="h-full rounded-full bg-[#007a6c]"
                          style={{ width: `${Math.max(8, (row.count / maxLocationCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-[#b8c6c4] bg-white p-8 shadow-sm">
              <h2 className="font-heading text-[1.75rem] font-bold tracking-normal">Report Exports</h2>
              <div className="mt-6 space-y-5">
                <ReportExportCard
                  title="Analytics Summary"
                  description="Exports the current recovery, claim, and handover metrics shown on this page."
                  tag="CSV"
                  cadence="On Demand"
                  onDownload={exportReport}
                />
                <ReportExportCard
                  title="Raw Report Data"
                  description="Exports the loaded lost and found records with status, category, location, and dates."
                  tag="CSV"
                  cadence="On Demand"
                  onDownload={exportRawData}
                />
              </div>

            </section>
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-2">
            <section className="rounded-xl border border-[#b8c6c4] bg-white p-8 shadow-sm">
              <h2 className="font-heading text-[1.75rem] font-bold tracking-normal">Recent Audit Activity</h2>
              <p className="mt-2 text-base text-[#505a5c]">Latest security and workflow events recorded by the backend.</p>
              <div className="mt-6 space-y-3">
                {auditLogs.length === 0 ? (
                  <p className="text-[#505a5c]">No audit events yet.</p>
                ) : (
                  auditLogs.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-[#e0e5e4] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-sm font-bold text-[#006d62]">{entry.action}</span>
                        <span className="text-sm text-[#505a5c]">{new Date(entry.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 text-sm text-[#273235]">
                        {entry.resource ?? "system"}{entry.resourceId ? ` · ${entry.resourceId}` : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-[#b8c6c4] bg-white p-8 shadow-sm">
              <h2 className="font-heading text-[1.75rem] font-bold tracking-normal">User Directory</h2>
              <p className="mt-2 text-base text-[#505a5c]">
                {user?.role === "super_admin"
                  ? "Review accounts and assign operational roles."
                  : "Review registered accounts. Role changes require a super admin."}
              </p>
              <div className="mt-6 space-y-3">
                {filteredUsers.length === 0 ? (
                  <p className="text-[#505a5c]">No users match the current search.</p>
                ) : (
                  filteredUsers.slice(0, 30).map((entry) => (
                    <div key={entry.id} className="grid gap-3 rounded-lg border border-[#e0e5e4] p-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-[#101417]">{entry.displayName}</p>
                        <p className="truncate text-sm text-[#505a5c]">{entry.email}</p>
                        <p className="mt-1 truncate text-xs text-[#697477]">
                          {entry.studentStaffId ?? "No ID"}{entry.department ? ` · ${entry.department}` : ""}
                        </p>
                      </div>
                      {user?.role === "super_admin" ? (
                        <select
                          value={entry.role}
                          onChange={(event) => void updateRole(entry, event.target.value as UserRole)}
                          disabled={roleUpdatingId === entry.id || entry.id === user.id}
                          className="h-10 rounded-md border border-[#b8c6c4] bg-white px-3 text-sm font-bold capitalize"
                        >
                          <option value="student">Student</option>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super admin</option>
                        </select>
                      ) : (
                        <span className="text-sm font-bold capitalize text-[#273235]">{entry.role.replace("_", " ")}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
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
