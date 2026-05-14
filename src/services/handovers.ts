import api from "@/lib/api";
import { buildTableUrl } from "@/lib/project-api";
import type { Handover, ListResponseDTO } from "@/types";

type HandoverRow = {
  id: string;
  claim_id: string;
  officer_user_id: string;
  status?: string;
  handover_point: string;
  handover_time: string;
  completed_at?: string;
  completed_by_user_id?: string;
  evidence_url?: string;
  notes?: string;
  created_at: string;
};

function toHandover(row: HandoverRow): Handover {
  return {
    id: row.id,
    claimId: row.claim_id,
    officerUserId: row.officer_user_id,
    status: row.status,
    handoverPoint: row.handover_point,
    handoverTime: row.handover_time,
    completedAt: row.completed_at,
    completedByUserId: row.completed_by_user_id,
    evidenceUrl: row.evidence_url,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function asListResponse(rows: Handover[], limit: number, offset: number): ListResponseDTO<Handover> {
  return { data: rows, total: rows.length, limit, offset };
}

export const handoversApi = {
  list: async (params?: { limit?: number; offset?: number; claimId?: string }) => {
    const limit = params?.limit ?? 200;
    const offset = params?.offset ?? 0;
    const res = await api.get<{ data: { rows: HandoverRow[]; total: number } }>(
      buildTableUrl("handovers"),
      { params: { limit, offset } },
    );
    let rows = (res.data.data.rows ?? []).map(toHandover);
    if (params?.claimId) rows = rows.filter((row) => row.claimId === params.claimId);
    return { ...res, data: asListResponse(rows, limit, offset) };
  },
};
