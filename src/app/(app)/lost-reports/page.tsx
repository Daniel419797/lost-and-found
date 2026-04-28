"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { lostReportsApi } from "@/services/lostReports";
import type { ItemCategory, LostReport } from "@/types";

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

const STATUS_COLORS: Record<LostReport["status"], string> = {
  open: "bg-blue-100 text-blue-800",
  matched: "bg-yellow-100 text-yellow-800",
  recovered: "bg-green-100 text-green-800",
  closed_unrecovered: "bg-gray-100 text-gray-600",
};

const schema = z.object({
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
  locationLost: z.string().min(1, "Location is required").max(300),
  dateLost: z.string().min(1, "Date is required"),
});

type FormValues = z.infer<typeof schema>;

export default function LostReportsPage() {
  const [reports, setReports] = useState<LostReport[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
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

  const fetchReports = async () => {
    try {
      const res = await lostReportsApi.listMine();
      setReports(res.data.data);
    } catch {
      toast.error("Failed to load your lost reports.");
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadReports = async () => {
      try {
        const res = await lostReportsApi.listMine();
        if (!isMounted) return;
        setReports(res.data.data);
      } catch {
        if (!isMounted) return;
        toast.error("Failed to load your lost reports.");
      } finally {
        if (isMounted) setIsLoadingList(false);
      }
    };
    void loadReports();

    return () => {
      isMounted = false;
    };
  }, []);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await lostReportsApi.create({
        itemTitle: values.itemTitle,
        category: values.category,
        color: values.color || undefined,
        brand: values.brand || undefined,
        description: values.description || undefined,
        locationLost: values.locationLost,
        dateLost: values.dateLost,
      });
      toast.success("Lost report submitted!");
      form.reset();
      await fetchReports();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to submit report. Please try again.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lost Reports</h1>
        <p className="text-muted-foreground">Report an item you have lost on campus.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Submit form */}
        <Card>
          <CardHeader>
            <CardTitle>Report a Lost Item</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="itemTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Blue Laptop Bag" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Black" {...field} />
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional details to help identify the item…"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting…" : "Submit Lost Report"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Reports list */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">My Lost Reports</h2>
          {isLoadingList ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              No lost reports yet. Use the form to report a lost item.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-xl border bg-background p-4 shadow-sm space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{report.itemTitle}</p>
                    <Badge
                      variant="secondary"
                      className={STATUS_COLORS[report.status]}
                    >
                      {report.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {report.category}
                    {report.color ? ` · ${report.color}` : ""}
                    {report.brand ? ` · ${report.brand}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    📍 {report.locationLost} &nbsp;·&nbsp;{" "}
                    {format(new Date(report.dateLost), "dd MMM yyyy")}
                  </p>
                  {report.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {report.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
