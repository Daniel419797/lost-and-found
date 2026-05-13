"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { adminApi, type AdminMetrics, type AuditLogRow } from "@/services/admin";

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [metricsRes, logsRes] = await Promise.all([
        adminApi.getMetrics(),
        adminApi.getAuditLogs({ limit: 25, offset: 0 }),
      ]);
      setMetrics(metricsRes.data.data);
      setLogs(logsRes.data.data.rows || []);
    } catch {
      toast.error("Failed to load admin data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    queueMicrotask(() => {
      void load();
    });
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
        <ShieldCheck className="mx-auto mb-2 h-5 w-5" />
        Admin access required.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-muted-foreground">Audit logs and operational metrics.</p>
        </div>
        <Button variant="outline" onClick={() => void load()}>Refresh</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {metrics && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">Claims Total</p>
                <p className="text-2xl font-bold">{metrics.claims_total}</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">Handovers Completed</p>
                <p className="text-2xl font-bold">{metrics.handovers_completed}</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">Audit Events (24h)</p>
                <p className="text-2xl font-bold">{metrics.audit_events_last_24h}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Recent Audit Logs</h2>
            {logs.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                No audit logs found.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="rounded-xl border bg-background p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm">{log.action}</p>
                    <Badge variant="secondary">{log.resource || "unknown"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                  {log.resourceId && (
                    <p className="text-xs text-muted-foreground">Resource: {log.resourceId}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
