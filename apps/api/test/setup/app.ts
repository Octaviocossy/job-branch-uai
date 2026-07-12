import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../../src/app.module";

export async function createTestApp(): Promise<{
  app: INestApplication;
  http: ReturnType<INestApplication["getHttpServer"]>;
}> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  return { app, http: app.getHttpServer() };
}
