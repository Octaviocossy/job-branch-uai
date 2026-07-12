/* biome-ignore-all lint/suspicious/noConsole: Development-only API logging is intentional here. */

import _axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { getRouterQueryClient } from "@/query/query-client-ref";
import { SESSION_QUERY_KEY } from "@/query/session-query-key";
import { clearAuthToken, getAuthToken } from "@/utilities/auth-token.utility";

const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

const isDev = process.env.NODE_ENV !== "production";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const axios = _axios.create({
  baseURL: apiUrl,
  withCredentials: true,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

axios.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    config.headers.set("X-Request-ID", requestId);

    const token = getAuthToken();

    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    if (isDev) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        requestId,
        data: config.data,
        params: config.params,
      });
    }

    return config;
  },
  (error: AxiosError) => {
    if (isDev) {
      console.error("[API Request Error]", error);
    }

    return Promise.reject(error);
  },
);

const getRetryDelay = (retryCount: number): number => {
  return RETRY_CONFIG.retryDelay * 2 ** retryCount;
};

const isRetryableError = (error: AxiosError): boolean => {
  if (error.code === "ERR_CANCELED" || error.code === "ECONNABORTED") {
    return false;
  }

  if (error.response?.status === 401) {
    return false;
  }

  if (!error.response) {
    return true;
  }

  return RETRY_CONFIG.retryableStatuses.includes(error.response.status);
};

axios.interceptors.response.use(
  (response) => {
    if (isDev) {
      const requestId = response.config.headers.get("X-Request-ID");

      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        requestId,
        status: response.status,
        data: response.data,
      });
    }

    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retryCount?: number }) | undefined;

    if (error.code === "ERR_CANCELED" && isDev) {
      console.log(`[API Cancelled] ${config?.method?.toUpperCase()} ${config?.url} - Request was aborted`);

      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      clearAuthToken();
      getRouterQueryClient()?.removeQueries({ queryKey: SESSION_QUERY_KEY });

      return Promise.reject(error);
    }

    if (config) {
      config._retryCount = config._retryCount || 0;

      if (config._retryCount < RETRY_CONFIG.maxRetries && isRetryableError(error)) {
        config._retryCount += 1;

        const delay = getRetryDelay(config._retryCount);

        if (isDev) {
          console.log(`[API Retry] Attempt ${config._retryCount}/${RETRY_CONFIG.maxRetries} after ${delay}ms`, {
            url: config.url,
            method: config.method?.toUpperCase(),
            status: error.response?.status,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, delay));

        return axios(config);
      }
    }

    if (isDev) {
      const requestId = config?.headers?.get("X-Request-ID");

      console.warn(`[API Error] ${config?.method?.toUpperCase()} ${config?.url} - Final failure after ${config?._retryCount} retries`, {
        requestId,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
    }

    if (error.response) {
      error.message = `HTTP ${error.response.status}: ${error.message}`;
    } else if (error.request) {
      error.message = `No response received: ${error.message}`;
    }

    return Promise.reject(error);
  },
);

export { axios };
