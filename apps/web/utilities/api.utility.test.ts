import type { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config", () => ({
  axios: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { axios } from "@/config";
import { ApiError, EResult } from "@/models";
import { api } from "@/utilities/api.utility";

function axiosErr(partial: Partial<AxiosError>): AxiosError {
  return { isAxiosError: true, message: "boom", config: {}, ...partial } as unknown as AxiosError;
}

describe("api utility", () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockReset();
    vi.mocked(axios.post).mockReset();
    vi.mocked(axios.put).mockReset();
    vi.mocked(axios.patch).mockReset();
    vi.mocked(axios.delete).mockReset();
  });

  it("wraps a successful GET response in a SUCCESS result", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [{ id: "1" }], status: 200 });

    const result = await api.get("/users");

    expect(result).toEqual({ type: EResult.SUCCESS, value: [{ id: "1" }], status: 200 });
  });

  it("wraps a failed GET response in an ERROR result with an ApiError", async () => {
    vi.mocked(axios.get).mockRejectedValue(axiosErr({ response: { status: 404 } as never }));

    const result = await api.get("/users");

    expect(result.type).toBe(EResult.ERROR);
    expect(result.status).toBe(404);
    expect((result as { value: ApiError }).value).toBeInstanceOf(ApiError);
  });

  it("forwards the body as the second argument on POST", async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { id: "1" }, status: 201 });

    await api.post("/users", { email: "ada@example.com" });

    expect(axios.post).toHaveBeenCalledWith("/users", { email: "ada@example.com" }, { params: undefined, signal: undefined });
  });

  it("forwards the body as the second argument on PATCH", async () => {
    vi.mocked(axios.patch).mockResolvedValue({ data: { id: "1" }, status: 200 });

    const result = await api.patch("/users/1", { email: "ada@example.com" });

    expect(axios.patch).toHaveBeenCalledWith("/users/1", { email: "ada@example.com" }, { params: undefined, signal: undefined });
    expect(result).toEqual({ type: EResult.SUCCESS, value: { id: "1" }, status: 200 });
  });

  it("passes params and signal in the config position on GET", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [], status: 200 });
    const signal = new AbortController().signal;

    await api.get("/users", { page: 1 }, signal);

    expect(axios.get).toHaveBeenCalledWith("/users", { params: { page: 1 }, signal });
  });

  it("passes params and signal in the config position on DELETE", async () => {
    vi.mocked(axios.delete).mockResolvedValue({ data: undefined, status: 204 });
    const signal = new AbortController().signal;

    await api.delete("/users/1", { force: true }, signal);

    expect(axios.delete).toHaveBeenCalledWith("/users/1", { params: { force: true }, signal });
  });
});
