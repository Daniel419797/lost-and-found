import api from "@/lib/api";
import type {
  CreateLostReportDTO,
  ListResponseDTO,
  LostReport,
  LostReportQueryParams,
  UpdateLostReportDTO,
} from "@/types";

function asListResponse(
  rows: LostReport[],
  total: number,
  limit: number,
  offset: number,
): ListResponseDTO<LostReport> {
  return { data: rows, total, limit, offset };
}

export const lostReportsApi = {
  list: async (params?: LostReportQueryParams) => {
    const limit = params?.limit ?? 200;
    const offset = params?.offset ?? 0;
    const res = await api.get<{ data: { rows: LostReport[]; total: number } }>("/lost-reports", {
      params: { ...params, limit, offset },
    });
    return {
      ...res,
      data: asListResponse(res.data.data.rows ?? [], res.data.data.total ?? 0, limit, offset),
    };
  },

  listMine: async (params?: LostReportQueryParams) => {
    const limit = params?.limit ?? 200;
    const offset = params?.offset ?? 0;
    const res = await api.get<{ data: { rows: LostReport[]; total: number } }>("/lost-reports", {
      params: { ...params, limit, offset, mine: true },
    });
    return {
      ...res,
      data: asListResponse(res.data.data.rows ?? [], res.data.data.total ?? 0, limit, offset),
    };
  },

  getById: (id: string) => api.get<{ data: LostReport }>(`/lost-reports/${id}`),

  create: (data: CreateLostReportDTO) =>
    api.post<{ data: LostReport }>("/lost-reports", data),

  update: (id: string, data: UpdateLostReportDTO) =>
    api.patch<{ data: LostReport }>(`/lost-reports/${id}`, data),

  delete: (id: string) => api.delete(`/lost-reports/${id}`),
};
