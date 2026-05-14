import api from "@/lib/api";
import { buildTableUrl } from "@/lib/project-api";
import type {
  CreateFoundReportDTO,
  FoundReport,
  FoundReportQueryParams,
  ListResponseDTO,
  UpdateFoundReportDTO,
} from "@/types";

type FoundReportRow = {
  id: string;
  finder_user_id: string;
  item_title: string;
  category: FoundReport["category"];
  color?: string;
  brand?: string;
  description?: string;
  image_urls?: string[];
  location_found: string;
  date_found: string;
  custody_location?: string;
  status: FoundReport["status"];
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

function toFoundReport(row: FoundReportRow): FoundReport {
  return {
    id: row.id,
    userId: row.finder_user_id,
    itemTitle: row.item_title,
    category: row.category,
    color: row.color,
    brand: row.brand,
    description: row.description,
    imageUrls: Array.isArray(row.image_urls)
      ? row.image_urls.filter((value): value is string => typeof value === "string")
      : undefined,
    locationFound: row.location_found,
    dateFound: row.date_found,
    custodyLocation: row.custody_location,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRowPayload(
  data: CreateFoundReportDTO | UpdateFoundReportDTO
): Partial<FoundReportRow> {
  const p: Partial<FoundReportRow> = {};
  if (data.itemTitle !== undefined) p.item_title = data.itemTitle;
  if (data.category !== undefined) p.category = data.category;
  if (data.color !== undefined) p.color = data.color;
  if (data.brand !== undefined) p.brand = data.brand;
  if (data.description !== undefined) p.description = data.description;
  if (data.imageUrls !== undefined) p.image_urls = data.imageUrls;
  if (data.locationFound !== undefined) p.location_found = data.locationFound;
  if (data.dateFound !== undefined) p.date_found = data.dateFound;
  if (data.custodyLocation !== undefined) p.custody_location = data.custodyLocation;
  if ("status" in data && data.status !== undefined) p.status = data.status;
  return p;
}

function asListResponse(
  rows: FoundReport[],
  limit: number,
  offset: number
): ListResponseDTO<FoundReport> {
  return { data: rows, total: rows.length, limit, offset };
}

export const foundReportsApi = {
  list: async (params?: FoundReportQueryParams) => {
    const limit = params?.limit ?? 200;
    const offset = params?.offset ?? 0;
    const res = await api.get<{ data: { rows: FoundReportRow[]; total: number } }>(
      buildTableUrl("found_reports"),
      { params: { limit, offset } }
    );
    let rows = (res.data.data.rows ?? []).map(toFoundReport);
    if (params?.status) rows = rows.filter((r) => r.status === params.status);
    if (params?.category) rows = rows.filter((r) => r.category === params.category);
    if (params?.userId) rows = rows.filter((r) => r.userId === params.userId);
    if (params?.from) rows = rows.filter((r) => r.dateFound >= params.from!);
    if (params?.to) rows = rows.filter((r) => r.dateFound <= params.to!);
    return { ...res, data: asListResponse(rows, limit, offset) };
  },

  listMine: async (params?: FoundReportQueryParams) => {
    const userId = getCurrentUserId();
    return foundReportsApi.list({ ...params, userId });
  },

  getById: async (id: string) => {
    const res = await api.get<{ data: FoundReportRow }>(buildTableUrl("found_reports", `/${id}`));
    return { ...res, data: { data: toFoundReport(res.data.data) } };
  },

  create: async (data: CreateFoundReportDTO) => {
    const userId = getCurrentUserId();
    const payload: Partial<FoundReportRow> = {
      ...toRowPayload(data),
      finder_user_id: userId,
      status: "open",
    };
    const res = await api.post<{ data: FoundReportRow }>(buildTableUrl("found_reports"), payload);
    return { ...res, data: { data: toFoundReport(res.data.data) } };
  },

  update: async (id: string, data: UpdateFoundReportDTO) => {
    const payload = { ...toRowPayload(data) };
    const res = await api.patch<{ data: FoundReportRow }>(buildTableUrl("found_reports", `/${id}`), payload);
    return { ...res, data: { data: toFoundReport(res.data.data) } };
  },

  delete: async (id: string) => {
    return api.delete(buildTableUrl("found_reports", `/${id}`));
  },
};
