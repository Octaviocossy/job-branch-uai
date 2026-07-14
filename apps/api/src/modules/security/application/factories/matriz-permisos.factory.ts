import type { UserRole } from "@repo/models";
import { Accion } from "../../domain/accion";
import type { ComponentePermiso } from "../../domain/componente-permiso";
import { Formulario } from "../../domain/formulario";
import { GrupoPermisos } from "../../domain/grupo-permisos";
import { Modulo } from "../../domain/modulo";

export interface MatrizPermisosFactory {
  crear(): ComponentePermiso;
}

function crearModulo(id: string, nombre: string, acciones: Accion[]): Modulo {
  const modulo = new Modulo(`mod.${id}`, nombre);
  const formulario = new Formulario(`form.${id}`, nombre);

  for (const accion of acciones) {
    formulario.agregarHijo(accion);
  }

  modulo.agregarHijo(formulario);

  return modulo;
}

export class PostulanteMatrizFactory implements MatrizPermisosFactory {
  crear(): ComponentePermiso {
    const root = new GrupoPermisos("postulante-root", "Permisos Postulante");

    const cuentaGroup = crearModulo("cuenta", "Cuenta", [
      new Accion("auth.me", "Ver perfil propio", "auth.me"),
      new Accion("security.viewMatrix", "Ver matriz de permisos", "security.viewMatrix"),
    ]);

    const branchGroup = crearModulo("branch", "Gestión de Ramas", [
      new Accion("branch.create", "Crear rama", "branch.create"),
      new Accion("branch.clone", "Clonar rama", "branch.clone"),
      new Accion("branch.archive", "Archivar rama", "branch.archive"),
    ]);

    const cvGroup = crearModulo("cv", "Gestión de CV", [
      new Accion("cv.create", "Crear versión de CV", "cv.create"),
      new Accion("cv.upload", "Subir archivo de CV", "cv.upload"),
      new Accion("cv.setOutput", "Definir perfil de salida", "cv.setOutput"),
    ]);

    const followupGroup = crearModulo("followup", "Seguimiento", [
      new Accion("followup.resolve", "Resolver seguimiento", "followup.resolve"),
    ]);

    root.agregarHijo(cuentaGroup);
    root.agregarHijo(branchGroup);
    root.agregarHijo(cvGroup);
    root.agregarHijo(followupGroup);

    return root;
  }
}

export class RecruiterMatrizFactory implements MatrizPermisosFactory {
  crear(): ComponentePermiso {
    const root = new GrupoPermisos("recruiter-root", "Permisos Recruiter");

    const cuentaGroup = crearModulo("cuenta", "Cuenta", [
      new Accion("auth.me", "Ver perfil propio", "auth.me"),
      new Accion("security.viewMatrix", "Ver matriz de permisos", "security.viewMatrix"),
    ]);

    const boardGroup = crearModulo("board", "Gestión de Tablero", [
      new Accion("board.view", "Ver tablero", "board.view"),
      new Accion("board.updateStage", "Actualizar etapa", "board.updateStage"),
    ]);

    const candidateGroup = crearModulo("candidate", "Gestión de Candidatos", [
      new Accion("candidate.view", "Ver candidato", "candidate.view"),
      new Accion("candidate.addFeedback", "Agregar feedback", "candidate.addFeedback"),
      new Accion("candidate.scheduleInterview", "Agendar entrevista", "candidate.scheduleInterview"),
    ]);

    root.agregarHijo(cuentaGroup);
    root.agregarHijo(boardGroup);
    root.agregarHijo(candidateGroup);

    return root;
  }
}

export function resolverFactory(role: UserRole): MatrizPermisosFactory {
  const factories: Record<UserRole, () => MatrizPermisosFactory> = {
    postulante: () => new PostulanteMatrizFactory(),
    recruiter: () => new RecruiterMatrizFactory(),
  };

  return factories[role]();
}
