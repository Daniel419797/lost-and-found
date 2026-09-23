import api from "@/lib/api";

export type NotificationRow = {
  id: string;
  recipient_user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  meta_json?: Record<string, unknown>;
  created_at: string;
};

export const notificationsApi = {
  list: (params?: { status?: "read" | "unread" | "all" }) =>
    api.get<{ data: { rows: NotificationRow[]; total: number } }>("/notifications", {
      params: { status: params?.status || "all" },
    }),

  markRead: (id: string) =>
    api.patch<{ data: { notification: NotificationRow; idempotent: boolean } }>(
      `/notifications/${id}/read`,
      {},
    ),

  markAllRead: () =>
    api.patch<{ data: { updated_count: number } }>("/notifications/mark-all-read", {}),
};
