import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  const prefix = configService.get<string>('APP_PREFIX', 'api/v1');
  app.setGlobalPrefix(prefix);

  // CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('IQX API')
    .setDescription(
      'API nền tảng phân tích chứng khoán IQX - Cung cấp công cụ phân tích chứng khoán chuyên sâu, ' +
        'biểu đồ kỹ thuật, dữ liệu tài chính và tin tức thị trường chứng khoán Việt Nam theo thời gian thực.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Xác thực', 'Đăng ký, đăng nhập, làm mới token')
    .addTag('Người dùng', 'Quản lý thông tin người dùng')
    .addTag('Thanh toán', 'Nâng cấp Premium qua SePay')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'IQX API - Tài liệu',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
    },
  });

  // Start
  const port = configService.get<number>('APP_PORT', 3001);
  await app.listen(port);

  console.log(`🚀 IQX Backend đang chạy tại: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
