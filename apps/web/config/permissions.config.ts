import type { LucideIcon } from "lucide-react";
import { BarChart3, Bell, FileText, GitBranch, LayoutDashboard, ShieldCheck } from "lucide-react";

/** Every screen and the codigoAccion its data needs (decision 14). Dynamic segments use `[param]`. */
export const ROUTE_PERMISSIONS = [
  { route: "/", codigoAccion: "branch.list" },
  { route: "/branches", codigoAccion: "branch.list" },
  { route: "/branches/[id]", codigoAccion: "branch.view" },
  { route: "/analytics", codigoAccion: "analytics.overview" },
  { route: "/followup", codigoAccion: "followup.list" },
  { route: "/profiles", codigoAccion: "cv.list" },
  { route: "/admin/permisos", codigoAccion: "security.listGroups" },
] as const;

/** Buttons and the codigoAccion each one needs. */
export const ACTION_PERMISSIONS = {
  createBranch: ["branch.create", "cv.list"], // the dialog loads the CV versions it applies with
  cloneBranch: ["branch.clone"],
  archiveBranch: ["branch.archive"],
  addHito: ["branch.addHito"],
  createCvVersion: ["cv.create"],
  uploadCv: ["cv.upload"],
  setOutputProfile: ["cv.setOutput"],
  resolveFollowup: ["followup.resolve"],
} as const satisfies Record<string, readonly string[]>;

export type ActionKey = keyof typeof ACTION_PERMISSIONS;

export const NAV_ITEMS: ReadonlyArray<{ href: string; icon: LucideIcon; label: string }> = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/branches", icon: GitBranch, label: "Ramas" },
  { href: "/analytics", icon: BarChart3, label: "Analítica" },
  { href: "/followup", icon: Bell, label: "Follow-up" },
  { href: "/profiles", icon: FileText, label: "Perfiles CV" },
  { href: "/admin/permisos", icon: ShieldCheck, label: "Administración" },
];

const DYNAMIC_SEGMENT = /^\[.+\]$/;

function segmentsOf(path: string): string[] {
  return path.split("/").filter(Boolean);
}

function matchesPattern(pattern: string, pathname: string): boolean {
  const patternSegments = segmentsOf(pattern);
  const pathSegments = segmentsOf(pathname);

  return patternSegments.length === pathSegments.length && patternSegments.every((segment, index) => DYNAMIC_SEGMENT.test(segment) || segment === pathSegments[index]);
}

/** The code a pathname needs, or undefined for a route outside the map. */
export function codigoParaRuta(pathname: string): string | undefined {
  const exact = ROUTE_PERMISSIONS.find(({ route }) => route === pathname);

  if (exact) {
    return exact.codigoAccion;
  }

  return ROUTE_PERMISSIONS.find(({ route }) => matchesPattern(route, pathname))?.codigoAccion;
}

/** The first nav route the given permisos allow, or undefined. */
export function primeraRutaPermitida(permisos: ReadonlySet<string>): string | undefined {
  return NAV_ITEMS.find(({ href }) => {
    const codigo = codigoParaRuta(href);

    return codigo !== undefined && permisos.has(codigo);
  })?.href;
}
