import { TypeOrmModule } from '@nestjs/typeorm';
import { useConfig } from '@/utils/config.util';

const config = useConfig();

// @ts-expect-error: TypeOrm not support dynamic database type
export const DatabaseModule = TypeOrmModule.forRoot({
  type: config.dataSource.type,
  host: config.dataSource.host,
  port: config.dataSource.port,
  username: config.dataSource.username,
  password: config.dataSource.password,
  database: config.dataSource.database,
  autoLoadEntities: true,
  synchronize: true,
  logging: true,
});
