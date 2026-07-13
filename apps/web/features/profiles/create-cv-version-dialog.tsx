"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateCvVersion } from "@/hooks/use-create-cv-version";
import { type CreateCvVersionRequest, createCvVersionRequestSchema, EResult } from "@/models";

interface CreateCvVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCvVersionDialog({ open, onOpenChange }: CreateCvVersionDialogProps) {
  const createCvVersion = useCreateCvVersion();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCvVersionRequest>({
    resolver: zodResolver(createCvVersionRequestSchema),
  });

  useEffect(() => {
    if (!open) {
      reset();
      setFormError(null);
    }
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await createCvVersion.mutateAsync(values);

    if (result.type === EResult.SUCCESS) {
      onOpenChange(false);
      return;
    }

    setFormError(result.value.getUserMessage());
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva versión de CV</DialogTitle>
          <DialogDescription>Crea una nueva versión de tu perfil para postular a nuevas ramas.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="cv-version-name">Nombre</Label>
            <Input id="cv-version-name" type="text" placeholder="v4.0 — Backend Focused" {...register("name")} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cv-version-focus">Foco</Label>
            <Input id="cv-version-focus" type="text" placeholder="Backend" {...register("focus")} />
            {errors.focus && <p className="text-destructive text-xs">{errors.focus.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cv-version-tags">Tags (separados por coma)</Label>
            <Input
              id="cv-version-tags"
              type="text"
              placeholder="backend, node, postgres"
              {...register("tags", {
                setValueAs: (value: string) => {
                  const tags = (value ?? "")
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean);
                  return tags.length > 0 ? tags : undefined;
                },
              })}
            />
            {errors.tags && <p className="text-destructive text-xs">{errors.tags.message}</p>}
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
            <Button type="submit" disabled={createCvVersion.isPending}>
              {createCvVersion.isPending ? "Creando…" : "Crear versión"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
