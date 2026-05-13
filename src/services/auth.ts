import api from "@/lib/api";
import type {
  LoginRequestDTO,
  LoginResponseDTO,
  RegisterRequestDTO,
  UpdateProfileRequestDTO,
  User,
} from "@/types";

type ApiUser = {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  role: string;
  createdAt?: string;
};

type OAuthExchangePayload = {
  accessToken?: string;
  token?: string;
  user: ApiUser;
};

function getApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
}

function getAuthApiBase(): string {
  const base = getApiBase();
  const projectScopedMatch = base.match(/\/api\/v1\/p\/[0-9a-fA-F-]+$/);
  if (projectScopedMatch) {
    return base.replace(/\/p\/[0-9a-fA-F-]+$/, "");
  }
  if (base.endsWith("/api/v1")) {
    return base;
  }
  if (base) {
    return `${base}/api/v1`;
  }
  return "/api/v1";
}

function extractProjectIdFromApiBase(base: string): string | null {
  const m = base.match(/\/api\/v1\/p\/([0-9a-fA-F-]+)$/);
  return m?.[1] ?? null;
}

function getAuthProjectId(): string {
  return process.env.NEXT_PUBLIC_MODULE_PROJECT_ID || extractProjectIdFromApiBase(getApiBase()) || "";
}

function withProjectId(url: string): string {
  const projectId = getAuthProjectId();
  if (!projectId) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}projectId=${encodeURIComponent(projectId)}`;
}

function oauthStartUrl(provider: "google" | "github"): string {
  const base = getApiBase();
  const redirect = typeof window !== "undefined" ? window.location.origin : "";
  const projectId = getAuthProjectId();
  const q = new URLSearchParams();
  if (redirect) q.set("redirect", redirect);
  if (projectId) q.set("projectId", projectId);
  const authBase = projectId ? base.replace(/\/p\/[0-9a-fA-F-]+$/, "") : base;
  const qs = q.toString() ? `?${q.toString()}` : "";
  if (authBase.endsWith("/api/v1")) {
    return `${authBase}/auth/oauth/${provider}${qs}`;
  }
  if (authBase) {
    return `${authBase}/api/v1/auth/oauth/${provider}${qs}`;
  }
  return `/api/v1/auth/oauth/${provider}${qs}`;
}

function toUser(u: ApiUser): User {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName ?? u.name ?? "",
    role: (u.role as User["role"]) ?? "student",
    createdAt: u.createdAt ?? new Date().toISOString(),
  };
}

export const authApi = {
  register: (data: RegisterRequestDTO) =>
    api
      .post<{ data: ApiUser }>(withProjectId(`${getAuthApiBase()}/auth/register`), {
        email: data.email,
        password: data.password,
        name: data.displayName,
        role: data.role ?? "student",
      })
      .then((res) => ({
        ...res,
        data: { ...res.data, data: toUser(res.data.data) },
      })),

  login: (data: LoginRequestDTO) =>
    api
      .post<{ data: { token?: string; accessToken?: string; user: ApiUser } }>(
        withProjectId(`${getAuthApiBase()}/auth/login`),
        data,
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: {
            token: res.data.data.token ?? res.data.data.accessToken ?? "",
            user: toUser(res.data.data.user),
          },
        },
      })) as unknown as Promise<{ data: LoginResponseDTO }>,

  getOAuthStartUrl: (provider: "google" | "github") => oauthStartUrl(provider),

  exchangeOAuthCode: (code: string) =>
    api
      .post<{ data: OAuthExchangePayload }>(
        withProjectId(`${getAuthApiBase()}/auth/oauth/exchange`),
        { code },
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: {
            token: res.data.data.token ?? res.data.data.accessToken ?? "",
            user: toUser(res.data.data.user),
          },
        },
      })) as unknown as Promise<{ data: LoginResponseDTO }>,

  logout: () => api.post(withProjectId(`${getAuthApiBase()}/auth/logout`)),

  getProfile: () =>
    api
      .get<{ data: ApiUser }>(withProjectId(`${getAuthApiBase()}/auth/me`))
      .then((res) => ({
        ...res,
        data: { ...res.data, data: toUser(res.data.data) },
      })),

  updateProfile: (data: UpdateProfileRequestDTO) =>
    api
      .patch<{ data: ApiUser }>(withProjectId(`${getAuthApiBase()}/auth/me`), {
        ...(data.displayName !== undefined ? { name: data.displayName } : {}),
        ...(data.currentPassword !== undefined ? { currentPassword: data.currentPassword } : {}),
        ...(data.newPassword !== undefined ? { newPassword: data.newPassword } : {}),
      })
      .then((res) => ({
        ...res,
        data: { ...res.data, data: toUser(res.data.data) },
      })),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch<{ data: ApiUser }>(withProjectId(`${getAuthApiBase()}/auth/me`), {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    }),

  deleteAccount: () => api.delete(withProjectId(`${getAuthApiBase()}/auth/me`)),
};
