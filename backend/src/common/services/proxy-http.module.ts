import { Global, Module } from '@nestjs/common';
import { ProxyHttpService } from './proxy-http.service';

@Global()
@Module({
  providers: [ProxyHttpService],
  exports: [ProxyHttpService],
})
export class ProxyHttpModule {}
