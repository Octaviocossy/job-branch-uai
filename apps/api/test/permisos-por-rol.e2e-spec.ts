import type { INestApplication } from "@nestjs/common";
import type { PersonaTipo } from "@repo/models";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "./setup/app";
import { crearAdministrador, DEFAULT_PASSWORD, login, registrar } from "./setup/auth";
import { makeTestDb, type TestDatabase, truncateAll } from "./setup/db";

/** What each role's default matrix serves (200) and refuses (403) on a representative read route per Modulo. */
const POR_ROL: Record<PersonaTipo, { permitidas: string[]; rechazadas: string[] }> = {
  postulante: { permitidas: ["/branches", "/cv-versions", "/analytics/overview", "/followup"], rechazadas: ["/users", "/security/groups"] },
  recruiter: { permitidas: ["/branches", "/analytics/overview", "/followup"], rechazadas: ["/cv-versions"] },
  administrador: { permitidas: ["/users", "/security/groups"], rechazadas: ["/branches", "/cv-versions"] },
};

describe("Permissions by role (e2e)", () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication["getHttpServer"]>;
  let db: TestDatabase;
  let pool: ReturnType<typeof makeTestDb>["pool"];
  let tokens: Record<PersonaTipo, string>;

  beforeAll(async () => {
    ({ app, http } = await createTestApp());
    ({ db, pool } = makeTestDb());

    // The routes below only read, so one account per role serves every case and the tokens stay live.
    await truncateAll(db);

    const administrador = { email: "admin@example.com", password: DEFAULT_PASSWORD };
    await crearAdministrador(app, administrador.email, administrador.password);

    tokens = {
      postulante: (await registrar(http, { role: "postulante" })).token,
      recruiter: (await registrar(http, { role: "recruiter" })).token,
      administrador: await login(http, administrador.email, administrador.password),
    };
  });

  afterAll(async () => {
    await truncateAll(db);
    await app.close();
    await pool.end();
  });

  const get = (rol: PersonaTipo, ruta: string) => request(http).get(ruta).set("Authorization", `Bearer ${tokens[rol]}`);

  for (const [rol, { permitidas, rechazadas }] of Object.entries(POR_ROL) as [PersonaTipo, (typeof POR_ROL)[PersonaTipo]][]) {
    describe(rol, () => {
      it.each(permitidas)("GET %s is served", async (ruta) => {
        const response = await get(rol, ruta);

        expect(response.status).toBe(200);
      });

      it.each(rechazadas)("GET %s is forbidden", async (ruta) => {
        const response = await get(rol, ruta);

        expect(response.status).toBe(403);
      });
    });
  }
});
