"use client";

import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Plus,
  Search,
  Shirt,
  Trophy,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { lostReportsApi } from "@/services/lostReports";
import { uploadsApi } from "@/services/uploads";
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

const ACCEPTED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const lostReportSchema = z.object({
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
  description: z.string().min(1, "Description is required").max(1000),
  locationLost: z.string().min(1, "Location is required").max(300),
  dateLost: z.string().min(1, "Date is required"),
});

type LostReportFormValues = z.infer<typeof lostReportSchema>;

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
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | ItemCategory>("all");
  const [status, setStatus] = useState<"all" | LostReportStatus>("all");
  const [date, setDate] = useState("");

  const form = useForm<LostReportFormValues>({
    resolver: zodResolver(lostReportSchema) as Resolver<LostReportFormValues>,
    defaultValues: {
      itemTitle: "",
      category: "Other",
      color: "",
      brand: "",
      description: "",
      locationLost: "",
      dateLost: "",
    },
  });

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const res = await lostReportsApi.list({ limit: 200 });
      setReports(res.data.data);
    } catch {
      toast.error("Failed to load lost reports.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialReports = async () => {
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

  const onSubmit = async (values: LostReportFormValues) => {
    setIsSubmitting(true);
    try {
      const uploadedPhoto = selectedPhoto ? await uploadsApi.uploadItemPhoto(selectedPhoto) : null;

      await lostReportsApi.create({
        itemTitle: values.itemTitle,
        category: values.category,
        color: values.color || undefined,
        brand: values.brand || undefined,
        description: values.description,
        imageUrls: uploadedPhoto ? [uploadedPhoto.url] : undefined,
        locationLost: values.locationLost,
        dateLost: values.dateLost,
      });

      toast.success("Lost report submitted.");
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
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-[2.7rem] font-bold leading-none tracking-normal text-[#101417]">
            Lost Reports
          </h1>
          <p className="mt-3 text-lg text-[#505a5c]">
            Report missing items with a photo so matches are easier to verify.
          </p>
        </div>

        <Link
          href="/lost-reports/new"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-[#007a6c] px-5 text-base font-bold text-white transition hover:bg-[#006e62]"
        >
          <Plus className="mr-2 size-5" />
          Report Lost Item
        </Link>
      </div>

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

      <Dialog open={isReportDialogOpen} onOpenChange={closeReportDialog}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-white p-6 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#101417]">Report Lost Item</DialogTitle>
            <DialogDescription>
              Add clear details and an optional photo to help staff and finders identify the item.
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
                      <Input placeholder="e.g. Blue laptop bag" {...field} />
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
                  name="dateLost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Lost *</FormLabel>
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
                        <Input placeholder="e.g. Navy" {...field} />
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
                        <Input placeholder="e.g. Jansport" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="locationLost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Lost *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Library 2nd Floor" {...field} />
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
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Distinguishing marks, contents, stickers, serial number, or anything only the owner would know."
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
                  {isSubmitting ? "Submitting..." : "Submit Lost Report"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
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
