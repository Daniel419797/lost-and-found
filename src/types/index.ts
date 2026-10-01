// ─── Auth ────────────────────────────────────────────────────────────────────

export type UserRole = "student" | "staff" | "admin" | "super_admin";

export interface User {
  id: string;
  email: string;
  displayName: string;
  studentStaffId?: string;
  department?: string;
  role: UserRole;
  createdAt: string;
}

export interface RegisterRequestDTO {
  displayName: string;
  studentStaffId: string;
  department: string;
  email: string;
  password: string;
}

export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface LoginResponseDTO {
  data: {
    token: string;
    user: User;
  };
  message: string;
}

export interface UpdateProfileRequestDTO {
  displayName?: string;
  department?: string;
  currentPassword?: string;
  newPassword?: string;
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export interface ListResponseDTO<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListQueryParams {
  limit?: number;
  offset?: number;
}

// ─── Lost Reports ─────────────────────────────────────────────────────────────

export type LostReportStatus = "open" | "matched" | "recovered" | "closed_unrecovered";
export type ItemCategory =
  | "Electronics"
  | "Clothing"
  | "Accessories"
  | "Documents"
  | "Keys"
  | "Bags"
  | "Sports"
  | "Books"
  | "Food"
  | "Other";

export interface LostReport {
  id: string;
  userId: string;
  itemTitle: string;
  category: ItemCategory;
  color?: string;
  brand?: string;
  description?: string;
  imageUrls?: string[];
  locationLost: string;
  dateLost: string;
  status: LostReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLostReportDTO {
  itemTitle: string;
  category: ItemCategory;
  color?: string;
  brand?: string;
  description?: string;
  imageUrls?: string[];
  locationLost: string;
  dateLost: string;
}

export type UpdateLostReportDTO = Partial<CreateLostReportDTO> & { status?: LostReportStatus };

export interface LostReportQueryParams extends ListQueryParams {
  status?: LostReportStatus;
  category?: ItemCategory;
  keyword?: string;
  userId?: string;
  from?: string;
  to?: string;
}

// ─── Found Reports ────────────────────────────────────────────────────────────

export type FoundReportStatus = "open" | "claimed" | "verified" | "closed";

export interface FoundReport {
  id: string;
  userId: string;
  itemTitle: string;
  category: ItemCategory;
  color?: string;
  brand?: string;
  description?: string;
  imageUrls?: string[];
  locationFound: string;
  dateFound: string;
  custodyLocation?: string;
  status: FoundReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFoundReportDTO {
  itemTitle: string;
  category: ItemCategory;
  color?: string;
  brand?: string;
  description?: string;
  imageUrls?: string[];
  locationFound: string;
  dateFound: string;
  custodyLocation?: string;
}

export type UpdateFoundReportDTO = Partial<CreateFoundReportDTO> & { status?: FoundReportStatus };

export interface FoundReportQueryParams extends ListQueryParams {
  status?: FoundReportStatus;
  category?: ItemCategory;
  keyword?: string;
  userId?: string;
  from?: string;
  to?: string;
}

// ─── Claims ───────────────────────────────────────────────────────────────────

export type ClaimStatus = "pending" | "under_review" | "approved" | "rejected" | "completed";

export interface Claim {
  id: string;
  lostReportId?: string;
  foundReportId: string;
  claimantId: string;
  description: string;
  status: ClaimStatus;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClaimDTO {
  lostReportId?: string;
  foundReportId: string;
  description: string;
}

export interface ReviewClaimDTO {
  status: "approved" | "rejected";
  reviewNotes?: string;
}

// ─── Match Candidates ────────────────────────────────────────────────────────

export interface MatchCandidate {
  id: string;
  lostReportId: string;
  foundReportId: string;
  score: number;
  computedAt: string;
  lostReport: Pick<
    LostReport,
    "id" | "itemTitle" | "category" | "color" | "brand" | "imageUrls" | "locationLost" | "dateLost" | "status"
  >;
  foundReport: Pick<
    FoundReport,
    "id" | "itemTitle" | "category" | "color" | "brand" | "imageUrls" | "locationFound" | "dateFound" | "custodyLocation" | "status"
  >;
}

// ─── Handovers ────────────────────────────────────────────────────────────────

export interface Handover {
  id: string;
  claimId: string;
  officerUserId: string;
  status?: string;
  handoverPoint: string;
  handoverTime: string;
  completedAt?: string;
  completedByUserId?: string;
  evidenceUrl?: string;
  notes?: string;
  createdAt: string;
}
