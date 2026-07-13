import type { CvVersion, CvVersionEstado, CvVersionRendimiento } from "@repo/models";

export const CV_VERSION_REPOSITORY = Symbol("CV_VERSION_REPOSITORY");

export type CvVersionRecord = Omit<CvVersion, "rendimiento">;

export interface CreateCvVersionParams {
  usuarioId: string;
  name: string;
  focus: string;
  tags: string[];
}

export interface UpdateCvFileParams {
  buffer: Buffer;
  sizeBytes: number;
  estado: CvVersionEstado;
}

export interface CvVersionRepository {
  findAllByUser(usuarioId: string): Promise<CvVersionRecord[]>;
  findById(id: string, usuarioId: string): Promise<CvVersionRecord | null>;
  create(params: CreateCvVersionParams): Promise<CvVersionRecord>;
  updateFile(id: string, usuarioId: string, params: UpdateCvFileParams): Promise<CvVersionRecord>;
  setOutputProfile(id: string, usuarioId: string): Promise<CvVersionRecord>;
  archive(id: string, usuarioId: string): Promise<CvVersionRecord>;
  computeRendimiento(cvVersionId: string): Promise<CvVersionRendimiento>;
}
