import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const startTime = Date.now();
  console.log('[STARTUP] Starting Atlas Derslik API...');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'], // reduce verbose startup logs
  });
  
  // Increase body size limit for base64 image uploads
  app.useBodyParser('json', { limit: '50mb' });
  app.useBodyParser('urlencoded', { limit: '50mb' });
  
  console.log(`[STARTUP] NestFactory.create done in ${Date.now() - startTime}ms`);

  // Security headers
  app.use(helmet());

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: false, // allow extra fields for flexible DTOs
  }));

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // CORS — support www and non-www
  const corsOrigins = process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:3000',
    'https://atlasderslik.com',
    'https://www.atlasderslik.com',
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global response headers — keep-alive
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=65');
    next();
  });

  await app.listen(process.env.PORT ?? 3001);
  console.log(`[STARTUP] API ready in ${Date.now() - startTime}ms on port ${process.env.PORT ?? 3001}`);
}
bootstrap();

