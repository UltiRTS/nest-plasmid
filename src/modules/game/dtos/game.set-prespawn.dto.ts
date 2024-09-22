import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class SetPreSpawnDto {
  @IsNotEmpty({ message: 'Game name is required' })
  @IsString({ message: 'Game name must be a string' })
  gameName: string;

  @IsNotEmpty({ message: 'Unit name is required' })
  @IsString({ message: 'Unit name must be a string' })
  uname: string;

  @IsNotEmpty({ message: 'modId is required' })
  @IsNumber()
  x: number;

  @IsNotEmpty({ message: 'modId is required' })
  @IsNumber()
  y: number;

  @IsNotEmpty({ message: 'modId is required' })
  @IsString({ message: "prespawn must have a owner"})
  owner: string;
}
