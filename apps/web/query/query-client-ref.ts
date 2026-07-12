import type { QueryClient } from "@tanstack/react-query";

let client: QueryClient | undefined;

export const setRouterQueryClient = (queryClient: QueryClient) => {
  client = queryClient;
};

export const getRouterQueryClient = () => client;
