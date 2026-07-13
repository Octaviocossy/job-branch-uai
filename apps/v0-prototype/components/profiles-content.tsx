"use client";

import { CV_VERSIONS, APPLICATIONS } from "@/lib/data";
import {
  FileText,
  Plus,
  TrendingUp,
  GitBranch,
  Star,
  UploadCloud,
} from "lucide-react";

export function ProfilesContent() {
  const bestCv = [...CV_VERSIONS].sort(
    (a, b) => b.interviews / b.applications - a.interviews / a.applications
  )[0];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Perfiles CV</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestiona y versiona tus distintas configuraciones de perfil
          </p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-3.5 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Nueva Versión
        </button>
      </div>

      {/* Best performer callout */}
      <div className="flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-lg px-4 py-3">
        <Star className="w-4 h-4 text-primary shrink-0" />
        <div>
          <span className="text-sm font-semibold text-primary">Mejor rendimiento: </span>
          <span className="text-sm text-foreground">{bestCv.name}</span>
          <span className="text-xs text-muted-foreground ml-2">
            — {Math.round((bestCv.interviews / bestCv.applications) * 100)}% tasa de entrevistas
          </span>
        </div>
      </div>

      {/* CV Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CV_VERSIONS.map((cv) => {
          const rate = cv.applications > 0 ? Math.round((cv.interviews / cv.applications) * 100) : 0;
          const usedIn = APPLICATIONS.filter((a) => a.cvVersion === cv.name);
          const isBest = cv.id === bestCv.id;

          return (
            <div
              key={cv.id}
              className={`bg-card border rounded-lg p-5 ${isBest ? "border-primary/40" : "border-border"}`}
            >
              {/* Top */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{cv.name}</p>
                      {isBest && (
                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-semibold">BEST</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Creado {new Date(cv.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <span className="text-xs bg-secondary text-muted-foreground px-2 py-1 rounded font-mono">
                  {cv.focus}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-secondary rounded-md p-2.5 text-center">
                  <p className="text-lg font-bold text-foreground">{cv.applications}</p>
                  <p className="text-[10px] text-muted-foreground">Aplicaciones</p>
                </div>
                <div className="bg-secondary rounded-md p-2.5 text-center">
                  <p className="text-lg font-bold text-foreground">{cv.interviews}</p>
                  <p className="text-[10px] text-muted-foreground">Entrevistas</p>
                </div>
                <div className="bg-secondary rounded-md p-2.5 text-center">
                  <p className="text-lg font-bold text-blue-400">{rate}%</p>
                  <p className="text-[10px] text-muted-foreground">ROI</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Tasa de entrevistas</span>
                  <span className="font-mono">{rate}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-400 transition-all"
                    style={{ width: `${rate}%` }}
                  />
                </div>
              </div>

              {/* Used in */}
              {usedIn.length > 0 && (
                <div className="mb-4">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold mb-2">
                    Usado en
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {usedIn.slice(0, 4).map((a) => (
                      <span
                        key={a.id}
                        className="text-[11px] bg-secondary text-muted-foreground px-2 py-0.5 rounded"
                      >
                        {a.company}
                      </span>
                    ))}
                    {usedIn.length > 4 && (
                      <span className="text-[11px] text-muted-foreground/60">+{usedIn.length - 4} más</span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-secondary px-2.5 py-1.5 rounded transition-colors">
                  <UploadCloud className="w-3.5 h-3.5" />
                  Subir PDF
                </button>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-secondary px-2.5 py-1.5 rounded transition-colors">
                  <GitBranch className="w-3.5 h-3.5" />
                  Ver ramas
                </button>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-secondary px-2.5 py-1.5 rounded transition-colors ml-auto">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Analizar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload new version CTA */}
      <button className="w-full flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all">
        <UploadCloud className="w-8 h-8" />
        <p className="text-sm font-medium">Subir nueva versión de CV</p>
        <p className="text-xs text-muted-foreground/60">PDF, DOCX — hasta 10 MB</p>
      </button>
    </div>
  );
}
