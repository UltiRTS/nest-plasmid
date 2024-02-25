import { AllExceptionsFilter } from '@/common/filters/all.filter';
import { AutoHostGuard } from '@/common/guards/auth.autohost.guard';
import { UseFilters, UseGuards, applyDecorators } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { SubscribeMessage } from '@nestjs/websockets';

export function SubscribeAutohostMessage(event: string) {
  return applyDecorators(
    SubscribeMessage(event),
    UseFilters(new AllExceptionsFilter(), new BaseExceptionFilter()),
    UseGuards(AutoHostGuard),
  );
}
