import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { MessageConsumer } from './consumers/messages.consumer.js';
import { ClientsModule } from '../clients/clients.module';

@Module({
  imports: [
    ClientsModule
  ],
  providers: [MessageConsumer],
})
export class BroadcastModule {}