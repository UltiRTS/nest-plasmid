import { Module } from '@nestjs/common';

import { HealthModule } from '@/modules/health/health.module';
import { BusinessModule } from '@/modules/business/business.module';
import { DatabaseModule } from '@/modules/database/database.module';
import { UserModule } from '@/modules/user/user.module';

@Module({
  imports: [DatabaseModule, UserModule, HealthModule, BusinessModule],
})
export class AppModule {}
