import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Required for Better Auth
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips properties not defined in the DTO
      transform: true, // Automatically transforms payload to DTO types
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
