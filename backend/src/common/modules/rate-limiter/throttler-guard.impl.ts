import { Injectable, ExecutionContext } from '@nestjs/common';
import {
  ThrottlerGuard as NestThrottlerGuard,
  ThrottlerException,
  ThrottlerLimitDetail,
} from '@nestjs/throttler';

@Injectable()
export class ThrottlerGuardImpl extends NestThrottlerGuard {
  protected async throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new ThrottlerException(
      `Quá nhiều yêu cầu. Giới hạn 100 requests/phút cho mỗi user. Vui lòng thử lại sau.`,
    );
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const user = req.user;
    if (user?.sub) {
      return `user:${user.sub}`;
    }
    return `ip:${req.ip}`;
  }
}
