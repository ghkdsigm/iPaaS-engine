import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/errors/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger (optional): exposed at /api/docs
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SwaggerModule, DocumentBuilder } = require("@nestjs/swagger");
    const cfg = new DocumentBuilder()
      .setTitle("Company Automation Orchestrator")
      .setDescription("Natural-language automation orchestration API")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();
    const doc = SwaggerModule.createDocument(app, cfg);
    SwaggerModule.setup("api/docs", app, doc);
  } catch {
    // If swagger deps are not installed, skip.
  }

  const port = Number(process.env.PORT || 3000);
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`[orchestrator] listening on :${port}`);
}

bootstrap();
