import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { BRANCH_DEPENDENT_QUERY_KEYS, invalidateBranchDependentQueries } from "./branch-dependent-keys";

describe("invalidateBranchDependentQueries", () => {
  it("invalidates every branch-dependent query key", () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    invalidateBranchDependentQueries(queryClient);

    expect(spy).toHaveBeenCalledTimes(BRANCH_DEPENDENT_QUERY_KEYS.length);
    for (const queryKey of BRANCH_DEPENDENT_QUERY_KEYS) {
      expect(spy).toHaveBeenCalledWith({ queryKey: [...queryKey] });
    }
  });

  it("includes cv-versions so Perfiles refetches after a branch action", () => {
    expect(BRANCH_DEPENDENT_QUERY_KEYS).toContainEqual(["cv-versions"]);
  });
});
