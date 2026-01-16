import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const isDevelopment = process.env.NODE_ENV !== "production";
  if (isDevelopment) {
    app.enableCors({
      origin: true,
      credentials: true,
    });
  }

  await app.listen(3000);
  console.log("🚀 Server ready at http://localhost:3000/graphql");
}

void bootstrap();
