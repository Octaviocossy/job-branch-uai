import { describe, expect, it } from "vitest";
import { ContextoSeguridad } from "../../domain/contexto-seguridad";
import { PostulanteMatrizFactory, RecruiterMatrizFactory, resolverFactory } from "./matriz-permisos.factory";

const POSTULANTE_ACCIONES = [
  "auth.me",
  "security.viewMatrix",
  "branch.create",
  "branch.clone",
  "branch.archive",
  "cv.create",
  "cv.upload",
  "cv.setOutput",
  "followup.resolve",
].sort();

const RECRUITER_ACCIONES = ["auth.me", "security.viewMatrix", "board.view", "board.updateStage", "candidate.view", "candidate.addFeedback", "candidate.scheduleInterview"].sort();

describe("PostulanteMatrizFactory", () => {
  it("builds a non-empty tree scoped to postulante actions (BR-4)", () => {
    const contexto = new ContextoSeguridad(new PostulanteMatrizFactory().crear());

    expect(contexto.listarAcciones().length).toBeGreaterThan(0);
    expect(contexto.tienePermiso("branch.create")).toBe(true);
    expect(contexto.tienePermiso("cv.upload")).toBe(true);
    expect(contexto.tienePermiso("followup.resolve")).toBe(true);
    expect(contexto.tienePermiso("board.updateStage")).toBe(false);
    expect(contexto.tienePermiso("candidate.addFeedback")).toBe(false);
  });

  it("resolves the same action codes through the deeper Grupo -> Modulo -> Formulario -> Accion tree", () => {
    const contexto = new ContextoSeguridad(new PostulanteMatrizFactory().crear());

    expect(contexto.listarAcciones().sort()).toEqual(POSTULANTE_ACCIONES);
  });
});

describe("RecruiterMatrizFactory", () => {
  it("builds a non-empty tree scoped to recruiter actions (BR-4)", () => {
    const contexto = new ContextoSeguridad(new RecruiterMatrizFactory().crear());

    expect(contexto.listarAcciones().length).toBeGreaterThan(0);
    expect(contexto.tienePermiso("board.updateStage")).toBe(true);
    expect(contexto.tienePermiso("candidate.addFeedback")).toBe(true);
    expect(contexto.tienePermiso("branch.create")).toBe(false);
    expect(contexto.tienePermiso("cv.upload")).toBe(false);
  });

  it("resolves the same action codes through the deeper Grupo -> Modulo -> Formulario -> Accion tree", () => {
    const contexto = new ContextoSeguridad(new RecruiterMatrizFactory().crear());

    expect(contexto.listarAcciones().sort()).toEqual(RECRUITER_ACCIONES);
  });
});

describe("resolverFactory", () => {
  it("resolves PostulanteMatrizFactory for role postulante", () => {
    expect(resolverFactory("postulante")).toBeInstanceOf(PostulanteMatrizFactory);
  });

  it("resolves RecruiterMatrizFactory for role recruiter", () => {
    expect(resolverFactory("recruiter")).toBeInstanceOf(RecruiterMatrizFactory);
  });

  it("yields a distinct, non-empty matrix per role", () => {
    const postulanteAcciones = new ContextoSeguridad(resolverFactory("postulante").crear()).listarAcciones();
    const recruiterAcciones = new ContextoSeguridad(resolverFactory("recruiter").crear()).listarAcciones();

    expect(postulanteAcciones.length).toBeGreaterThan(0);
    expect(recruiterAcciones.length).toBeGreaterThan(0);
    expect(postulanteAcciones.sort()).not.toEqual(recruiterAcciones.sort());
  });
});
