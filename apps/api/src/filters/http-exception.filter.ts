import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: string | string[] = 'Sunucu hatası oluştu.';
        let error = 'Internal Server Error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();
            if (typeof res === 'string') {
                message = res;
            } else if (typeof res === 'object' && res !== null) {
                message = (res as any).message || message;
                error = (res as any).error || error;
            }
        } else if (exception instanceof Error) {
            message = exception.message;
            // Log unexpected errors
            this.logger.error(
                `Unexpected error on ${request.method} ${request.url}: ${exception.message}`,
                exception.stack,
            );
        }

        // Only set headers if the response hasn't been sent yet
        if (!response.headersSent) {
            response.status(status).json({
                statusCode: status,
                message,
                error,
                timestamp: new Date().toISOString(),
                path: request.url,
            });
        }
    }
}
