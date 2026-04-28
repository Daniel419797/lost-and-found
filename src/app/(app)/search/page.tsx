"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { lostReportsApi } from "@/services/lostReports";
import { foundReportsApi } from "@/services/foundReports";
import type { FoundReport, ItemCategory, LostReport } from "@/types";
import { format } from "date-fns";
import { Search } from "lucide-react";

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

type ReportType = "lost" | "found";
type CombinedItem =
  | ({ type: "lost" } & LostReport)
  | ({ type: "found" } & FoundReport);

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<ItemCategory | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<ReportType | "">("");
  const [allItems, setAllItems] = useState<CombinedItem[]>([]);
  const [filtered, setFiltered] = useState<CombinedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [lostRes, foundRes] = await Promise.all([
          lostReportsApi.list({ limit: 500 }),
          foundReportsApi.list({ limit: 500 }),
        ]);
        const combined: CombinedItem[] = [
          ...lostRes.data.data.map((r) => ({ ...r, type: "lost" as const })),
          ...foundRes.data.data.map((r) => ({ ...r, type: "found" as const })),
        ].sort((a, b) => {
          const dateA = a.type === "lost" ? a.dateLost : a.dateFound;
          const dateB = b.type === "lost" ? b.dateLost : b.dateFound;
          return dateB.localeCompare(dateA);
        });
        setAllItems(combined);
        setFiltered(combined);
      } catch {
        toast.error("Failed to load items.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const applyFilters = () => {
    let result = allItems;
    if (typeFilter) result = result.filter((r) => r.type === typeFilter);
    if (category) result = result.filter((r) => r.category === category);
    if (keyword) {
      const kw = keyword.toLowerCase();
      result = result.filter(
        (r) =>
          r.itemTitle.toLowerCase().includes(kw) ||
          (r.description?.toLowerCase().includes(kw) ?? false) ||
          (r.brand?.toLowerCase().includes(kw) ?? false)
      );
    }
    if (from) {
      result = result.filter((r) => {
        const d = r.type === "lost" ? r.dateLost : r.dateFound;
        return d >= from;
      });
    }
    if (to) {
      result = result.filter((r) => {
        const d = r.type === "lost" ? r.dateLost : r.dateFound;
        return d <= to;
      });
    }
    setFiltered(result);
  };

  const handleReset = () => {
    setKeyword("");
    setCategory("");
    setFrom("");
    setTo("");
    setTypeFilter("");
    setFiltered(allItems);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Browse &amp; Search</h1>
        <p className="text-muted-foreground">
          Search across all lost and found reports on campus.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-background p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search keyword…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as ReportType | "")}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="found">Found</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as ItemCategory | "")}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            className="w-40"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="From date"
          />
          <Input
            type="date"
            className="w-40"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="To date"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={applyFilters}>
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Loading…" : `${filtered.length} result${filtered.length !== 1 ? "s" : ""} found`}
        </p>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            No results match your search. Try adjusting filters.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const date = item.type === "lost" ? item.dateLost : item.dateFound;
              const location =
                item.type === "lost" ? item.locationLost : item.locationFound;
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="rounded-xl border bg-background p-4 shadow-sm space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="font-semibold">{item.itemTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.category}
                        {item.color ? ` · ${item.color}` : ""}
                        {item.brand ? ` · ${item.brand}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Badge
                        variant="secondary"
                        className={
                          item.type === "lost"
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }
                      >
                        {item.type === "lost" ? "Lost" : "Found"}
                      </Badge>
                      <Badge variant="outline">{item.status}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    📍 {location} &nbsp;·&nbsp; {format(new Date(date), "dd MMM yyyy")}
                  </p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
