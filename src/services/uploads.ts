import api from "@/lib/api";
import { buildLostFoundUrl, resolveProjectId } from "@/lib/project-api";

export type UploadedImage = {
  url: string;
  fileName: string;
  contentType: string;
  size: number;
};

export const uploadsApi = {
  uploadItemPhoto: async (file: File, projectId?: string): Promise<UploadedImage> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post<{ data: UploadedImage }>(
      buildLostFoundUrl("/uploads/item-photo", resolveProjectId(projectId)),
      formData,
    );

    return res.data.data;
  },
};
