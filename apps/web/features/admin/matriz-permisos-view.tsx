"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GrupoPermisosDialog } from "@/features/admin/grupo-permisos-dialog";
import { PersonasRaicesPanel } from "@/features/admin/personas-raices-panel";
import { useDeletePermissionGroup } from "@/hooks/use-delete-permission-group";
import { usePermissionGroups } from "@/hooks/use-permission-groups";
import { usePermissions } from "@/hooks/use-permissions";
import { EResult, type GrupoPermisos } from "@/models";

interface GrupoNodeProps {
  group: GrupoPermisos;
  childrenByParent: Map<string, GrupoPermisos[]>;
  depth: number;
  onEdit: (group: GrupoPermisos) => void;
  onDelete: (group: GrupoPermisos) => void;
  deletingId: string | undefined;
}

function GrupoNode({ group, childrenByParent, depth, onEdit, onDelete, deletingId }: GrupoNodeProps) {
  const { can } = usePermissions();
  const acciones = group.hijos.filter((hijo) => hijo.tipo === "accion");
  const subgroups = childrenByParent.get(group.id) ?? [];
  const inUse = group.personasConRaiz > 0;

  return (
    <li>
      <div className="rounded-md border border-border/60 bg-secondary/30 p-3" style={{ marginLeft: `${depth * 1.5}rem` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground text-sm">{group.nombre}</p>
            {group.descripcion && <p className="text-muted-foreground text-xs">{group.descripcion}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {can("security.updateGroup") && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => onEdit(group)}>
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            )}
            {can("security.deleteGroup") && (
              <span title={inUse ? "No se puede eliminar un grupo en uso por personas" : undefined}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={inUse || deletingId === group.id} onClick={() => onDelete(group)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </Button>
              </span>
            )}
          </div>
        </div>

        {acciones.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {acciones.map((accion) => (
              <span key={accion.id} className="rounded bg-secondary px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
                {accion.codigoAccion}
              </span>
            ))}
          </div>
        )}

        <p className="mt-2 text-[11px] text-muted-foreground">
          En uso por {group.personasConRaiz} {group.personasConRaiz === 1 ? "persona" : "personas"}
        </p>
      </div>

      {subgroups.length > 0 && (
        <ul className="mt-2 space-y-2">
          {subgroups.map((subgroup) => (
            <GrupoNode key={subgroup.id} group={subgroup} childrenByParent={childrenByParent} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} deletingId={deletingId} />
          ))}
        </ul>
      )}
    </li>
  );
}

function GruposTree({ groups, onEdit }: { groups: GrupoPermisos[]; onEdit: (group: GrupoPermisos) => void }) {
  const deleteGroup = useDeletePermissionGroup();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const groupIds = new Set(groups.map((group) => group.id));
  const childrenByParent = new Map<string, GrupoPermisos[]>();
  const roots: GrupoPermisos[] = [];

  for (const group of groups) {
    if (group.padreId && groupIds.has(group.padreId)) {
      childrenByParent.set(group.padreId, [...(childrenByParent.get(group.padreId) ?? []), group]);
    } else {
      roots.push(group);
    }
  }

  const handleDelete = (group: GrupoPermisos) => {
    setDeleteError(null);
    deleteGroup.mutate(group.id, {
      onSuccess: (result) => {
        if (result.type === EResult.ERROR) {
          setDeleteError(result.value.getUserMessage());
        }
      },
    });
  };

  if (groups.length === 0) {
    return <p className="text-muted-foreground text-sm">Todavía no hay grupos de permisos.</p>;
  }

  return (
    <>
      {deleteError && (
        <p className="mb-3 text-destructive text-sm" role="alert">
          {deleteError}
        </p>
      )}
      <ul className="space-y-2">
        {roots.map((group) => (
          <GrupoNode
            key={group.id}
            group={group}
            childrenByParent={childrenByParent}
            depth={0}
            onEdit={onEdit}
            onDelete={handleDelete}
            deletingId={deleteGroup.isPending ? deleteGroup.variables : undefined}
          />
        ))}
      </ul>
    </>
  );
}

export function MatrizPermisosView() {
  const { data, isLoading } = usePermissionGroups();
  const { can } = usePermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GrupoPermisos | undefined>();

  const openCreate = () => {
    setEditingGroup(undefined);
    setDialogOpen(true);
  };

  const openEdit = (group: GrupoPermisos) => {
    setEditingGroup(group);
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="font-semibold text-foreground text-xl">Matriz de permisos</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">Los cambios se aplican en el próximo inicio de sesión de cada persona.</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Grupos de permisos</CardTitle>
          {can("security.createGroup") && (
            <Button size="sm" className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nuevo grupo
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground text-sm">Cargando grupos…</p>}

          {!isLoading && data?.type === EResult.ERROR && <p className="text-destructive text-sm">{data.value.getUserMessage()}</p>}

          {!isLoading && data?.type === EResult.SUCCESS && <GruposTree groups={data.value} onEdit={openEdit} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personas</CardTitle>
        </CardHeader>
        <CardContent>
          <PersonasRaicesPanel />
        </CardContent>
      </Card>

      {(can("security.createGroup") || can("security.updateGroup")) && <GrupoPermisosDialog open={dialogOpen} onOpenChange={setDialogOpen} group={editingGroup} />}
    </div>
  );
}
