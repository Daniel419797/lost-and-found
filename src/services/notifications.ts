import api from "@/lib/api";
import { buildLostFoundUrl, resolveProjectId } from "@/lib/project-api";

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
  list: async (params?: { status?: "read" | "unread" | "all"; projectId?: string }) => {
    const projectId = resolveProjectId(params?.projectId);
    return api.get<{ data: { rows: NotificationRow[]; total: number } }>(
      buildLostFoundUrl("/notifications", projectId),
      { params: { status: params?.status || "all" } },
    );
  },

  markRead: async (id: string, projectId?: string) => {
    const resolvedProjectId = resolveProjectId(projectId);
    return api.patch<{ data: { notification: NotificationRow; idempotent: boolean } }>(
      buildLostFoundUrl(`/notifications/${id}/read`, resolvedProjectId),
      {},
    );
  },

  markAllRead: async (projectId?: string) => {
    const resolvedProjectId = resolveProjectId(projectId);
    return api.patch<{ data: { updated_count: number } }>(
      buildLostFoundUrl("/notifications/mark-all-read", resolvedProjectId),
      {},
    );
  },
};
