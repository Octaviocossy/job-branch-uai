import type { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { ApiError, EApiErrorType } from "@/models";

function axiosErr(partial: Partial<AxiosError>): AxiosError {
  return { isAxiosError: true, message: "boom", config: {}, ...partial } as unknown as AxiosError;
}

describe("ApiError", () => {
  describe("determineErrorType", () => {
    it("maps ERR_CANCELED to CANCELLED_ERROR", () => {
      const error = new ApiError(axiosErr({ code: "ERR_CANCELED" }));

      expect(error.type).toBe(EApiErrorType.CANCELLED_ERROR);
    });

    it("maps ECONNABORTED to TIMEOUT_ERROR", () => {
      const error = new ApiError(axiosErr({ code: "ECONNABORTED" }));

      expect(error.type).toBe(EApiErrorType.TIMEOUT_ERROR);
    });

    it("maps ETIMEDOUT to TIMEOUT_ERROR", () => {
      const error = new ApiError(axiosErr({ code: "ETIMEDOUT" }));

      expect(error.type).toBe(EApiErrorType.TIMEOUT_ERROR);
    });

    it("maps a missing response to NETWORK_ERROR", () => {
      const error = new ApiError(axiosErr({}));

      expect(error.type).toBe(EApiErrorType.NETWORK_ERROR);
    });

    it.each([400, 422])("maps status %d to VALIDATION_ERROR", (status) => {
      const error = new ApiError(axiosErr({ response: { status } as never }));

      expect(error.type).toBe(EApiErrorType.VALIDATION_ERROR);
    });

    it.each([401, 403, 404])("maps status %d to CLIENT_ERROR", (status) => {
      const error = new ApiError(axiosErr({ response: { status } as never }));

      expect(error.type).toBe(EApiErrorType.CLIENT_ERROR);
    });

    it.each([500, 503])("maps status %d to SERVER_ERROR", (status) => {
      const error = new ApiError(axiosErr({ response: { status } as never }));

      expect(error.type).toBe(EApiErrorType.SERVER_ERROR);
    });

    it("maps an unusual status to UNKNOWN_ERROR", () => {
      const error = new ApiError(axiosErr({ response: { status: 302 } as never }));

      expect(error.type).toBe(EApiErrorType.UNKNOWN_ERROR);
    });
  });

  describe("getUserMessage", () => {
    it("returns the network message", () => {
      const error = new ApiError(axiosErr({}));

      expect(error.getUserMessage()).toBe("Network error. Please check your internet connection.");
    });

    it("returns the timeout message", () => {
      const error = new ApiError(axiosErr({ code: "ECONNABORTED" }));

      expect(error.getUserMessage()).toBe("Request timed out. Please try again.");
    });

    it("returns the validation message", () => {
      const error = new ApiError(axiosErr({ response: { status: 400 } as never }));

      expect(error.getUserMessage()).toBe("Invalid request data. Please check your input.");
    });

    it("returns the unauthorized message for a 401 client error", () => {
      const error = new ApiError(axiosErr({ response: { status: 401 } as never }));

      expect(error.getUserMessage()).toBe("Unauthorized. Please log in.");
    });

    it("returns the access-denied message for a 403 client error", () => {
      const error = new ApiError(axiosErr({ response: { status: 403 } as never }));

      expect(error.getUserMessage()).toBe("Access denied.");
    });

    it("returns the not-found message for a 404 client error", () => {
      const error = new ApiError(axiosErr({ response: { status: 404 } as never }));

      expect(error.getUserMessage()).toBe("Resource not found.");
    });

    it("falls back to a generic message for other client errors", () => {
      const error = new ApiError(axiosErr({ response: { status: 405 } as never }));

      expect(error.getUserMessage()).toBe("Invalid request.");
    });

    it("returns the server message", () => {
      const error = new ApiError(axiosErr({ response: { status: 500 } as never }));

      expect(error.getUserMessage()).toBe("Server error. Please try again later.");
    });

    it("returns the cancelled message", () => {
      const error = new ApiError(axiosErr({ code: "ERR_CANCELED" }));

      expect(error.getUserMessage()).toBe("Request was cancelled.");
    });

    it("returns the unknown message", () => {
      const error = new ApiError(axiosErr({ response: { status: 302 } as never }));

      expect(error.getUserMessage()).toBe("An unexpected error occurred.");
    });
  });

  describe("isRetryable", () => {
    it.each([
      { label: "NETWORK_ERROR", source: axiosErr({}), expected: true },
      { label: "TIMEOUT_ERROR", source: axiosErr({ code: "ETIMEDOUT" }), expected: true },
      { label: "SERVER_ERROR", source: axiosErr({ response: { status: 500 } as never }), expected: true },
      { label: "CLIENT_ERROR", source: axiosErr({ response: { status: 404 } as never }), expected: false },
      { label: "VALIDATION_ERROR", source: axiosErr({ response: { status: 422 } as never }), expected: false },
      { label: "CANCELLED_ERROR", source: axiosErr({ code: "ERR_CANCELED" }), expected: false },
    ])("returns $expected for $label", ({ source, expected }) => {
      expect(new ApiError(source).isRetryable()).toBe(expected);
    });
  });

  describe("isClientError", () => {
    it("is true for CLIENT_ERROR", () => {
      const error = new ApiError(axiosErr({ response: { status: 404 } as never }));

      expect(error.isClientError()).toBe(true);
    });

    it("is true for VALIDATION_ERROR", () => {
      const error = new ApiError(axiosErr({ response: { status: 422 } as never }));

      expect(error.isClientError()).toBe(true);
    });

    it("is false for SERVER_ERROR", () => {
      const error = new ApiError(axiosErr({ response: { status: 500 } as never }));

      expect(error.isClientError()).toBe(false);
    });
  });

  describe("statusCode and context", () => {
    it("reflects the response status", () => {
      const error = new ApiError(axiosErr({ response: { status: 404 } as never }));

      expect(error.statusCode).toBe(404);
    });

    it("is undefined when there is no response", () => {
      const error = new ApiError(axiosErr({}));

      expect(error.statusCode).toBeUndefined();
    });

    it("upper-cases the method from config", () => {
      const error = new ApiError(axiosErr({ config: { method: "post" } as never }));

      expect(error.context.method).toBe("POST");
    });

    it("defaults retryCount to 0", () => {
      const error = new ApiError(axiosErr({}));

      expect(error.context.retryCount).toBe(0);
    });
  });
});
