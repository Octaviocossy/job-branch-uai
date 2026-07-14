import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utilities/auth-token.utility", () => ({
  getAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
}));

const removeQueries = vi.fn();
vi.mock("@/query/query-client-ref", () => ({
  getRouterQueryClient: () => ({ removeQueries }),
}));

import { axios } from "@/config/axios.config";
import { SESSION_QUERY_KEY } from "@/query/session-query-key";
import { clearAuthToken, getAuthToken } from "@/utilities/auth-token.utility";

type MockAdapter = (config: InternalAxiosRequestConfig) => Promise<unknown>;

function setAdapter(fn: MockAdapter) {
  axios.defaults.adapter = fn as never;
}

function buildAxiosError(overrides: Partial<AxiosError> & { config: InternalAxiosRequestConfig }): AxiosError {
  return {
    isAxiosError: true,
    name: "AxiosError",
    message: "request failed",
    toJSON: () => ({}),
    ...overrides,
  } as AxiosError;
}

function buildResponse(config: InternalAxiosRequestConfig, status: number) {
  return {
    data: { ok: true },
    status,
    statusText: "OK",
    headers: {},
    config,
  };
}

describe("axios.config", () => {
  beforeEach(() => {
    vi.mocked(getAuthToken).mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("request interceptor", () => {
    it("sets X-Request-ID and Authorization when a token exists", async () => {
      vi.mocked(getAuthToken).mockReturnValue("tok");

      let seenConfig: InternalAxiosRequestConfig | undefined;

      setAdapter(async (config) => {
        seenConfig = config;

        return buildResponse(config, 200);
      });

      await axios.get("/whoami");

      expect(seenConfig?.headers.get("Authorization")).toBe("Bearer tok");
      expect(seenConfig?.headers.get("X-Request-ID")).toEqual(expect.any(String));
      expect(seenConfig?.headers.get("X-Request-ID")).not.toHaveLength(0);
    });

    it("does not set Authorization when there is no token", async () => {
      vi.mocked(getAuthToken).mockReturnValue(null);

      let seenConfig: InternalAxiosRequestConfig | undefined;

      setAdapter(async (config) => {
        seenConfig = config;

        return buildResponse(config, 200);
      });

      await axios.get("/whoami");

      expect(seenConfig?.headers.get("Authorization")).toBeUndefined();
      expect(seenConfig?.headers.get("X-Request-ID")).toEqual(expect.any(String));
    });

    it("removes the JSON Content-Type for FormData so the browser sets the multipart boundary", async () => {
      let seenConfig: InternalAxiosRequestConfig | undefined;

      setAdapter(async (config) => {
        seenConfig = config;

        return buildResponse(config, 200);
      });

      const form = new FormData();
      form.append("file", new Blob(["cv-bytes"], { type: "application/pdf" }), "cv.pdf");

      await axios.post("/cv-versions/abc/file", form);

      // Content-Type must be axios's "never set" sentinel (`false`), not application/json
      // (which would trigger JSON serialization) or a default the browser can't override.
      expect(seenConfig?.headers.get("Content-Type")).toBe(false);
      // The FormData body passes through untouched (not stringified to JSON).
      expect(seenConfig?.data).toBeInstanceOf(FormData);
    });

    it("keeps application/json Content-Type for plain object bodies", async () => {
      let seenConfig: InternalAxiosRequestConfig | undefined;

      setAdapter(async (config) => {
        seenConfig = config;

        return buildResponse(config, 200);
      });

      await axios.post("/cv-versions", { name: "Backend", focus: "backend" });

      expect(seenConfig?.headers.get("Content-Type")).toContain("application/json");
    });
  });

  describe("retry policy", () => {
    it("retries a retryable status until it succeeds, then resolves", async () => {
      vi.useFakeTimers();

      let calls = 0;

      setAdapter(async (config) => {
        calls += 1;

        if (calls < 3) {
          return Promise.reject(
            buildAxiosError({
              config,
              code: undefined,
              response: { status: 503, statusText: "", data: undefined, headers: {}, config },
            }),
          );
        }

        return buildResponse(config, 200);
      });

      const promise = axios.get("/flaky");

      await vi.runAllTimersAsync();

      await expect(promise).resolves.toMatchObject({ status: 200 });
      expect(calls).toBe(3);
    });

    it("does not retry a non-retryable 404 status", async () => {
      let calls = 0;

      setAdapter(async (config) => {
        calls += 1;

        return Promise.reject(
          buildAxiosError({
            config,
            response: { status: 404, statusText: "", data: undefined, headers: {}, config },
          }),
        );
      });

      await expect(axios.get("/missing")).rejects.toBeDefined();
      expect(calls).toBe(1);
    });

    it("retries a network error up to maxRetries then rejects", async () => {
      vi.useFakeTimers();

      let calls = 0;

      setAdapter(async (config) => {
        calls += 1;

        return Promise.reject(buildAxiosError({ config, response: undefined }));
      });

      const promise = axios.get("/unreachable");

      // Prevent an unhandled rejection warning while fake timers drive the retry loop.
      promise.catch(() => {});

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toBeDefined();
      expect(calls).toBe(4);
    });

    it("does not retry a cancelled request", async () => {
      let calls = 0;

      setAdapter(async (config) => {
        calls += 1;

        return Promise.reject(buildAxiosError({ config, code: "ERR_CANCELED" }));
      });

      await expect(axios.get("/cancelled")).rejects.toBeDefined();
      expect(calls).toBe(1);
    });
  });

  describe("401 handling", () => {
    it("clears the auth token and removes the session query, without retrying", async () => {
      let calls = 0;

      setAdapter(async (config) => {
        calls += 1;

        return Promise.reject(
          buildAxiosError({
            config,
            response: { status: 401, statusText: "", data: undefined, headers: {}, config },
          }),
        );
      });

      await expect(axios.get("/me")).rejects.toBeDefined();

      expect(calls).toBe(1);
      expect(clearAuthToken).toHaveBeenCalledOnce();
      expect(removeQueries).toHaveBeenCalledTimes(1);
      expect(removeQueries).toHaveBeenCalledWith({ queryKey: SESSION_QUERY_KEY });
    });
  });
});
