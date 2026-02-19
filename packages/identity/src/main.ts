import { NestFactory } from '@nestjs/core';
import { IdentityModule } from './app/identity.module';
import { GlobalExceptionFilter, env } from '@project/core';
import { Logger } from '@nestjs/common';

async function createServer() {
  const app = await NestFactory.create(IdentityModule);

  app.enableCors({
    origin:
      env.NODE_ENV === 'development' ? '*' : ['https://next-audiology-files.vercel.app/login'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.init();
  return app;
}

export const handler = async (req: any, res: any) => {
  const app = await createServer();
  const instance = app.getHttpAdapter().getInstance();
  return instance(req, res);
};

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  async function bootstrap() {
    const app = await createServer();
    const port = env.PORT || 3000;
    await app.listen(port);
    Logger.log(`🚀 Identity Service local on http://localhost:${port}`, 'Bootstrap');
  }
  bootstrap();
}

export default createServer;
