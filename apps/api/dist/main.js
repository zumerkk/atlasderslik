"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const startTime = Date.now();
    console.log('[STARTUP] Starting Atlas Derslik API...');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({ transform: true }));
    const corsOrigins = process.env.CORS_ORIGIN?.split(',') || [
        'http://localhost:3000',
        'https://atlasderslik.com',
        'https://www.atlasderslik.com',
    ];
    app.enableCors({
        origin: corsOrigins,
        credentials: true,
    });
    app.use((_req, res, next) => {
        res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Keep-Alive', 'timeout=65');
        next();
    });
    await app.listen(process.env.PORT ?? 3001);
    console.log(`[STARTUP] API ready in ${Date.now() - startTime}ms on port ${process.env.PORT ?? 3001}`);
}
bootstrap();
//# sourceMappingURL=main.js.map