import type { AxiosError } from "axios";

export enum EApiErrorType {
  NETWORK_ERROR = "network_error",
  TIMEOUT_ERROR = "timeout_error",
  VALIDATION_ERROR = "validation_error",
  CLIENT_ERROR = "client_error",
  SERVER_ERROR = "server_error",
  CANCELLED_ERROR = "cancelled_error",
  UNKNOWN_ERROR = "unknown_error",
}

export interface ApiErrorContext {
  requestId?: string;
  url?: string;
  method?: string;
  timestamp: Date;
  retryCount?: number;
}

export class ApiError extends Error {
  public readonly type: EApiErrorType;
  public readonly statusCode?: number;
  public readonly context: ApiErrorContext;
  public readonly originalError: AxiosError;
  public readonly responseData?: unknown;

  constructor(error: AxiosError) {
    const message = ApiError.buildMessage(error);

    super(message);

    this.name = "ApiError";
    this.type = ApiError.determineErrorType(error);
    this.statusCode = error.response?.status;
    this.originalError = error;
    this.responseData = error.response?.data;

    const configWithRetry = error.config as { _retryCount?: number } | undefined;

    this.context = {
      requestId: error.config?.headers?.get?.("X-Request-ID") as string | undefined,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      timestamp: new Date(),
      retryCount: configWithRetry?._retryCount ?? 0,
    };

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  private static determineErrorType(error: AxiosError): EApiErrorType {
    if (error.code === "ERR_CANCELED") {
      return EApiErrorType.CANCELLED_ERROR;
    }

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return EApiErrorType.TIMEOUT_ERROR;
    }

    if (!error.response) {
      return EApiErrorType.NETWORK_ERROR;
    }

    const status = error.response.status;

    if (status >= 400 && status < 500) {
      if (status === 422 || status === 400) {
        return EApiErrorType.VALIDATION_ERROR;
      }

      return EApiErrorType.CLIENT_ERROR;
    }

    if (status >= 500) {
      return EApiErrorType.SERVER_ERROR;
    }

    return EApiErrorType.UNKNOWN_ERROR;
  }

  private static buildMessage(error: AxiosError): string {
    const parts: string[] = [];

    if (error.response?.status) {
      parts.push(`HTTP ${error.response.status}`);
    }

    if (error.code) {
      parts.push(`[${error.code}]`);
    }

    parts.push(error.message);

    if (error.config?.method && error.config?.url) {
      parts.push(`(${error.config.method.toUpperCase()} ${error.config.url})`);
    }

    return parts.join(" ");
  }

  public isRetryable(): boolean {
    return [EApiErrorType.NETWORK_ERROR, EApiErrorType.TIMEOUT_ERROR, EApiErrorType.SERVER_ERROR].includes(this.type);
  }

  public isClientError(): boolean {
    return [EApiErrorType.CLIENT_ERROR, EApiErrorType.VALIDATION_ERROR].includes(this.type);
  }

  public getUserMessage(): string {
    switch (this.type) {
      case EApiErrorType.NETWORK_ERROR:
        return "Network error. Please check your internet connection.";
      case EApiErrorType.TIMEOUT_ERROR:
        return "Request timed out. Please try again.";
      case EApiErrorType.VALIDATION_ERROR:
        return "Invalid request data. Please check your input.";
      case EApiErrorType.CLIENT_ERROR:
        if (this.statusCode === 401) return "Unauthorized. Please log in.";
        if (this.statusCode === 403) return "Access denied.";
        if (this.statusCode === 404) return "Resource not found.";

        return "Invalid request.";
      case EApiErrorType.SERVER_ERROR:
        return "Server error. Please try again later.";
      case EApiErrorType.CANCELLED_ERROR:
        return "Request was cancelled.";
      default:
        return "An unexpected error occurred.";
    }
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      statusCode: this.statusCode,
      context: this.context,
      responseData: this.responseData,
    };
  }
}
