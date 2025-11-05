import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cors from 'cors';
//import * as moment from 'moment-timezone';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.use(cors());
  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  const date = new Date()//moment().tz('America/Santiago').format('HH:mm:ss');
  // eslint-disable-next-line no-console
  console.log(`🚀 API up on http://localhost:${port}  at ${date}`);
}
bootstrap();
