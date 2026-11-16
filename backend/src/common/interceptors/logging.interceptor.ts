import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = req;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const statusCode = res?.statusCode || 200;
          const delay = Date.now() - now;
          this.logger.log(`${method} ${url} ${statusCode} - ${delay}ms [${ip}]`);
        },
        error: (err) => {
          const delay = Date.now() - now;
          const statusCode = err?.status || err?.statusCode || 500;
          this.logger.warn(`${method} ${url} ${statusCode} - ${delay}ms [${ip}] - ${err.message}`);
        },
      }),
    );
  }
}
