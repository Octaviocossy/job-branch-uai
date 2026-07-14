import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { CvVersionRecord, CvVersionRepository } from "../../domain/cv-version.repository";
import { UploadCvFileUseCase } from "./upload-cv-file.use-case";

function makeRepo(overrides: Partial<CvVersionRepository> = {}): CvVersionRepository {
  return {
    findAllByUser: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateFile: vi.fn(),
    setOutputProfile: vi.fn(),
    setSnapshotVacante: vi.fn(),
    archive: vi.fn(),
    computeRendimiento: vi.fn().mockResolvedValue({ applications: 0, interviews: 0 }),
    ...overrides,
  };
}

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

const draft: CvVersionRecord = {
  id: "cv1",
  name: "v1",
  focus: "General",
  tags: [],
  esPerfilSalida: false,
  estado: "borrador",
  tamanioBytes: 0,
  createdAt: "2024-01-10",
  snapshotVacanteId: null,
};

const validFile = { buffer: Buffer.from("pdf-bytes"), mimetype: "application/pdf", size: 1024 };

describe("UploadCvFileUseCase", () => {
  it("BR-6: rejects a file larger than 10 MB", async () => {
    const repo = makeRepo();
    const useCase = new UploadCvFileUseCase(repo, makeLogger());

    await expect(useCase.execute("u1", "cv1", { ...validFile, size: 10 * 1024 * 1024 + 1 })).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.updateFile).not.toHaveBeenCalled();
  });

  it("BR-6: rejects a non PDF/DOCX mime type", async () => {
    const repo = makeRepo();
    const useCase = new UploadCvFileUseCase(repo, makeLogger());

    await expect(useCase.execute("u1", "cv1", { ...validFile, mimetype: "image/png" })).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.updateFile).not.toHaveBeenCalled();
  });

  it("rejects when no file is provided", async () => {
    const repo = makeRepo();
    const useCase = new UploadCvFileUseCase(repo, makeLogger());

    await expect(useCase.execute("u1", "cv1", undefined)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws NotFoundException when the cv version does not belong to the user", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const useCase = new UploadCvFileUseCase(repo, makeLogger());

    await expect(useCase.execute("u1", "cv1", validFile)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("BR-9: promotes a borrador version to disponible once a file is attached", async () => {
    const repo = makeRepo({
      findById: vi.fn().mockResolvedValue(draft),
      updateFile: vi.fn().mockResolvedValue({ ...draft, estado: "disponible", tamanioBytes: validFile.size }),
    });
    const useCase = new UploadCvFileUseCase(repo, makeLogger());

    const result = await useCase.execute("u1", "cv1", validFile);

    expect(repo.updateFile).toHaveBeenCalledWith("cv1", "u1", { buffer: validFile.buffer, sizeBytes: validFile.size, estado: "disponible" });
    expect(result.estado).toBe("disponible");
  });

  it("keeps a non-draft version's estado unchanged when replacing its file", async () => {
    const disponible: CvVersionRecord = { ...draft, estado: "disponible" };
    const repo = makeRepo({
      findById: vi.fn().mockResolvedValue(disponible),
      updateFile: vi.fn().mockResolvedValue(disponible),
    });
    const useCase = new UploadCvFileUseCase(repo, makeLogger());

    await useCase.execute("u1", "cv1", validFile);

    expect(repo.updateFile).toHaveBeenCalledWith("cv1", "u1", { buffer: validFile.buffer, sizeBytes: validFile.size, estado: "disponible" });
  });
});
