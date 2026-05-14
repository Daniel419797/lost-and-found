"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  BookOpen,
  BriefcaseBusiness,
  Clock3,
  Download,
  FileText,
  Filter,
  KeyRound,
  Laptop,
  MapPin,
  Package,
  Plus,
  Search,
  Shirt,
  Trophy,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { foundReportsApi } from "@/services/foundReports";
import { uploadsApi } from "@/services/uploads";
import { cn } from "@/lib/utils";
import type { FoundReport, FoundReportStatus, ItemCategory } from "@/types";

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

const STATUS_OPTIONS: { value: FoundReportStatus; label: string }[] = [
  { value: "open", label: "Found" },
  { value: "verified", label: "Under Review" },
  { value: "claimed", label: "Claimed" },
  { value: "closed", label: "Closed" },
];

const ACCEPTED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const INITIAL_VISIBLE_COUNT = 6;

const foundReportSchema = z.object({
  itemTitle: z.string().min(1, "Item title is required").max(200),
  category: z.enum([
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
  ]),
  color: z.string().max(50).optional(),
  brand: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  locationFound: z.string().min(1, "Location is required").max(300),
  dateFound: z.string().min(1, "Date is required"),
  custodyLocation: z.string().max(300).optional(),
});

type FoundReportFormValues = z.infer<typeof foundReportSchema>;

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

function getStatusLabel(status: FoundReportStatus) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function statusClass(status: FoundReportStatus) {
  return {
    open: "bg-[#007a6c] text-white",
    verified: "bg-[#b5582e] text-white",
    claimed: "bg-[#e5e8e8] text-[#596365]",
    closed: "bg-[#e5e8e8] text-[#596365]",
  }[status];
}

export default function FoundReportsPage() {
  const [reports, setReports] = useState<FoundReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | ItemCategory>("all");
  const [status, setStatus] = useState<"all" | FoundReportStatus>("all");
  const [date, setDate] = useState("");

  const form = useForm<FoundReportFormValues>({
    resolver: zodResolver(foundReportSchema) as Resolver<FoundReportFormValues>,
    defaultValues: {
      itemTitle: "",
      category: "Other",
      color: "",
      brand: "",
      description: "",
      locationFound: "",
      dateFound: "",
      custodyLocation: "",
    },
  });

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const res = await foundReportsApi.list({ limit: 200 });
      setReports(res.data.data);
    } catch {
      toast.error("Failed to load found reports.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialReports = async () => {
      setIsLoading(true);
      try {
        const res = await foundReportsApi.list({ limit: 200 });
        if (!isMounted) return;
        setReports(res.data.data);
      } catch {
        if (!isMounted) return;
        toast.error("Failed to load found reports.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadInitialReports();

    return () => {
      isMounted = false;
    };
  }, []);

  const resetPhotoInput = () => {
    setSelectedPhoto(null);
    setPhotoInputKey((key) => key + 1);
  };

  const handlePhotoSelected = (file: File | null) => {
    if (!file) {
      setSelectedPhoto(null);
      return;
    }

    if (!ACCEPTED_PHOTO_TYPES.has(file.type)) {
      toast.error("Photo must be a JPEG, PNG, or WebP image.");
      resetPhotoInput();
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Photo must be 5MB or smaller.");
      resetPhotoInput();
      return;
    }

    setSelectedPhoto(file);
  };

  const onSubmit = async (values: FoundReportFormValues) => {
    setIsSubmitting(true);
    try {
      const uploadedPhoto = selectedPhoto ? await uploadsApi.uploadItemPhoto(selectedPhoto) : null;

      await foundReportsApi.create({
        itemTitle: values.itemTitle,
        category: values.category,
        color: values.color || undefined,
        brand: values.brand || undefined,
        description: values.description || undefined,
        imageUrls: uploadedPhoto ? [uploadedPhoto.url] : undefined,
        locationFound: values.locationFound,
        dateFound: values.dateFound,
        custodyLocation: values.custodyLocation || undefined,
      });

      toast.success("Found report submitted.");
      form.reset();
      resetPhotoInput();
      setIsReportDialogOpen(false);
      await loadReports();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to submit report. Please try again.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeReportDialog = (open: boolean) => {
    setIsReportDialogOpen(open);
    if (!open && !isSubmitting) {
      form.reset();
      resetPhotoInput();
    }
  };

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter((report) => {
      const searchable = [
        report.id,
        report.itemTitle,
        report.description,
        report.locationFound,
        report.custodyLocation,
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
      const matchesDate = !date || report.dateFound.slice(0, 10) === date;

      return matchesSearch && matchesCategory && matchesStatus && matchesDate;
    });
  }, [category, date, reports, search, status]);

  const visibleReports = filteredReports.slice(0, visibleCount);
  const canLoadMore = visibleCount < filteredReports.length;

  const exportReports = () => {
    const headers = ["ID", "Item", "Category", "Status", "Location", "Date Found"];
    const rows = filteredReports.map((report) => [
      report.id,
      report.itemTitle,
      report.category,
      getStatusLabel(report.status),
      report.locationFound,
      report.dateFound,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "found-reports.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-[1220px]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="font-heading text-[2.7rem] font-bold leading-none tracking-normal text-[#101417]">
            Found Reports
          </h1>
          <p className="mt-4 text-xl leading-7 text-[#505a5c]">
            Browse and manage items that have been turned in.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/found-reports/new"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-[#007a6c] px-5 text-base font-bold text-white transition hover:bg-[#006e62]"
          >
            <Plus className="mr-2 size-5" />
            Report Found Item
          </Link>
          <Button
            type="button"
            variant="outline"
            onClick={exportReports}
            className="h-12 rounded-lg border-[#b8c6c4] bg-white px-5 text-base font-bold text-[#101417] hover:border-[#007a6c]"
          >
            <Download className="mr-2 size-5" />
            Export
          </Button>
        </div>
      </div>

      <section className="mt-9 rounded-xl border border-[#e3e7e6] bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_180px_180px_115px_170px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-6 -translate-y-1/2 text-[#505a5c]" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by item name, ID, or description..."
              className="h-[60px] rounded-lg border-[#b8c6c4] bg-white pl-14 text-lg text-[#182224] placeholder:text-[#b2b9ba] focus-visible:border-[#007a6c] focus-visible:ring-[#007a6c]/20"
            />
          </label>

          <Select value={category} onValueChange={(value) => setCategory(value as "all" | ItemCategory)}>
            <SelectTrigger className="h-[60px] w-full rounded-lg border-[#b8c6c4] bg-white px-4 text-lg text-[#182224]">
              <span className="truncate text-left">
                Category: {category === "all" ? "All" : category}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Category: All</SelectItem>
              {CATEGORIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(value) => setStatus(value as "all" | FoundReportStatus)}>
            <SelectTrigger className="h-[60px] w-full rounded-lg border-[#b8c6c4] bg-white px-4 text-lg text-[#182224]">
              <span className="truncate text-left">
                Status: {status === "all" ? "All" : getStatusLabel(status)}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: All</SelectItem>
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
              className="h-[60px] rounded-lg border-[#b8c6c4] bg-white px-4 text-base text-[#182224] focus-visible:border-[#007a6c] focus-visible:ring-[#007a6c]/20"
            />
          </label>

          <Button
            type="button"
            variant="secondary"
            className="h-[60px] rounded-lg border border-[#b8c6c4] bg-white text-lg font-bold text-[#101417] hover:border-[#007a6c] hover:bg-white"
          >
            <Filter className="mr-3 size-5" />
            More Filters
          </Button>
        </div>
      </section>

      <section className="mt-10 grid gap-7 lg:grid-cols-2 2xl:grid-cols-3">
        {isLoading ? (
          [1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-[175px] rounded-xl" />)
        ) : visibleReports.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-[#b8c6c4] bg-white p-10 text-center text-lg text-[#505a5c]">
            No found reports match your filters.
          </div>
        ) : (
          visibleReports.map((report) => <FoundReportCard key={report.id} report={report} />)
        )}
      </section>

      {canLoadMore && (
        <div className="mt-12 flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setVisibleCount((count) => count + INITIAL_VISIBLE_COUNT)}
            className="h-12 rounded-lg border-[#b8c6c4] bg-white px-9 text-lg font-bold text-[#101417] hover:border-[#007a6c]"
          >
            Load More Reports
          </Button>
        </div>
      )}

      <Dialog open={isReportDialogOpen} onOpenChange={closeReportDialog}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-white p-6 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#101417]">Report Found Item</DialogTitle>
            <DialogDescription>
              Add where the item was found, custody details, and an optional photo.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="itemTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Silver MacBook Pro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateFound"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Found *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Silver" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Apple" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="locationFound"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Found *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Main Library, 3rd Floor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="custodyLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custody Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Security Desk" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Visible details that can help the owner identify this item."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#182224]">Item Photo</label>
                <Input
                  key={photoInputKey}
                  accept="image/jpeg,image/png,image/webp"
                  type="file"
                  onChange={(event) => handlePhotoSelected(event.target.files?.[0] ?? null)}
                />
                {selectedPhoto && (
                  <p className="truncate text-xs text-muted-foreground">{selectedPhoto.name}</p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-[#e0e5e4] pt-5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => closeReportDialog(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#007a6c] text-white hover:bg-[#006e62]"
                >
                  {isSubmitting ? "Submitting..." : "Submit Found Report"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FoundReportCard({ report }: { report: FoundReport }) {
  const visual = getReportVisual(report);
  const Icon = visual.Icon;
  const photoUrl = report.imageUrls?.find(Boolean);

  return (
    <Link
      href={`/found-reports/${report.id}`}
      className="grid min-h-[175px] gap-5 rounded-xl border border-[#e0e5e4] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:grid-cols-[120px_minmax(0,1fr)]"
    >
      <div className="relative h-[120px] overflow-hidden rounded-lg bg-[#e0e4e5]">
        {photoUrl ? (
          <div
            aria-label={`${report.itemTitle} photo`}
            className="h-full w-full bg-cover bg-center"
            role="img"
            style={{ backgroundImage: `url(${JSON.stringify(photoUrl)})` }}
          />
        ) : (
          <div className={cn("flex h-full w-full items-center justify-center", visual.tone)}>
            <Icon className="size-11" strokeWidth={2.4} />
          </div>
        )}
      </div>

      <div className="min-w-0 py-1">
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="truncate text-base font-bold uppercase tracking-[0.16em] text-[#626d70]">
            {report.category}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-sm font-semibold leading-none",
              statusClass(report.status),
            )}
          >
            {getStatusLabel(report.status)}
          </span>
        </div>
        <h2 className="truncate font-heading text-xl font-bold leading-6 tracking-normal text-[#101417]">
          {report.itemTitle}
        </h2>
        <p className="mt-2 flex items-center gap-2 text-lg text-[#505a5c]">
          <MapPin className="size-5 shrink-0" />
          <span className="truncate">{report.locationFound}</span>
        </p>
        <p className="mt-2 flex items-center gap-2 text-lg text-[#505a5c]">
          <Clock3 className="size-5 shrink-0" />
          <span>{formatReportDate(report.dateFound)}</span>
        </p>
      </div>
    </Link>
  );
}
