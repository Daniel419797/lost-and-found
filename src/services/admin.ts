import api from "@/lib/api";
import type { UserRole } from "@/types";

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

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  studentStaffId?: string;
  department?: string;
  role: UserRole;
  createdAt: string;
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

  getUsers: (params?: { search?: string; role?: UserRole; limit?: number; offset?: number }) =>
    api.get<{ data: { rows: AdminUser[]; total: number } }>("/admin/users", { params }),

  updateUserRole: (id: string, role: UserRole) =>
    api.patch<{ data: AdminUser }>(`/admin/users/${id}/role`, { role }),
};
