import type { UserRole } from "@repo/models";
import { Accion } from "../../domain/accion";
import type { ComponentePermiso } from "../../domain/componente-permiso";
import { GrupoPermisos } from "../../domain/grupo-permisos";

export interface MatrizPermisosFactory {
  crear(): ComponentePermiso;
}

export class PostulanteMatrizFactory implements MatrizPermisosFactory {
  crear(): ComponentePermiso {
    const root = new GrupoPermisos("postulante-root", "Permisos Postulante");

    const cuentaGroup = new GrupoPermisos("postulante-cuenta", "Cuenta");
    cuentaGroup.agregarHijo(new Accion("auth.me", "Ver perfil propio", "auth.me"));
    cuentaGroup.agregarHijo(new Accion("security.viewMatrix", "Ver matriz de permisos", "security.viewMatrix"));

    const branchGroup = new GrupoPermisos("postulante-branch", "Gestión de Ramas");
    branchGroup.agregarHijo(new Accion("branch.create", "Crear rama", "branch.create"));
    branchGroup.agregarHijo(new Accion("branch.clone", "Clonar rama", "branch.clone"));
    branchGroup.agregarHijo(new Accion("branch.archive", "Archivar rama", "branch.archive"));

    const cvGroup = new GrupoPermisos("postulante-cv", "Gestión de CV");
    cvGroup.agregarHijo(new Accion("cv.create", "Crear versión de CV", "cv.create"));
    cvGroup.agregarHijo(new Accion("cv.upload", "Subir archivo de CV", "cv.upload"));
    cvGroup.agregarHijo(new Accion("cv.setOutput", "Definir perfil de salida", "cv.setOutput"));

    const followupGroup = new GrupoPermisos("postulante-followup", "Seguimiento");
    followupGroup.agregarHijo(new Accion("followup.resolve", "Resolver seguimiento", "followup.resolve"));

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

    const cuentaGroup = new GrupoPermisos("recruiter-cuenta", "Cuenta");
    cuentaGroup.agregarHijo(new Accion("auth.me", "Ver perfil propio", "auth.me"));
    cuentaGroup.agregarHijo(new Accion("security.viewMatrix", "Ver matriz de permisos", "security.viewMatrix"));

    const boardGroup = new GrupoPermisos("recruiter-board", "Gestión de Tablero");
    boardGroup.agregarHijo(new Accion("board.view", "Ver tablero", "board.view"));
    boardGroup.agregarHijo(new Accion("board.updateStage", "Actualizar etapa", "board.updateStage"));

    const candidateGroup = new GrupoPermisos("recruiter-candidate", "Gestión de Candidatos");
    candidateGroup.agregarHijo(new Accion("candidate.view", "Ver candidato", "candidate.view"));
    candidateGroup.agregarHijo(new Accion("candidate.addFeedback", "Agregar feedback", "candidate.addFeedback"));
    candidateGroup.agregarHijo(new Accion("candidate.scheduleInterview", "Agendar entrevista", "candidate.scheduleInterview"));

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
