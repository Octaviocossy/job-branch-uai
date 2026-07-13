import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EResult } from "@/models";

vi.mock("@/services/users.service", () => ({
  users_service: { list: vi.fn(), create: vi.fn() },
}));

import { useCreateUser } from "@/hooks/use-create-user";
import { users_service } from "@/services/users.service";

function wrapperFactory() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  return { wrapper, invalidate };
}

describe("useCreateUser", () => {
  beforeEach(() => {
    vi.mocked(users_service.create).mockReset();
  });

  it("invalidates the users query on success", async () => {
    vi.mocked(users_service.create).mockResolvedValue({
      type: EResult.SUCCESS,
      value: { id: "00000000-0000-0000-0000-000000000000", email: "ada@example.com", displayName: "Ada", role: "postulante" },
      status: 201,
    });

    const { wrapper, invalidate } = wrapperFactory();
    const { result } = renderHook(() => useCreateUser(), { wrapper });

    await result.current.mutateAsync({ email: "ada@example.com", displayName: "Ada", role: "postulante" });

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
    });
  });
});
