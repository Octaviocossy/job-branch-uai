import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { Env } from "../config/env.validation";
import { DRIZZLE } from "./database.constants";
import * as schema from "./schema/index";

export type Database = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => {
        const pool = new Pool({
          connectionString: configService.get("DATABASE_URL", {
            infer: true,
          }),
        });

        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
