import { Injectable } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class JoinGameDto {
  @IsNotEmpty({ message: 'Game name is required' })
  @IsString({ message: 'Game name must be a string' })
  gameName: string;

  @IsOptional()
  @IsString({ message: 'Game config must be a string' })
  password: string | null;

  @IsNotEmpty({ message: 'Client ID is required' })
  @IsString({ message: 'Client ID must be a string' })
  caller: string;

  @IsNotEmpty({ message: 'Map ID is required' })
  @IsNumber({}, { message: 'Map ID must be a number' })
  mapId: number;
}
