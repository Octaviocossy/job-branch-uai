import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import type { Env } from "./config/env.validation";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<Env, true>);

  app.enableCors({
    origin: configService.get("CORS_ORIGIN", { infer: true }),
    credentials: true,
  });

  await app.listen(configService.get("PORT", { infer: true }));
}

bootstrap();
