"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  BookOpen,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  CircleAlert,
  FileText,
  Filter,
  KeyRound,
  Laptop,
  MapPin,
  Package,
  PackageCheck,
  Search,
  Shirt,
  Trophy,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { lostReportsApi } from "@/services/lostReports";
import { cn } from "@/lib/utils";
import type { ItemCategory, LostReport, LostReportStatus } from "@/types";

const CATEGORIES: ItemCategory[] = [
  "Electronics",
  "Clothing",
  "Accessories",
  "Documents",
  "Keys",
  "Bags",
  "Sports",
  "Books",
  "Food",
  "Other",
];

const STATUS_OPTIONS: { value: LostReportStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "matched", label: "Claimed" },
  { value: "recovered", label: "Found" },
  { value: "closed_unrecovered", label: "Closed" },
];

type ReportVisual = {
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: string;
};

function getReportVisual(report: LostReport): ReportVisual {
  const text = `${report.itemTitle} ${report.category} ${report.description ?? ""}`.toLowerCase();
  if (text.includes("key")) return { Icon: KeyRound, tone: "bg-[#dfe3e4] text-[#6d7476]" };
  if (report.category === "Electronics") return { Icon: Laptop, tone: "bg-[#dde8eb] text-[#007a6c]" };
  if (report.category === "Books") return { Icon: BookOpen, tone: "bg-[#e6e0d6] text-[#745833]" };
  if (report.category === "Documents") return { Icon: FileText, tone: "bg-[#e2e5ea] text-[#415063]" };
  if (report.category === "Clothing") return { Icon: Shirt, tone: "bg-[#e7e0e6] text-[#6b4d66]" };
  if (report.category === "Sports") return { Icon: Trophy, tone: "bg-[#e7e4d7] text-[#6a612d]" };
  if (report.category === "Food") return { Icon: Utensils, tone: "bg-[#eadfd8] text-[#7b4d35]" };
  if (report.category === "Bags") return { Icon: BriefcaseBusiness, tone: "bg-[#e0e4e5] text-[#4f6064]" };
  return { Icon: Package, tone: "bg-[#dfe3e4] text-[#667173]" };
}

function formatReportDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "MMM d, yyyy");
}

function getStatusLabel(status: LostReportStatus) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function statusClass(status: LostReportStatus) {
  return {
    open: "bg-[#ffd9d5] text-[#9b1c12]",
    matched: "bg-[#ebeff1] text-[#182224]",
    recovered: "bg-[#007a6c] text-white",
    closed_unrecovered: "bg-[#e5e7e8] text-[#4c5658]",
  }[status];
}

function StatusIcon({ status }: { status: LostReportStatus }) {
  if (status === "recovered") return <CheckCircle2 className="size-4" />;
  if (status === "matched") return <PackageCheck className="size-4" />;
  return <CircleAlert className="size-4" />;
}

export default function LostReportsPage() {
  const [reports, setReports] = useState<LostReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | ItemCategory>("all");
  const [status, setStatus] = useState<"all" | LostReportStatus>("all");
  const [date, setDate] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadReports = async () => {
      setIsLoading(true);
      try {
        const res = await lostReportsApi.list({ limit: 200 });
        if (!isMounted) return;
        setReports(res.data.data);
      } catch {
        if (!isMounted) return;
        toast.error("Failed to load lost reports.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadReports();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter((report) => {
      const searchable = [
        report.id,
        report.itemTitle,
        report.description,
        report.locationLost,
        report.category,
        report.color,
        report.brand,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || searchable.includes(term);
      const matchesCategory = category === "all" || report.category === category;
      const matchesStatus = status === "all" || report.status === status;
      const matchesDate = !date || report.dateLost.slice(0, 10) === date;

      return matchesSearch && matchesCategory && matchesStatus && matchesDate;
    });
  }, [category, date, reports, search, status]);

  return (
    <div className="mx-auto max-w-[1220px]">
      <h1 className="font-heading text-[2.7rem] font-bold leading-none tracking-normal text-[#101417]">
        Lost Reports
      </h1>

      <section className="mt-9 rounded-xl border border-[#e3e7e6] bg-white p-6 shadow-sm">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-5 top-1/2 size-6 -translate-y-1/2 text-[#505a5c]" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search item name or ID..."
            className="h-[62px] rounded-lg border-[#b8c6c4] bg-white pl-16 text-base text-[#182224] placeholder:text-[#5f686b] focus-visible:border-[#007a6c] focus-visible:ring-[#007a6c]/20 sm:text-xl"
          />
        </label>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr_1fr_205px]">
          <Select value={category} onValueChange={(value) => setCategory(value as "all" | ItemCategory)}>
            <SelectTrigger className="h-[58px] w-full rounded-lg border-[#b8c6c4] bg-white px-4 text-lg text-[#182224]">
              <span className="truncate text-left">
                {category === "all" ? "All Categories" : category}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(value) => setStatus(value as "all" | LostReportStatus)}>
            <SelectTrigger className="h-[58px] w-full rounded-lg border-[#b8c6c4] bg-white px-4 text-lg text-[#182224]">
              <span className="truncate text-left">
                {status === "all" ? "Any Status" : getStatusLabel(status)}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Status</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label>
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-[58px] rounded-lg border-[#b8c6c4] bg-white px-4 text-lg text-[#182224] focus-visible:border-[#007a6c] focus-visible:ring-[#007a6c]/20"
            />
          </label>

          <Button
            type="button"
            variant="secondary"
            className="h-[58px] rounded-lg bg-[#e0e3e4] text-lg font-bold text-[#101417] hover:bg-[#d8dddd]"
          >
            <Filter className="mr-3 size-6" />
            More Filters
          </Button>
        </div>
      </section>

      <section className="mt-10 grid gap-7 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          [1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-[475px] rounded-xl" />)
        ) : filteredReports.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-[#b8c6c4] bg-white p-10 text-center text-lg text-[#505a5c]">
            No lost reports match your filters.
          </div>
        ) : (
          filteredReports.map((report) => <ReportCard key={report.id} report={report} />)
        )}
      </section>
    </div>
  );
}

function ReportCard({ report }: { report: LostReport }) {
  const visual = getReportVisual(report);
  const Icon = visual.Icon;
  const photoUrl = report.imageUrls?.find(Boolean);

  return (
    <article className="overflow-hidden rounded-xl border border-[#e0e5e4] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[1.15] overflow-hidden rounded-lg bg-[#dfe3e4]">
        {photoUrl ? (
          <div
            aria-label={`${report.itemTitle} photo`}
            className="h-full w-full bg-cover bg-center"
            role="img"
            style={{ backgroundImage: `url(${JSON.stringify(photoUrl)})` }}
          />
        ) : (
          <div className={cn("flex h-full w-full items-center justify-center", visual.tone)}>
            <Icon className="size-20" strokeWidth={2.5} />
          </div>
        )}
        <span
          className={cn(
            "absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-bold shadow-sm",
            statusClass(report.status),
          )}
        >
          <StatusIcon status={report.status} />
          {getStatusLabel(report.status)}
        </span>
      </div>

      <div className="pt-6">
        <h2 className="truncate font-heading text-[1.65rem] font-bold leading-tight tracking-normal text-[#101417]">
          {report.itemTitle}
        </h2>

        <div className="mt-3 space-y-2 text-lg text-[#505a5c]">
          <p className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0" />
            <span className="min-w-0 leading-6">{report.locationLost}</span>
          </p>
          <p className="flex items-center gap-3">
            <Calendar className="size-5 shrink-0" />
            <span>{formatReportDate(report.dateLost)}</span>
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Tag className="bg-[#c7e4e1] text-[#007a6c]">{report.category}</Tag>
          {report.color && <Tag>{report.color}</Tag>}
          {!report.color && report.brand && <Tag>{report.brand}</Tag>}
        </div>
      </div>
    </article>
  );
}

function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "max-w-full truncate rounded-md bg-[#eceeee] px-3 py-1.5 text-sm font-bold tracking-[0.08em] text-[#2f3b3d]",
        className,
      )}
    >
      {children}
    </span>
  );
}
