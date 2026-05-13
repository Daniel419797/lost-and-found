import api from "@/lib/api";

function getProjectId(projectId?: string): string {
  return projectId || process.env.NEXT_PUBLIC_MODULE_PROJECT_ID || "";
}

export type AuditLogRow = {
  id: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  details: Record<string, unknown>;
  userId: string | null;
  createdAt: string;
};

export type AdminMetrics = {
  claims_total: number;
  claims_approved: number;
  claims_rejected: number;
  claims_pending: number;
  handovers_completed: number;
  avg_resolution_time_days: number;
  unauthorized_access_attempts: number;
  audit_events_last_24h: number;
};

export const adminApi = {
  getAuditLogs: async (params?: {
    projectId?: string;
    action?: string;
    resource_type?: string;
    resource_id?: string;
    user_id?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }) => {
    const projectId = getProjectId(params?.projectId);
    return api.get<{ data: { rows: AuditLogRow[]; total: number; hasMore: boolean } }>(
      `/lost-found/${projectId}/admin/audit-logs`,
      { params },
    );
  },

  getMetrics: async (projectId?: string) => {
    const resolvedProjectId = getProjectId(projectId);
    return api.get<{ data: AdminMetrics }>(`/lost-found/${resolvedProjectId}/admin/metrics`);
  },
};
