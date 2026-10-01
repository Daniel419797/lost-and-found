import api from "@/lib/api";

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
  getAuditLogs: (params?: {
    action?: string;
    resource_type?: string;
    resource_id?: string;
    user_id?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }) =>
    api.get<{ data: { rows: AuditLogRow[]; total: number; hasMore: boolean } }>(
      "/admin/audit-logs",
      { params },
    ),

  getMetrics: () => api.get<{ data: AdminMetrics }>("/admin/metrics"),
};
