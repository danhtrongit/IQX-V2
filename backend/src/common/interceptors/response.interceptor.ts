import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { MESSAGES } from '../constants/messages.constant';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        const result = data as any;
        const message = result?.message || MESSAGES.COMMON.SUCCESS;
        const responseData = result?.data !== undefined ? result.data : data;

        const wrapped: any = {
          success: true,
          statusCode,
          message,
          data: responseData,
          timestamp: new Date().toISOString(),
        };

        if (result?.pagination) {
          wrapped.pagination = result.pagination;
        }

        return wrapped;
      }),
    );
  }
}
