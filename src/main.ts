import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from '@/app.module';
import { useConfig } from '@/utils/config.util';
import { LogLevels } from '@/utils/logger.util';

async function bootstrap() {
  const config = useConfig();

  const app = await NestFactory.create(AppModule, {
    logger: LogLevels.slice(0, config.app.logLevel),
  });

  // Swagger & OpenAPI
  const swaggerBuilder = new DocumentBuilder()
    .setTitle('Supernode server')
    .setVersion('1.0')
    .addTag('supernodes')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerBuilder);
  SwaggerModule.setup('swagger', app, document);

  await app.listen(8081);
}

bootstrap();
