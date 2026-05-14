// ─── Auth ────────────────────────────────────────────────────────────────────

export type UserRole = "student" | "staff" | "admin" | "super_admin";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export interface RegisterRequestDTO {
  displayName: string;
  email: string;
  password: string;
  role?: UserRole;
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

// ─── Logic Module ─────────────────────────────────────────────────────────────

export interface ModuleRunResult {
  runId: string;
  status: string;
  moduleKey: string;
  versionNumber: number;
}

// ─── Claims ───────────────────────────────────────────────────────────────────

export type ClaimStatus = "pending" | "approved" | "rejected" | "completed";

export interface Claim {
  id: string;
  lostReportId: string;
  foundReportId?: string;
  claimantId: string;
  description?: string;
  status: ClaimStatus;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClaimDTO {
  lostReportId: string;
  foundReportId?: string;
  description?: string;
}

export interface ReviewClaimDTO {
  status: "approved" | "rejected";
  reviewNotes?: string;
}

// ─── Match Candidates ─────────────────────────────────────────────────────────

export interface MatchCandidate {
  id: string;
  lostReportId: string;
  foundReportId: string;
  score: number;
  factorsJson?: Record<string, unknown>;
  computedAt: string;
}

// ─── Handovers ────────────────────────────────────────────────────────────────

export interface Handover {
  id: string;
  claimId: string;
  officerUserId: string;
  handoverPoint: string;
  handoverTime: string;
  notes?: string;
  createdAt: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType = "match_found" | "claim_submitted" | "claim_decided" | "handover_ready" | "system";
export type NotificationChannel = "in_app" | "email";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  referenceId?: string;
  referenceType?: string;
  isRead: boolean;
  createdAt: string;
}
