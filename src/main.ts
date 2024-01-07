import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from '@/app.module';
import { useConfig } from '@/utils/config.util';
import { LogLevels } from '@/utils/logger.util';

import { WebsocketAdapter } from '@/modules/websocket/websocket.adapter';

async function bootstrap() {
  const config = useConfig();

  const app = await NestFactory.create(AppModule, {
    logger: LogLevels.slice(0, config.app.logLevel),
  });

  // Swagger & OpenAPI
  const swaggerBuilder = new DocumentBuilder()
    .setTitle('Plasmid')
    .setVersion('1.0')
    .addTag('Plasmid')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerBuilder);
  SwaggerModule.setup('swagger', app, document);

  // Websocket
  app.useWebSocketAdapter(new WebsocketAdapter(app));
  console.log('Starting server on: ' + config.app.port);
  await app.listen(config.app.port);
}

bootstrap();
