import api from "@/lib/api";
import type {
  LoginRequestDTO,
  LoginResponseDTO,
  RegisterRequestDTO,
  UpdateProfileRequestDTO,
  User,
} from "@/types";

export const authApi = {
  register: (data: RegisterRequestDTO) =>
    api.post<{ data: User; message: string }>("/auth/register", {
      displayName: data.displayName,
      email: data.email,
      password: data.password,
    }),

  login: (data: LoginRequestDTO) =>
    api.post<LoginResponseDTO>("/auth/login", data),

  logout: () => api.post("/auth/logout"),

  getProfile: () => api.get<{ data: User }>("/auth/me"),

  updateProfile: (data: UpdateProfileRequestDTO) =>
    api.patch<{ data: User }>("/auth/me", data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch<{ data: User }>("/auth/me", data),

  deleteAccount: () => api.delete("/auth/me"),
};
