import { IsNotEmpty, IsString } from 'class-validator';

export class KillEngineDto {
  @IsNotEmpty({ message: 'Game name is required' })
  @IsString({ message: 'Game name must be a string' })
  gameName: string;
}