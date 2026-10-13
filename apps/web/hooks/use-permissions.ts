import { useCallback, useMemo } from "react";
import { ACTION_PERMISSIONS, type ActionKey } from "@/config/permissions.config";
import { useSession } from "@/hooks/use-session";

export const usePermissions = () => {
  const { session, isPending } = useSession();
  const permisos = useMemo(() => new Set(session?.permisos ?? []), [session]);
  const can = useCallback((...codigos: readonly string[]) => codigos.every((codigo) => permisos.has(codigo)), [permisos]);
  const canDo = useCallback((action: ActionKey) => can(...ACTION_PERMISSIONS[action]), [can]);

  return { permisos, can, canDo, isPending, isLoaded: session !== undefined };
};
