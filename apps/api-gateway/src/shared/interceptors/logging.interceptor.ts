import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();
    const { method, url, ip } = request;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;
        const deviceId = request.device?.deviceId || null;

        this.logger.log(
          JSON.stringify({
            method,
            path: url,
            statusCode,
            duration,
            deviceId,
            ip,
            timestamp: new Date().toISOString(),
          }),
        );
      }),
    );
  }
}
