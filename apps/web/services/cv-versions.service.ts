import type { CreateCvVersionRequest, CvVersion, TResult } from "@/models";
import { api } from "@/utilities/api.utility";

export const cv_versions_service = {
  list: (signal?: AbortSignal): Promise<TResult<CvVersion[]>> => api.get<CvVersion[]>("/cv-versions", undefined, signal),

  create: (input: CreateCvVersionRequest): Promise<TResult<CvVersion>> => api.post<CreateCvVersionRequest, CvVersion>("/cv-versions", input),

  uploadFile: (id: string, file: File): Promise<TResult<CvVersion>> => {
    const formData = new FormData();
    formData.append("file", file);

    return api.post<FormData, CvVersion>(`/cv-versions/${id}/file`, formData);
  },

  setOutputProfile: (id: string): Promise<TResult<CvVersion>> => api.post<undefined, CvVersion>(`/cv-versions/${id}/output`, undefined),

  archive: (id: string): Promise<TResult<CvVersion>> => api.post<undefined, CvVersion>(`/cv-versions/${id}/archive`, undefined),
};
