import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const startTime = Date.now();
  console.log('[STARTUP] Starting Atlas Derslik API...');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'], // reduce verbose startup logs
  });
  console.log(`[STARTUP] NestFactory.create done in ${Date.now() - startTime}ms`);

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

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

  // Global response headers — per-request timing
  app.use((_req: any, res: any, next: any) => {
    const reqStart = Date.now();
    res.on('finish', () => {
      res.setHeader('X-Response-Time', `${Date.now() - reqStart}ms`);
    });
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=65');
    next();
  });

  await app.listen(process.env.PORT ?? 3001);
  console.log(`[STARTUP] API ready in ${Date.now() - startTime}ms on port ${process.env.PORT ?? 3001}`);
}
bootstrap();
