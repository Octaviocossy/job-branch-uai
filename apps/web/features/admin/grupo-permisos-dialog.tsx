"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissionCatalog } from "@/hooks/use-permission-catalog";
import { usePermissionGroups } from "@/hooks/use-permission-groups";
import { useSavePermissionGroup } from "@/hooks/use-save-permission-group";
import { type CatalogoMatriz, type CreateGrupoPermisosInput, createGrupoPermisosSchema, EResult, type GrupoPermisos } from "@/models";

interface GrupoPermisosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The group being edited; omitted to create a new one. */
  group?: GrupoPermisos;
}

interface MovedComponent {
  id: string;
  label: string;
  from: string;
}

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

/** The selected components that another group holds today: one node has one parent, so saving moves them here. */
function findMovedComponents(catalog: CatalogoMatriz, groups: GrupoPermisos[], selectedIds: readonly string[], editingId: string | undefined): MovedComponent[] {
  const selected = new Set(selectedIds);
  const groupNames = new Map(groups.map((candidate) => [candidate.id, candidate.nombre]));
  const moved: MovedComponent[] = [];

  for (const modulo of catalog) {
    for (const formulario of modulo.formularios) {
      for (const accion of formulario.acciones) {
        if (selected.has(accion.id) && accion.grupo && accion.grupo.id !== editingId) {
          moved.push({ id: accion.id, label: accion.codigoAccion, from: accion.grupo.nombre });
        }
      }
    }
  }

  for (const candidate of groups) {
    if (selected.has(candidate.id) && candidate.padreId && candidate.padreId !== editingId) {
      moved.push({ id: candidate.id, label: candidate.nombre, from: groupNames.get(candidate.padreId) ?? "otro grupo" });
    }
  }

  return moved;
}

export function GrupoPermisosDialog({ open, onOpenChange, group }: GrupoPermisosDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{group ? "Editar grupo de permisos" : "Nuevo grupo de permisos"}</DialogTitle>
          <DialogDescription>Un grupo reúne Acciones existentes. Una Acción pertenece a un solo grupo, así que agregarla acá la mueve.</DialogDescription>
        </DialogHeader>
        <GrupoPermisosForm key={group?.id ?? "new"} group={group} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function GrupoPermisosForm({ group, onClose }: { group?: GrupoPermisos; onClose: () => void }) {
  const catalogQuery = usePermissionCatalog();
  const groupsQuery = usePermissionGroups();
  const saveGroup = useSavePermissionGroup();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof createGrupoPermisosSchema>, unknown, CreateGrupoPermisosInput>({
    resolver: zodResolver(createGrupoPermisosSchema),
    defaultValues: {
      nombre: group?.nombre ?? "",
      descripcion: group?.descripcion ?? "",
      padreId: group?.padreId ?? null,
      hijoIds: group?.hijos.map((hijo) => hijo.id) ?? [],
    },
  });

  const selectedIds = watch("hijoIds") ?? [];
  const catalog = catalogQuery.data?.type === EResult.SUCCESS ? catalogQuery.data.value : [];
  const groups = groupsQuery.data?.type === EResult.SUCCESS ? groupsQuery.data.value : [];
  const otherGroups = groups.filter((candidate) => candidate.id !== group?.id);
  const movedComponents = findMovedComponents(catalog, groups, selectedIds, group?.id);
  const loadError = [catalogQuery.data, groupsQuery.data].find((result) => result?.type === EResult.ERROR);
  const isLoading = catalogQuery.isLoading || groupsQuery.isLoading;

  const toggleChild = (id: string, checked: boolean) => {
    const next = checked ? [...selectedIds, id] : selectedIds.filter((selectedId) => selectedId !== id);

    setValue("hijoIds", next, { shouldDirty: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const descripcion = values.descripcion?.trim();
    const result = await saveGroup.mutateAsync({
      id: group?.id,
      input: { ...values, descripcion: descripcion ? descripcion : null },
    });

    if (result.type === EResult.SUCCESS) {
      onClose();
      return;
    }

    setFormError(result.value.getUserMessage());
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="grupo-nombre">Nombre</Label>
        <Input id="grupo-nombre" type="text" placeholder="Tablero" {...register("nombre")} />
        {errors.nombre && <p className="text-destructive text-xs">{errors.nombre.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="grupo-descripcion">Descripción</Label>
        <Input id="grupo-descripcion" type="text" placeholder="Qué habilita este grupo" {...register("descripcion")} />
        {errors.descripcion && <p className="text-destructive text-xs">{errors.descripcion.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="grupo-padre">Grupo padre (opcional)</Label>
        <select id="grupo-padre" className={SELECT_CLASS} {...register("padreId", { setValueAs: (value: string) => value || null })}>
          <option value="">Sin grupo padre</option>
          {otherGroups.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.nombre}
            </option>
          ))}
        </select>
        {errors.padreId && <p className="text-destructive text-xs">{errors.padreId.message}</p>}
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Cargando catálogo…</p>}

      {loadError?.type === EResult.ERROR && <p className="text-destructive text-sm">{loadError.value.getUserMessage()}</p>}

      {otherGroups.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="font-semibold text-[11px] text-muted-foreground uppercase tracking-widest">Subgrupos</legend>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {otherGroups.map((candidate) => (
              <label key={candidate.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selectedIds.includes(candidate.id)} onChange={(event) => toggleChild(candidate.id, event.target.checked)} />
                <span className="text-foreground">{candidate.nombre}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-3">
        <legend className="font-semibold text-[11px] text-muted-foreground uppercase tracking-widest">Acciones</legend>
        {catalog.map((modulo) => (
          <div key={modulo.id} className="space-y-2">
            <p className="font-semibold text-foreground text-sm">{modulo.nombre}</p>
            {modulo.formularios.map((formulario) => (
              <div key={formulario.id} className="space-y-1 pl-3">
                <p className="text-muted-foreground text-xs">{formulario.nombre}</p>
                {formulario.acciones.map((accion) => (
                  <label key={accion.id} className="flex items-start gap-2 pl-3 text-sm">
                    <input type="checkbox" className="mt-1" checked={selectedIds.includes(accion.id)} onChange={(event) => toggleChild(accion.id, event.target.checked)} />
                    <span>
                      <span className="text-foreground">{accion.nombre}</span>{" "}
                      <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-muted-foreground text-xs">{accion.codigoAccion}</span>
                      {accion.grupo && accion.grupo.id !== group?.id && <span className="ml-2 text-muted-foreground text-xs">en «{accion.grupo.nombre}»</span>}
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        ))}
        {errors.hijoIds && <p className="text-destructive text-xs">{errors.hijoIds.message}</p>}
      </fieldset>

      {movedComponents.length > 0 && (
        <div className="flex gap-3 rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-4 py-3" role="status">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
          <div className="space-y-1">
            <p className="font-semibold text-sm text-yellow-400">Se moverán desde su grupo actual</p>
            <ul className="space-y-0.5 text-muted-foreground text-xs">
              {movedComponents.map((moved) => (
                <li key={moved.id}>
                  <span className="font-mono text-foreground">{moved.label}</span> — hoy en «{moved.from}»
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {formError && (
        <p className="text-destructive text-sm" role="alert">
          {formError}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saveGroup.isPending}>
          {saveGroup.isPending ? "Guardando…" : group ? "Guardar cambios" : "Crear grupo"}
        </Button>
      </DialogFooter>
    </form>
  );
}
