import api from "@/lib/api";
import type {
  CreateFoundReportDTO,
  FoundReport,
  FoundReportQueryParams,
  ListResponseDTO,
  UpdateFoundReportDTO,
} from "@/types";

function asListResponse(
  rows: FoundReport[],
  total: number,
  limit: number,
  offset: number,
): ListResponseDTO<FoundReport> {
  return { data: rows, total, limit, offset };
}

export const foundReportsApi = {
  list: async (params?: FoundReportQueryParams) => {
    const limit = params?.limit ?? 200;
    const offset = params?.offset ?? 0;
    const res = await api.get<{ data: { rows: FoundReport[]; total: number } }>("/found-reports", {
      params: { ...params, limit, offset },
    });
    return {
      ...res,
      data: asListResponse(res.data.data.rows ?? [], res.data.data.total ?? 0, limit, offset),
    };
  },

  listMine: async (params?: FoundReportQueryParams) => {
    const limit = params?.limit ?? 200;
    const offset = params?.offset ?? 0;
    const res = await api.get<{ data: { rows: FoundReport[]; total: number } }>("/found-reports", {
      params: { ...params, limit, offset, mine: true },
    });
    return {
      ...res,
      data: asListResponse(res.data.data.rows ?? [], res.data.data.total ?? 0, limit, offset),
    };
  },

  getById: (id: string) => api.get<{ data: FoundReport }>(`/found-reports/${id}`),

  create: (data: CreateFoundReportDTO) =>
    api.post<{ data: FoundReport }>("/found-reports", data),

  update: (id: string, data: UpdateFoundReportDTO) =>
    api.patch<{ data: FoundReport }>(`/found-reports/${id}`, data),

  delete: (id: string) => api.delete(`/found-reports/${id}`),
};
