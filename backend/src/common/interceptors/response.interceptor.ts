// NOTE: Wraps successful responses in the standard API envelope.
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { STATUS_CODES } from 'http';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  statusText: string;
  timestamp: string;
  path: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode: response.statusCode,
        statusText: STATUS_CODES[response.statusCode] ?? 'OK',
        timestamp: new Date().toISOString(),
        path: request.url,
        data,
      })),
    );
  }
}
