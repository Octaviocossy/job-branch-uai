import { useQuery } from "@tanstack/react-query";
import { EResult, type MeResponse } from "@/models";
import { SESSION_QUERY_KEY } from "@/query/session-query-key";
import { auth_service } from "@/services/auth.service";
import { getAuthToken } from "@/utilities/auth-token.utility";

export const useSession = () => {
  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: ({ signal }) => auth_service.me(signal),
    enabled: !!getAuthToken(),
  });

  const session: MeResponse | undefined = query.data?.type === EResult.SUCCESS ? query.data.value : undefined;

  return { ...query, session, user: session?.user };
};
