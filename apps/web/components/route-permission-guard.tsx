"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { codigoParaRuta, primeraRutaPermitida } from "@/config/permissions.config";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * Redirects a route the Persona may not open. Hiding is UX, not security: the server checks every
 * request on its own. A session that failed to load is not "no permissions", so it renders the
 * children rather than redirecting to /signin, where the GuestGuard would send a still-valid token back.
 */
export function RoutePermissionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { permisos, can, isPending, isLoaded } = usePermissions();

  const codigo = codigoParaRuta(pathname);
  const blocked = !isPending && isLoaded && codigo !== undefined && !can(codigo);

  useEffect(() => {
    if (blocked) {
      router.replace(primeraRutaPermitida(permisos) ?? "/signin");
    }
  }, [blocked, permisos, router]);

  if (isPending || blocked) return null;

  return <>{children}</>;
}
