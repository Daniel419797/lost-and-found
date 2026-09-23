import api from "@/lib/api";
import type { Handover, ListResponseDTO } from "@/types";

function asListResponse(
  rows: Handover[],
  total: number,
  limit: number,
  offset: number,
): ListResponseDTO<Handover> {
  return { data: rows, total, limit, offset };
}

export const handoversApi = {
  list: async (params?: { limit?: number; offset?: number; claimId?: string }) => {
    const limit = params?.limit ?? 200;
    const offset = params?.offset ?? 0;
    const res = await api.get<{ data: { rows: Handover[]; total: number } }>("/handovers", {
      params: { ...params, limit, offset },
    });
    return {
      ...res,
      data: asListResponse(res.data.data.rows ?? [], res.data.data.total ?? 0, limit, offset),
    };
  },
};
