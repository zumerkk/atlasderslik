import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const route = typeof request.route?.path === 'string' ? request.route.path : undefined;

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: string | string[] = 'Sunucu hatası oluştu.';
        let error = 'Internal Server Error';
        let code: string | undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            error = STATUS_CODES[status] || error;
            const res = exception.getResponse();
            if (typeof res === 'string') {
                message = res;
            } else if (typeof res === 'object' && res !== null) {
                message = (res as any).message || message;
                error = (res as any).error || error;
                // Only intentional, bounded AtlasAI codes cross the HTTP boundary.
                const candidate = (res as any).code;
                if (typeof candidate === 'string' && /^ATLAS_[A-Z0-9_]{1,70}$/.test(candidate)) code = candidate;
            }
        } else if (exception instanceof Error) {
            // Driver/SDK messages and stacks may contain credentials or
            // personal data. Log the class and route template only.
            const name = /^[a-zA-Z0-9_]{1,60}$/.test(exception.name) ? exception.name : 'Error';
            this.logger.error(`Unexpected ${name} on ${request.method} ${route || '(unmatched route)'}`);
        }

        // Only set headers if the response hasn't been sent yet
        if (!response.headersSent) {
            response.status(status).json({
                statusCode: status,
                message,
                error,
                ...(code ? { code } : {}),
                timestamp: new Date().toISOString(),
                path: route || request.path,
            });
        }
    }
}
