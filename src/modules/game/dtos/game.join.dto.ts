import { Injectable } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class JoinGameDto {
  @IsNotEmpty({ message: 'Game name is required' })
  @IsString({ message: 'Game name must be a string' })
  gameName: string;

  @IsOptional()
  @IsString({ message: 'Game config must be a string' })
  password: string | null;

  @IsNotEmpty({ message: 'Map ID is required' })
  @IsString({ message: 'Map ID must be a number' })
  mapId: string;
}
