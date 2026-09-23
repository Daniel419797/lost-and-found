import api from "@/lib/api";
import type { Claim, ClaimStatus, CreateClaimDTO, ListResponseDTO, ReviewClaimDTO } from "@/types";

function asListResponse(
  rows: Claim[],
  total: number,
  limit: number,
  offset: number,
): ListResponseDTO<Claim> {
  return { data: rows, total, limit, offset };
}

export const claimsApi = {
  list: async (params?: { limit?: number; offset?: number; status?: ClaimStatus }) =>
    claimsApi.listMine(params),

  listMine: async (params?: { limit?: number; offset?: number; status?: ClaimStatus }) => {
    const limit = params?.limit ?? 200;
    const offset = params?.offset ?? 0;
    const res = await api.get<{ data: { rows: Claim[]; total: number } }>("/claims/my", {
      params: { ...params, limit, offset },
    });
    return {
      ...res,
      data: asListResponse(res.data.data.rows ?? [], res.data.data.total ?? 0, limit, offset),
    };
  },

  listReviewQueue: async (params?: { limit?: number; offset?: number; status?: string }) => {
    const limit = params?.limit ?? 200;
    const offset = params?.offset ?? 0;
    const res = await api.get<{ data: { rows: Claim[]; total: number } }>("/claims/review-queue", {
      params: { ...params, limit, offset },
    });
    return {
      ...res,
      data: asListResponse(res.data.data.rows ?? [], res.data.data.total ?? 0, limit, offset),
    };
  },

  getById: (id: string) => api.get<{ data: Claim }>(`/claims/${id}`),

  create: (data: CreateClaimDTO) =>
    api.post<{ data: Claim }>("/claims", data),

  review: async (id: string, data: ReviewClaimDTO) => {
    const res = await api.patch<{ data: { claim: Claim } }>(`/claims/${id}/decision`, {
      decision: data.status,
      decisionReason: data.reviewNotes,
    });
    return { ...res, data: { data: res.data.data.claim } };
  },
};
