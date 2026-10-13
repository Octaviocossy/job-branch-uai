"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAssignRoot } from "@/hooks/use-assign-root";
import { usePermissionGroups } from "@/hooks/use-permission-groups";
import { usePermissions } from "@/hooks/use-permissions";
import { usePersonasRoots } from "@/hooks/use-personas-roots";
import { useRemoveRoot } from "@/hooks/use-remove-root";
import { EResult, type GrupoPermisos, type PersonaRaices } from "@/models";
import { cn } from "@/utilities/tailwind.utility";

const TIPO_LABELS: Record<PersonaRaices["tipo"], string> = {
  postulante: "Postulante",
  recruiter: "Recruiter",
  administrador: "Administrador",
};

const LAST_ROOT_TITLE = "Una persona no puede quedar sin raíces";

function PersonaRow({ persona, groups }: { persona: PersonaRaices; groups: GrupoPermisos[] }) {
  const { can } = usePermissions();
  const assignRoot = useAssignRoot();
  const removeRoot = useRemoveRoot();
  const [adding, setAdding] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const heldIds = new Set(persona.raices.map((raiz) => raiz.id));
  const availableGroups = groups.filter((group) => !heldIds.has(group.id));
  const hasSingleRoot = persona.raices.length <= 1;

  const closeAdder = () => {
    setAdding(false);
    setSelectedGroupId("");
  };

  const handleRemove = (componenteId: string) => {
    setError(null);
    removeRoot.mutate(
      { personaId: persona.personaId, componenteId },
      {
        onSuccess: (result) => {
          if (result.type === EResult.ERROR) {
            setError(result.value.getUserMessage());
          }
        },
      },
    );
  };

  const handleAssign = () => {
    setError(null);
    assignRoot.mutate(
      { personaId: persona.personaId, componenteId: selectedGroupId },
      {
        onSuccess: (result) => {
          if (result.type === EResult.ERROR) {
            setError(result.value.getUserMessage());
            return;
          }

          closeAdder();
        },
      },
    );
  };

  return (
    <tr className="border-border/50 border-t align-top">
      <td className="px-3 py-3">
        <p className="font-medium text-foreground text-sm">{persona.usuario.nombreCompleto}</p>
        <p className="text-muted-foreground text-xs">{persona.usuario.email}</p>
      </td>
      <td className="px-3 py-3 text-muted-foreground text-sm">{TIPO_LABELS[persona.tipo]}</td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {persona.raices.map((raiz) => (
            <span key={raiz.id} className="inline-flex items-center gap-1 rounded bg-secondary py-0.5 pr-1 pl-2 text-foreground text-xs">
              <span className={cn(raiz.tipo === "accion" && "font-mono")}>{raiz.nombre}</span>
              {can("security.removeRoot") && (
                <button
                  type="button"
                  aria-label={`Quitar raíz ${raiz.nombre} de ${persona.usuario.nombreCompleto}`}
                  title={hasSingleRoot ? LAST_ROOT_TITLE : "Quitar raíz"}
                  disabled={hasSingleRoot || removeRoot.isPending}
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  onClick={() => handleRemove(raiz.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}

          {can("security.assignRoot") && !adding && (
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" disabled={availableGroups.length === 0} onClick={() => setAdding(true)}>
              <Plus className="h-3 w-3" />
              Agregar raíz
            </Button>
          )}
        </div>

        {adding && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              aria-label={`Grupo a agregar a ${persona.usuario.nombreCompleto}`}
              value={selectedGroupId}
              onChange={(event) => setSelectedGroupId(event.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Elegí un grupo…</option>
              {availableGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.nombre}
                </option>
              ))}
            </select>
            <Button size="sm" className="h-8 text-xs" disabled={selectedGroupId === "" || assignRoot.isPending} onClick={handleAssign}>
              {assignRoot.isPending ? "Agregando…" : "Confirmar"}
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={closeAdder}>
              Cancelar
            </Button>
          </div>
        )}

        {error && (
          <p className="mt-2 text-destructive text-xs" role="alert">
            {error}
          </p>
        )}
      </td>
    </tr>
  );
}

export function PersonasRaicesPanel() {
  const personasQuery = usePersonasRoots();
  const groupsQuery = usePermissionGroups();

  if (personasQuery.isLoading || groupsQuery.isLoading) {
    return <p className="text-muted-foreground text-sm">Cargando personas…</p>;
  }

  if (personasQuery.data?.type === EResult.ERROR) {
    return <p className="text-destructive text-sm">{personasQuery.data.value.getUserMessage()}</p>;
  }

  if (groupsQuery.data?.type === EResult.ERROR) {
    return <p className="text-destructive text-sm">{groupsQuery.data.value.getUserMessage()}</p>;
  }

  if (personasQuery.data?.type !== EResult.SUCCESS || groupsQuery.data?.type !== EResult.SUCCESS) {
    return null;
  }

  const personas = personasQuery.data.value;
  const groups = groupsQuery.data.value;

  if (personas.length === 0) {
    return <p className="text-muted-foreground text-sm">Todavía no hay personas registradas.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="font-semibold text-[11px] text-muted-foreground uppercase tracking-widest">
            <th className="px-3 py-2">Usuario</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Raíces</th>
          </tr>
        </thead>
        <tbody>
          {personas.map((persona) => (
            <PersonaRow key={persona.personaId} persona={persona} groups={groups} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
