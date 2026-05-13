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

function getProjectId(projectId?: string): string {
  return projectId || process.env.NEXT_PUBLIC_MODULE_PROJECT_ID || "";
}

export const notificationsApi = {
  list: async (params?: { status?: "read" | "unread" | "all"; projectId?: string }) => {
    const projectId = getProjectId(params?.projectId);
    return api.get<{ data: { rows: NotificationRow[]; total: number } }>(
      `/lost-found/${projectId}/notifications`,
      { params: { status: params?.status || "all" } },
    );
  },

  markRead: async (id: string, projectId?: string) => {
    const resolvedProjectId = getProjectId(projectId);
    return api.patch<{ data: { notification: NotificationRow; idempotent: boolean } }>(
      `/lost-found/${resolvedProjectId}/notifications/${id}/read`,
      {},
    );
  },

  markAllRead: async (projectId?: string) => {
    const resolvedProjectId = getProjectId(projectId);
    return api.patch<{ data: { updated_count: number } }>(
      `/lost-found/${resolvedProjectId}/notifications/mark-all-read`,
      {},
    );
  },
};
