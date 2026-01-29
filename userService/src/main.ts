import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService<Env, true>);
  const port = configService.get<number>('PORT', { infer: true });
  const clientOrigin = configService.get<string | undefined>('WEB_BASE_URL', {
    infer: true,
  });

  app.use(cookieParser());
  app.use(helmet());
  app.enableShutdownHooks();
  app.enableCors({ origin: clientOrigin ?? true, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(port ?? 3000);
}

bootstrap();
