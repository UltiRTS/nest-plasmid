import { Process, Processor } from '@nestjs/bull';
import { LoggerProvider } from '@/utils/logger.util';
import { Job } from 'bull';
import { ClientsService } from '../../clients/clients.service';

type SendJob = Job<{
  recipient: string;
  message: any;
}>;

type BroacastJob = Job<{
  recipients: string[];
  message: any;
}>;

@Processor('messages')
export class MessageConsumer extends LoggerProvider {
  constructor(private readonly clientsDirectory: ClientsService) {
    super();
    this.logger.log('Message Queue started');
  }
  @Process('send')
  handleSend(job: SendJob) {
    const { recipient, message } = job.data;
    this.logger.debug(`Sending message to ${recipient}`);
    const client = this.clientsDirectory.get(recipient);
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    client.send(msg);
  }

  @Process('broadcast')
  handleBroadcast(job: BroacastJob) {
    const { recipients, message } = job.data;
    this.logger.debug(`Broadcasting message to ${recipients}`);
    const clients = this.clientsDirectory.get(recipients);
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    clients.forEach((c) => c.send(msg));
  }
}
