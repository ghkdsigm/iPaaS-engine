import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/errors/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = Number(process.env.PORT || 3001);
  await app.listen(port, "0.0.0.0");

  // eslint-disable-next-line no-console
  console.log(`[orchestrator] listening on :${port}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[orchestrator] bootstrap failed:", err);
  process.exit(1);
});
