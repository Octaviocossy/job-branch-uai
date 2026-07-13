"use client";

import { FileText, GitBranch, Loader2, Plus, Star, TrendingUp, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreateCvVersionDialog } from "@/features/profiles/create-cv-version-dialog";
import { useCvVersions } from "@/hooks/use-cv-versions";
import { useSetOutputProfile } from "@/hooks/use-set-output-profile";
import { useUploadCv } from "@/hooks/use-upload-cv";
import { type CvVersion, EResult } from "@/models";
import { cn } from "@/utilities/tailwind.utility";

function interviewRate(version: CvVersion): number {
  return version.rendimiento.applications > 0 ? Math.round((version.rendimiento.interviews / version.rendimiento.applications) * 100) : 0;
}

function findBestPerformer(versions: CvVersion[]): CvVersion | undefined {
  const withApplications = versions.filter((version) => version.rendimiento.applications > 0);

  if (withApplications.length === 0) {
    return undefined;
  }

  return [...withApplications].sort((a, b) => interviewRate(b) - interviewRate(a))[0];
}

function CvVersionCard({ version, isBest }: { version: CvVersion; isBest: boolean }) {
  const uploadCv = useUploadCv();
  const setOutputProfile = useSetOutputProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | undefined>();

  const rate = interviewRate(version);
  const isOutputProfile = version.estado === "seleccionado_salida";
  const canBecomeOutput = version.estado === "disponible" || version.estado === "seleccionado_salida";

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploadError(undefined);
    uploadCv.mutate(
      { id: version.id, file },
      {
        onSuccess: (result) => {
          if (result.type === EResult.ERROR) {
            setUploadError(result.value.getUserMessage());
          }
        },
      },
    );
  };

  return (
    <Card className={cn(isBest && "border-primary/40")}>
      <CardContent className="p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{version.name}</p>
                {isBest && <span className="rounded bg-primary/20 px-1.5 py-0.5 font-semibold text-[10px] text-primary">BEST</span>}
                {isOutputProfile && <span className="rounded bg-blue-400/20 px-1.5 py-0.5 font-semibold text-[10px] text-blue-400">SALIDA</span>}
              </div>
              <p className="text-muted-foreground text-xs">Creado {new Date(version.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}</p>
            </div>
          </div>
          <span className="rounded bg-secondary px-2 py-1 font-mono text-muted-foreground text-xs">{version.focus}</span>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-md bg-secondary p-2.5 text-center">
            <p className="font-bold text-foreground text-lg">{version.rendimiento.applications}</p>
            <p className="text-[10px] text-muted-foreground">Aplicaciones</p>
          </div>
          <div className="rounded-md bg-secondary p-2.5 text-center">
            <p className="font-bold text-foreground text-lg">{version.rendimiento.interviews}</p>
            <p className="text-[10px] text-muted-foreground">Entrevistas</p>
          </div>
          <div className="rounded-md bg-secondary p-2.5 text-center">
            <p className="font-bold text-blue-400 text-lg">{rate}%</p>
            <p className="text-[10px] text-muted-foreground">ROI</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
            <span>Tasa de entrevistas</span>
            <span className="font-mono">{rate}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${rate}%` }} />
          </div>
        </div>

        {version.rendimiento.applications > 0 && (
          <div className="mb-4">
            <p className="mb-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-widest">Usado en</p>
            <span className="rounded bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
              {version.rendimiento.applications} aplicaci{version.rendimiento.applications === 1 ? "ón" : "ones"}
            </span>
          </div>
        )}

        {uploadError && <p className="mb-3 text-destructive text-xs">{uploadError}</p>}

        <div className="flex items-center gap-2 border-border/50 border-t pt-3">
          <input ref={fileInputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileChange} />
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={uploadCv.isPending} onClick={() => fileInputRef.current?.click()}>
            {uploadCv.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
            Subir PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <GitBranch className="h-3.5 w-3.5" />
            Ver ramas
          </Button>
          {!isOutputProfile && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto gap-1.5 text-xs"
              disabled={!canBecomeOutput || setOutputProfile.isPending}
              onClick={() => setOutputProfile.mutate(version.id)}
            >
              {setOutputProfile.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
              Establecer como salida
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfilesView() {
  const { data, isLoading } = useCvVersions();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-foreground text-xl">Perfiles CV</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">Gestiona y versiona tus distintas configuraciones de perfil</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Nueva Versión
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Cargando perfiles…</p>}

      {!isLoading && data?.type === EResult.ERROR && <p className="text-destructive text-sm">{data.value.getUserMessage()}</p>}

      {!isLoading && data?.type === EResult.SUCCESS && <ProfilesList versions={data.value} />}

      <CreateCvVersionDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function ProfilesList({ versions }: { versions: CvVersion[] }) {
  const bestPerformer = findBestPerformer(versions);

  return (
    <>
      {bestPerformer && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
          <Star className="h-4 w-4 shrink-0 text-primary" />
          <div>
            <span className="font-semibold text-primary text-sm">Mejor rendimiento: </span>
            <span className="text-foreground text-sm">{bestPerformer.name}</span>
            <span className="ml-2 text-muted-foreground text-xs">— {interviewRate(bestPerformer)}% tasa de entrevistas</span>
          </div>
        </div>
      )}

      {versions.length === 0 && <p className="text-muted-foreground text-sm">Todavía no tenés versiones de CV. Creá la primera.</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {versions.map((version) => (
          <CvVersionCard key={version.id} version={version} isBest={version.id === bestPerformer?.id} />
        ))}
      </div>
    </>
  );
}
