import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const startTime = Date.now();
  console.log('[STARTUP] Starting Atlas Derslik API...');

  const app = await NestFactory.create(AppModule);

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

  // Global response headers
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=65');
    next();
  });

  await app.listen(process.env.PORT ?? 3001);
  console.log(`[STARTUP] API ready in ${Date.now() - startTime}ms on port ${process.env.PORT ?? 3001}`);
}
bootstrap();
