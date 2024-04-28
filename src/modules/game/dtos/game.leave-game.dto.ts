import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class LeaveGameDto {
  @IsNotEmpty({ message: 'Game name is required' })
  @IsString({ message: 'Game name must be a string' })
  gameName: string;
}