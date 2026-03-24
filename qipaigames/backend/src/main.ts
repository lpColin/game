import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启用CORS
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });

  await app.listen(4000);
  console.log('AI Game Backend running on http://localhost:4000');
}

bootstrap();