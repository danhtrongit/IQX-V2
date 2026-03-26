import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { Public } from '../../decorators/public.decorator';

@ApiTags('Monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private metricsService: MetricsService) {}

  @Get('metrics')
  @Public()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy tất cả metrics về cache và API performance' })
  getAllMetrics() {
    return {
      success: true,
      data: this.metricsService.getAllMetrics(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics/cache')
  @Public()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy cache metrics chi tiết' })
  getCacheMetrics() {
    return {
      success: true,
      data: this.metricsService.getCacheMetrics(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics/api')
  @Public()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy API performance metrics' })
  getApiMetrics() {
    return {
      success: true,
      data: this.metricsService.getApiMetrics(),
      timestamp: new Date().toISOString(),
    };
  }
}
