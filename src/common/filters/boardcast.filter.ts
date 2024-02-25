import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Injectable,
} from '@nestjs/common';
import { BroadcastException } from '../exceptions/base.exception';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { ClientsService } from '@/modules/clients/clients.service';

@Catch(BroadcastException)
@Injectable()
export class BroadcastExceptionsFilter
  extends BaseWsExceptionFilter
  implements ExceptionFilter<BroadcastException>
{
  constructor(private readonly clientService: ClientsService) {
    super();
  }
  catch(exception: BroadcastException, _host: ArgumentsHost) {
    console.log('catching broadcast excption');
    this.clientService.broadcast(exception.recipients, exception.message);
  }
}
