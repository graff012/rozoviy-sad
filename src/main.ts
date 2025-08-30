import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: ['https://rozoviysad.vercel.app', 'https://rozoviysad.duckdns.org'],
    credentials: true,
    optionsSuccessStatus: 200,
  });

  // Ensure images directory exists
  const staticPath = join(__dirname, '..', 'public');
  const imagesPath = join(staticPath, 'images');

  if (!existsSync(imagesPath)) {
    try {
      mkdirSync(imagesPath, { recursive: true });
    } catch (error) {
      console.error(error);
    }
  }

  // Serve static files before setting global prefix
  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '',
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
}

bootstrap();
