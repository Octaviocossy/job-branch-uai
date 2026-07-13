"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateApplication } from "@/hooks/use-create-application";
import { useCvVersions } from "@/hooks/use-cv-versions";
import { applicationStatusSchema, type CreateApplicationInput, createApplicationSchema, EResult } from "@/models";

interface CreateBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBranchDialog({ open, onOpenChange }: CreateBranchDialogProps) {
  const createApplication = useCreateApplication();
  const cvVersionsQuery = useCvVersions();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateApplicationInput>({
    resolver: zodResolver(createApplicationSchema),
    defaultValues: { status: "Enviado", cvVersion: "", techStack: [], archived: false },
  });

  useEffect(() => {
    if (!open) {
      reset();
      setFormError(null);
    }
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await createApplication.mutateAsync(values);

    if (result.type === EResult.SUCCESS) {
      onOpenChange(false);
      return;
    }

    setFormError(result.value.getUserMessage());
  });

  const cvVersions = cvVersionsQuery.data?.type === EResult.SUCCESS ? cvVersionsQuery.data.value : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva rama</DialogTitle>
          <DialogDescription>Registra un nuevo proceso de postulación.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="branch-company">Empresa</Label>
            <Input id="branch-company" type="text" placeholder="Acme Corp" {...register("company")} />
            {errors.company && <p className="text-destructive text-xs">{errors.company.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch-role">Rol</Label>
            <Input id="branch-role" type="text" placeholder="Frontend Engineer" {...register("role")} />
            {errors.role && <p className="text-destructive text-xs">{errors.role.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch-status">Estado</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="branch-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {applicationStatusSchema.options.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && <p className="text-destructive text-xs">{errors.status.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-applied-date">Fecha de postulación</Label>
              <Input id="branch-applied-date" type="date" {...register("appliedDate")} />
              {errors.appliedDate && <p className="text-destructive text-xs">{errors.appliedDate.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch-cv-version">Versión de CV</Label>
            <Controller
              control={control}
              name="cvVersion"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="branch-cv-version">
                    <SelectValue placeholder="Selecciona una versión" />
                  </SelectTrigger>
                  <SelectContent>
                    {cvVersions.map((version) => (
                      <SelectItem key={version.id} value={version.name}>
                        {version.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.cvVersion && <p className="text-destructive text-xs">{errors.cvVersion.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch-tech-stack">Stack (separado por coma)</Label>
            <Input
              id="branch-tech-stack"
              type="text"
              placeholder="react, typescript, node"
              {...register("techStack", {
                setValueAs: (value: string) =>
                  (value ?? "")
                    .split(",")
                    .map((tech) => tech.trim())
                    .filter(Boolean),
              })}
            />
            {errors.techStack && <p className="text-destructive text-xs">{errors.techStack.message}</p>}
          </div>
          {formError && (
            <p className="text-destructive text-sm" role="alert">
              {formError}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createApplication.isPending}>
              {createApplication.isPending ? "Creando…" : "Crear rama"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
