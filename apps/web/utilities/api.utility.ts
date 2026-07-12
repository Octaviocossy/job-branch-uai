import type { AxiosError, AxiosResponse } from "axios";
import { axios } from "@/config";
import { ApiError, EResult, type TResult } from "@/models";

const apiRequest = async <R>(method: "get" | "post" | "put" | "delete", url: string, data?: unknown, params?: object, signal?: AbortSignal): Promise<TResult<R>> => {
  try {
    let response: AxiosResponse<R>;

    if (method === "get" || method === "delete") {
      response = await axios[method]<R>(url, { params, signal });
    } else {
      response = await axios[method]<R>(url, data, { params, signal });
    }

    return {
      type: EResult.SUCCESS,
      value: response.data,
      status: response.status,
    };
  } catch (_error) {
    const axiosError = _error as AxiosError;
    const apiError = new ApiError(axiosError);

    return {
      type: EResult.ERROR,
      value: apiError,
      status: apiError.statusCode,
    };
  }
};

export const api = {
  get: async <R>(url: string, params?: object, signal?: AbortSignal): Promise<TResult<R>> => {
    return apiRequest<R>("get", url, undefined, params, signal);
  },

  post: async <T, R>(url: string, data: T, params?: object, signal?: AbortSignal): Promise<TResult<R>> => {
    return apiRequest<R>("post", url, data, params, signal);
  },

  put: async <T, R>(url: string, data: T, params?: object, signal?: AbortSignal): Promise<TResult<R>> => {
    return apiRequest<R>("put", url, data, params, signal);
  },

  delete: async <R>(url: string, params?: object, signal?: AbortSignal): Promise<TResult<R>> => {
    return apiRequest<R>("delete", url, undefined, params, signal);
  },
};
