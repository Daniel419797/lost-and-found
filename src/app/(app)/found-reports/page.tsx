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
import { foundReportsApi } from "@/services/foundReports";
import type { FoundReport, ItemCategory } from "@/types";

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

const STATUS_COLORS: Record<FoundReport["status"], string> = {
  open: "bg-blue-100 text-blue-800",
  claimed: "bg-yellow-100 text-yellow-800",
  verified: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
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
  locationFound: z.string().min(1, "Location is required").max(300),
  dateFound: z.string().min(1, "Date is required"),
  custodyLocation: z.string().max(300).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function FoundReportsPage() {
  const [reports, setReports] = useState<FoundReport[]>([]);
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
      locationFound: "",
      dateFound: "",
      custodyLocation: "",
    },
  });

  const fetchReports = async () => {
    try {
      const res = await foundReportsApi.listMine();
      setReports(res.data.data);
    } catch {
      toast.error("Failed to load your found reports.");
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadReports = async () => {
      try {
        const res = await foundReportsApi.listMine();
        if (!isMounted) return;
        setReports(res.data.data);
      } catch {
        if (!isMounted) return;
        toast.error("Failed to load your found reports.");
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
      await foundReportsApi.create({
        itemTitle: values.itemTitle,
        category: values.category,
        color: values.color || undefined,
        brand: values.brand || undefined,
        description: values.description || undefined,
        locationFound: values.locationFound,
        dateFound: values.dateFound,
        custodyLocation: values.custodyLocation || undefined,
      });
      toast.success("Found report submitted!");
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
        <h1 className="text-2xl font-bold">Found Reports</h1>
        <p className="text-muted-foreground">
          Report an item you have found on campus so the owner can reclaim it.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Submit form */}
        <Card>
          <CardHeader>
            <CardTitle>Report a Found Item</CardTitle>
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
                        <Input placeholder="e.g. Silver MacBook Pro" {...field} />
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Distinguishing features, serial numbers, etc.…"
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
                  name="locationFound"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Found *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Engineering Block Canteen" {...field} />
                      </FormControl>
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
                <FormField
                  control={form.control}
                  name="custodyLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custody Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Security Office, Block A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting…" : "Submit Found Report"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Reports list */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">My Found Reports</h2>
          {isLoadingList ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              No found reports yet. Use the form to report a found item.
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
                      {report.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {report.category}
                    {report.color ? ` · ${report.color}` : ""}
                    {report.brand ? ` · ${report.brand}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    📍 {report.locationFound} &nbsp;·&nbsp;{" "}
                    {format(new Date(report.dateFound), "dd MMM yyyy")}
                  </p>
                  {report.custodyLocation && (
                    <p className="text-xs text-muted-foreground">
                      🏢 Custody: {report.custodyLocation}
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
