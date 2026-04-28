"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { lostReportsApi } from "@/services/lostReports";
import { foundReportsApi } from "@/services/foundReports";
import { claimsApi } from "@/services/claims";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import type { LostReport, FoundReport } from "@/types";

type Stats = {
  openLost: number;
  openFound: number;
  pendingClaims: number;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLost, setRecentLost] = useState<LostReport[]>([]);
  const [recentFound, setRecentFound] = useState<FoundReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [lostRes, foundRes, claimsRes] = await Promise.all([
          lostReportsApi.list({ status: "open", limit: 5 }),
          foundReportsApi.list({ status: "open", limit: 5 }),
          claimsApi.list({ status: "pending", limit: 50 }),
        ]);
        setStats({
          openLost: lostRes.data.total,
          openFound: foundRes.data.total,
          pendingClaims: claimsRes.data.total,
        });
        setRecentLost(lostRes.data.data.slice(0, 5));
        setRecentFound(foundRes.data.data.slice(0, 5));
      } catch {
        toast.error("Failed to load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back{user?.displayName ? `, ${user.displayName}` : ""}!
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {isLoading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Open Lost Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats?.openLost ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Open Found Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats?.openFound ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Claims
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats?.pendingClaims ?? 0}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Recent items */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Lost Reports</h2>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : recentLost.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">
              No open lost reports
            </div>
          ) : (
            <div className="space-y-2">
              {recentLost.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border bg-background px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-sm">{r.itemTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.locationLost} · {format(new Date(r.dateLost), "dd MMM yyyy")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                    {r.category}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Found Reports</h2>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : recentFound.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">
              No open found reports
            </div>
          ) : (
            <div className="space-y-2">
              {recentFound.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border bg-background px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-sm">{r.itemTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.locationFound} · {format(new Date(r.dateFound), "dd MMM yyyy")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                    {r.category}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
