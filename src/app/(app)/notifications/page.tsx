"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import {
  AlarmClock,
  Bell,
  CalendarDays,
  CheckCircle2,
  Handshake,
  Network,
  RefreshCw,
  Search,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { notificationsApi, type NotificationRow } from "@/services/notifications";
import { cn } from "@/lib/utils";

type FilterKey = "all" | "match" | "claim" | "handover" | "system";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All Updates" },
  { key: "match", label: "Match" },
  { key: "claim", label: "Claim" },
  { key: "handover", label: "Handover" },
  { key: "system", label: "System" },
];

function getFilterForType(type: string): FilterKey {
  if (type.includes("match")) return "match";
  if (type.includes("claim")) return "claim";
  if (type.includes("handover")) return "handover";
  return "system";
}

function groupLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Earlier";
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return `Yesterday, ${format(date, "h:mm a")}`;
  return format(date, "MMM d, h:mm a");
}

function getClaimHref(row: NotificationRow) {
  const meta = row.meta_json ?? {};
  const claimId = typeof meta.claimId === "string" ? meta.claimId : undefined;
  if (claimId) return `/claims/${claimId}`;
  return null;
}

export default function NotificationsPage() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const res = await notificationsApi.list({ status: "all" });
      setRows(res.data.data.rows || []);
    } catch {
      toast.error("Failed to load notifications.");
    } finally {
      if (mode === "refresh") {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter((row) => activeFilter === "all" || getFilterForType(row.type) === activeFilter)
      .filter((row) => {
        if (!term) return true;
        return [row.title, row.body, row.type].join(" ").toLowerCase().includes(term);
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [activeFilter, rows, search]);

  const groupedRows = useMemo(() => {
    const groups = new Map<string, NotificationRow[]>();
    for (const row of filteredRows) {
      const label = groupLabel(row.created_at);
      groups.set(label, [...(groups.get(label) ?? []), row]);
    }
    return Array.from(groups.entries());
  }, [filteredRows]);

  const unreadCount = rows.filter((row) => !row.is_read).length;

  const handleMarkRead = async (id: string) => {
    setIsSubmitting(true);
    try {
      await notificationsApi.markRead(id);
      await load();
    } catch {
      toast.error("Failed to mark notification as read.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAllRead = async () => {
    setIsSubmitting(true);
    try {
      await notificationsApi.markAllRead();
      await load();
    } catch {
      toast.error("Failed to mark all notifications as read.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    await load("refresh");
  };

  return (
    <div className="mx-auto max-w-[1220px]">
      <div className="flex min-h-[50px] flex-col gap-4 border-b border-[#c9d4d2] pb-5 xl:flex-row xl:items-center xl:justify-end">
        <label className="relative block w-full max-w-[320px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#263234]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search..."
            className="h-12 w-full rounded-full border border-[#b8c6c4] bg-white pl-12 pr-4 text-lg outline-none transition focus:border-[#007a6c] focus:ring-4 focus:ring-[#007a6c]/15"
          />
        </label>
        <div className="flex items-center gap-7 text-[#006056]">
          <span className="relative">
            <Bell className="size-5" />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-[#c20000]" />}
          </span>
          <UserCircle className="size-7" />
        </div>
      </div>

      <div className="mt-9 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="font-heading text-[2.65rem] font-bold leading-none tracking-normal text-[#101417]">
            Notifications
          </h1>
          <p className="mt-4 text-xl leading-7 text-[#273235]">
            Stay updated on your recovery process and system alerts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || isSubmitting}
            className="h-10 rounded-lg border-[#b8c6c4] bg-white px-4 text-sm font-bold text-[#006d62] hover:border-[#007a6c]"
          >
            <RefreshCw className={cn("mr-2 size-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleMarkAllRead}
            disabled={isSubmitting || unreadCount === 0}
            className="h-10 w-fit px-3 text-sm font-bold text-[#006d62] hover:text-[#00584f]"
          >
            <CheckCircle2 className="mr-2 size-4" />
            Mark all as read
          </Button>
        </div>
      </div>

      <div className="mt-9 flex flex-wrap gap-3">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setActiveFilter(filter.key)}
            className={cn(
              "h-12 rounded-full border px-7 text-lg font-bold transition",
              activeFilter === filter.key
                ? "border-[#007a6c] bg-[#007a6c] text-white"
                : "border-[#b8c6c4] bg-white text-[#101417] hover:border-[#007a6c]",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <section className="mt-12 space-y-12">
        {isLoading ? (
          <>
            <Skeleton className="h-[205px] rounded-xl" />
            <Skeleton className="h-[205px] rounded-xl" />
          </>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#b8c6c4] bg-white p-10 text-center text-lg text-[#505a5c]">
            <Bell className="mx-auto mb-3 size-7 text-[#006d62]" />
            No notifications match this view.
          </div>
        ) : (
          groupedRows.map(([label, group]) => (
            <div key={label}>
              <div className="mb-6 border-b border-[#b8c6c4] pb-3">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#263234]">{label}</p>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                {group.map((row) => (
                  <NotificationCard
                    key={row.id}
                    row={row}
                    onMarkRead={handleMarkRead}
                    isSubmitting={isSubmitting}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function NotificationCard({
  row,
  onMarkRead,
  isSubmitting,
}: {
  row: NotificationRow;
  onMarkRead: (id: string) => void;
  isSubmitting: boolean;
}) {
  const filter = getFilterForType(row.type);
  const href = getClaimHref(row);
  const Icon = filter === "match" ? Network : filter === "handover" ? Handshake : filter === "claim" ? CheckCircle2 : AlarmClock;
  const highlighted = !row.is_read;
  const actionLabel = filter === "handover" ? "Open Pickup" : filter === "claim" ? "Open Claim" : "View Details";

  return (
    <article
      className={cn(
        "rounded-xl border bg-white p-7 shadow-sm",
        highlighted && "border-[#20b7ae] shadow-[inset_4px_0_0_#007a6c]",
        filter === "handover" && "shadow-[inset_4px_0_0_#9b421f]",
      )}
    >
      <div className="grid gap-5 sm:grid-cols-[60px_minmax(0,1fr)]">
        <div
          className={cn(
            "flex size-[60px] items-center justify-center rounded-full",
            filter === "match" && "bg-[#008a7d] text-white",
            filter === "claim" && "bg-[#bd704a] text-white",
            filter === "handover" && "bg-[#e4e1df] text-[#6b6764]",
            filter === "system" && "bg-[#e0e7e7] text-[#263234]",
          )}
        >
          <Icon className="size-8" />
        </div>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-heading text-xl font-bold leading-6 tracking-normal text-[#101417]">
              {row.title}
            </h2>
            <span className="shrink-0 text-sm text-[#505a5c]">{formatNotificationTime(row.created_at)}</span>
          </div>
          <p className="mt-2 text-lg leading-7 text-[#273235]">{row.body}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {filter === "handover" && (
              <span className="inline-flex min-h-12 items-center gap-3 rounded-md border border-[#b8c6c4] bg-[#f7f8f8] px-5 text-base">
                <CalendarDays className="size-5" />
                Handover update
              </span>
            )}
            {highlighted && (
              <button
                type="button"
                onClick={() => onMarkRead(row.id)}
                disabled={isSubmitting}
                className="rounded-md bg-[#eceeee] px-4 py-2 text-sm font-bold uppercase tracking-[0.14em] text-[#263234]"
              >
                Mark read
              </button>
            )}
            {href && (
              <Link
                href={href}
                className="inline-flex h-11 items-center rounded-md border border-[#d9b9a8] px-5 text-base font-bold text-[#9b421f] transition hover:border-[#9b421f]"
              >
                {actionLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
