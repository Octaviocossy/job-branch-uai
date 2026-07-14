import type { QueryClient } from "@tanstack/react-query";

/**
 * Query keys derived from branch/application state on the server:
 * - ["applications"]          → the branches list/detail themselves
 * - ["cv-versions"]           → Perfiles' per-CV `rendimiento` (applications/interviews/ROI),
 *                               computed on read by the API (computeRendimiento)
 * - ["analytics", "overview"] → Analítica (per-CV ROI, conversions, heatmap)
 * - ["followup"]              → Seguimiento (days-since-update, urgency)
 *
 * Any successful branch mutation (add-hito, create, clone, archive) must invalidate
 * ALL of these so branch-derived screens refetch immediately instead of showing stale
 * counts until `staleTime` (30s) lapses. See
 * `.agents/plans/2026-07-14-fix-branch-actions-stale-profiles-cache.md`.
 */
export const BRANCH_DEPENDENT_QUERY_KEYS = [
  ["applications"],
  ["cv-versions"],
  ["analytics", "overview"],
  ["followup"],
] as const;

export const invalidateBranchDependentQueries = (queryClient: QueryClient): void => {
  for (const queryKey of BRANCH_DEPENDENT_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: [...queryKey] });
  }
};
