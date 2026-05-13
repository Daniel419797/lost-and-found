"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { notificationsApi, type NotificationRow } from "@/services/notifications";

export default function NotificationsPage() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await notificationsApi.list({ status: "all" });
      setRows(res.data.data.rows || []);
    } catch {
      toast.error("Failed to load notifications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Your claim and handover updates.</p>
        </div>
        <Button variant="outline" onClick={handleMarkAllRead} disabled={isSubmitting}>
          Mark All Read
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <Bell className="mx-auto mb-2 h-5 w-5" />
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-xl border bg-background p-4 shadow-sm space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{row.title}</p>
                  <p className="text-xs text-muted-foreground">{row.type}</p>
                </div>
                <Badge variant={row.is_read ? "secondary" : "default"}>
                  {row.is_read ? "Read" : "Unread"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{row.body}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(row.created_at).toLocaleString()}
              </p>
              {!row.is_read && (
                <Button size="sm" variant="outline" onClick={() => handleMarkRead(row.id)} disabled={isSubmitting}>
                  Mark Read
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
