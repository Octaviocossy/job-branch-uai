import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, type RenderResult, render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithClient(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">): RenderResult & { queryClient: QueryClient } {
  const queryClient = createTestQueryClient();

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  return { queryClient, ...render(ui, { wrapper, ...options }) };
}
