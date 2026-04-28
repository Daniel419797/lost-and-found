import api from "@/lib/api";
import type { Claim, ClaimStatus, CreateClaimDTO, ListResponseDTO, ModuleRunResult, ReviewClaimDTO } from "@/types";

type ClaimRow = {
  id: string;
  lost_report_id: string;
  found_report_id?: string;
  claimant_id: string;
  status: ClaimStatus;
  description: string;
  reviewed_by?: string;
  review_notes?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
};

function getCurrentUserId(): string {
  if (typeof window === "undefined") return "";
  const token = localStorage.getItem("token");
  if (!token) return "";
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    ) as Record<string, string>;
    return payload.sub ?? payload.userId ?? payload.id ?? "";
  } catch {
    return "";
  }
}

function toClaim(row: ClaimRow): Claim {
  return {
    id: row.id,
    lostReportId: row.lost_report_id,
    foundReportId: row.found_report_id,
    claimantId: row.claimant_id,
    status: row.status,
    description: row.description,
    reviewedBy: row.reviewed_by,
    reviewNotes: row.review_notes,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function asListResponse(rows: Claim[], limit: number, offset: number): ListResponseDTO<Claim> {
  return { data: rows, total: rows.length, limit, offset };
}

export const claimsApi = {
  list: async (params?: { limit?: number; offset?: number; status?: ClaimStatus }) => {
    const limit = params?.limit ?? 200;
    const offset = params?.offset ?? 0;
    const res = await api.get<{ data: { rows: ClaimRow[]; total: number } }>("/table/claims", {
      params: { limit, offset },
    });
    let rows = (res.data.data.rows ?? []).map(toClaim);
    if (params?.status) rows = rows.filter((r) => r.status === params.status);
    return { ...res, data: asListResponse(rows, limit, offset) };
  },

  listMine: async (params?: { limit?: number; offset?: number; status?: ClaimStatus }) => {
    const userId = getCurrentUserId();
    const limit = params?.limit ?? 200;
    const offset = params?.offset ?? 0;
    const res = await api.get<{ data: { rows: ClaimRow[]; total: number } }>("/table/claims", {
      params: { limit, offset },
    });
    let rows = (res.data.data.rows ?? []).map(toClaim).filter((r) => r.claimantId === userId);
    if (params?.status) rows = rows.filter((r) => r.status === params.status);
    return { ...res, data: asListResponse(rows, limit, offset) };
  },

  getById: async (id: string) => {
    const res = await api.get<{ data: ClaimRow }>(`/table/claims/${id}`);
    return { ...res, data: { data: toClaim(res.data.data) } };
  },

  create: async (data: CreateClaimDTO) => {
    const userId = getCurrentUserId();
    const payload: Partial<ClaimRow> = {
      lost_report_id: data.lostReportId,
      found_report_id: data.foundReportId,
      claimant_id: userId,
      description: data.description,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const res = await api.post<{ data: ClaimRow }>("/table/claims", payload);
    return { ...res, data: { data: toClaim(res.data.data) } };
  },

  review: async (id: string, data: ReviewClaimDTO) => {
    const reviewerId = getCurrentUserId();
    const payload: Partial<ClaimRow> = {
      status: data.status,
      review_notes: data.reviewNotes,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const res = await api.patch<{ data: ClaimRow }>(`/table/claims/${id}`, payload);
    return { ...res, data: { data: toClaim(res.data.data) } };
  },

  /**
   * Trigger the claim-review logic module for a specific claim.
   * The module handles scoring, branching, and async notifications.
   * Uses the claim ID as the idempotency key so duplicate triggers are safe.
   */
  executeClaimReview: async (
    claimId: string,
    projectId: string,
    claimantUserId?: string,
  ): Promise<ModuleRunResult> => {
    const moduleProjectId = projectId || process.env.NEXT_PUBLIC_MODULE_PROJECT_ID || "";
    const res = await api.post<{ data: ModuleRunResult }>(
      `/modules/${moduleProjectId}/claim-review/execute`,
      {
        input: { claimId, claimantUserId },
        triggerEventId: claimId,
      },
    );
    return res.data.data;
  },
};
