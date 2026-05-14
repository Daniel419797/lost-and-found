import api from "@/lib/api";
import { buildLostFoundUrl, buildModuleUrl, resolveProjectId } from "@/lib/project-api";
import type { Claim, ClaimStatus, CreateClaimDTO, ListResponseDTO, ModuleRunResult, ReviewClaimDTO } from "@/types";

type ClaimRow = {
  id: string;
  linked_lost_report_id?: string;
  found_report_id: string;
  claimant_user_id: string;
  status: ClaimStatus;
  evidence_text: string;
  reviewed_by_user_id?: string;
  decision_reason?: string;
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
    lostReportId: row.linked_lost_report_id ?? "",
    foundReportId: row.found_report_id,
    claimantId: row.claimant_user_id,
    status: row.status,
    description: row.evidence_text,
    reviewedBy: row.reviewed_by_user_id,
    reviewNotes: row.decision_reason,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function asListResponse(rows: Claim[], limit: number, offset: number, total = rows.length): ListResponseDTO<Claim> {
  return { data: rows, total, limit, offset };
}

export const claimsApi = {
  list: async (params?: { limit?: number; offset?: number; status?: ClaimStatus; projectId?: string }) => {
    const projectId = resolveProjectId(params?.projectId);
    const limit = params?.limit ?? 200;
    const offset = params?.offset ?? 0;
    const res = await api.get<{ data: { rows: ClaimRow[]; total: number } }>(buildLostFoundUrl("/claims/my", projectId), {
      params: { limit, offset, ...(params?.status ? { status: params.status } : {}) },
    });
    let rows = (res.data.data.rows ?? []).map(toClaim);
    if (params?.status) rows = rows.filter((r) => r.status === params.status);
    return { ...res, data: asListResponse(rows, limit, offset, res.data.data.total ?? rows.length) };
  },

  listMine: async (params?: { limit?: number; offset?: number; status?: ClaimStatus; projectId?: string }) => {
    const projectId = resolveProjectId(params?.projectId);
    const limit = params?.limit ?? 200;
    const offset = params?.offset ?? 0;
    const res = await api.get<{ data: { rows: ClaimRow[]; total: number } }>(buildLostFoundUrl("/claims/my", projectId), {
      params: { limit, offset, ...(params?.status ? { status: params.status } : {}) },
    });
    let rows = (res.data.data.rows ?? []).map(toClaim);
    if (params?.status) rows = rows.filter((r) => r.status === params.status);
    return { ...res, data: asListResponse(rows, limit, offset, res.data.data.total ?? rows.length) };
  },

  listReviewQueue: async (params?: { limit?: number; offset?: number; status?: string; projectId?: string }) => {
    const projectId = resolveProjectId(params?.projectId);
    const limit = params?.limit ?? 200;
    const offset = params?.offset ?? 0;
    const res = await api.get<{ data: { rows: ClaimRow[]; total: number } }>(
      buildLostFoundUrl("/claims/review-queue", projectId),
      {
        params: { limit, offset, ...(params?.status ? { status: params.status } : {}) },
      }
    );
    const rows = (res.data.data.rows ?? []).map(toClaim);
    return { ...res, data: asListResponse(rows, limit, offset, res.data.data.total ?? rows.length) };
  },

  getById: async (id: string, projectId?: string) => {
    const resolvedProjectId = resolveProjectId(projectId);
    const res = await api.get<{ data: ClaimRow }>(buildLostFoundUrl(`/claims/${id}`, resolvedProjectId));
    return { ...res, data: { data: toClaim(res.data.data) } };
  },

  create: async (data: CreateClaimDTO, projectId?: string) => {
    const resolvedProjectId = resolveProjectId(projectId);
    const userId = getCurrentUserId();
    if (!data.foundReportId) {
      throw new Error("foundReportId is required to create a claim");
    }
    const payload = {
      foundReportId: data.foundReportId,
      lostReportId: data.lostReportId,
      evidenceText: data.description || "",
      claimantUserId: userId,
    };
    const res = await api.post<{ data: ClaimRow }>(buildLostFoundUrl("/claims", resolvedProjectId), payload);
    return { ...res, data: { data: toClaim(res.data.data) } };
  },

  review: async (id: string, data: ReviewClaimDTO, projectId?: string) => {
    const resolvedProjectId = resolveProjectId(projectId);
    const reviewerId = getCurrentUserId();
    const payload = {
      decision: data.status,
      decision_reason: data.reviewNotes || "No reason provided",
      notes: `reviewed_by=${reviewerId}`,
    };
    const res = await api.patch<{ data: { claim: ClaimRow } }>(
      buildLostFoundUrl(`/claims/${id}/decision`, resolvedProjectId),
      payload
    );
    return { ...res, data: { data: toClaim(res.data.data.claim) } };
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
    const moduleProjectId = resolveProjectId(projectId);
    const res = await api.post<{ data: ModuleRunResult }>(
      buildModuleUrl("claim-review", "/execute", moduleProjectId),
      {
        input: { claimId, claimantUserId },
        triggerEventId: claimId,
      },
    );
    return res.data.data;
  },
};
