import api from "@/lib/api";
import type { ListResponseDTO, MatchCandidate } from "@/types";

export const matchesApi = {
  list: async (params?: {
    minScore?: number;
    lostReportId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;
    const res = await api.get<{ data: { rows: MatchCandidate[]; total: number } }>("/matches", {
      params: { ...params, limit, offset },
    });
    return {
      ...res,
      data: {
        data: res.data.data.rows ?? [],
        total: res.data.data.total ?? 0,
        limit,
        offset,
      } satisfies ListResponseDTO<MatchCandidate>,
    };
  },
};
