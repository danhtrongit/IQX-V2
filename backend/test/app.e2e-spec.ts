import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('IQX Backend (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/docs (GET) should serve Swagger UI', () => {
    return request(app.getHttpServer()).get('/docs').expect(200);
  });

  it('/api/v1/listing/symbols (GET) should require auth or return data', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/listing/symbols')
      .expect((res) => {
        // Either 200 (public) or 401 (requires auth) is acceptable
        expect([200, 401]).toContain(res.status);
      });
    return response;
  });
});
