import api from "@/lib/api";

export type UploadedImage = {
  url: string;
  fileName: string;
  contentType: string;
  size: number;
};

export const uploadsApi = {
  uploadItemPhoto: async (file: File): Promise<UploadedImage> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post<{ data: UploadedImage }>("/uploads/item-photo", formData);
    return res.data.data;
  },
};
