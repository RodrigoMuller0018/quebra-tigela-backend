import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './all-exceptions.filter';

async function bootstrap() {
  // Desabilita o body-parser default (limite 100KB) — abaixo configuro com limite maior
  // pra suportar foto de perfil em base64 (até ~500KB).
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // CORS — em dev (sem FRONTEND_URLS setado) libera tudo pra facilitar o
  // localhost; em prod restringe à lista vinda da env var
  // (ex: "https://meu-app.vercel.app,https://meu-app-git-main.vercel.app").
  const origensPermitidas = process.env.FRONTEND_URLS
    ? process.env.FRONTEND_URLS.split(',').map((u) => u.trim())
    : true;
  app.enableCors({
    origin: origensPermitidas,
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
