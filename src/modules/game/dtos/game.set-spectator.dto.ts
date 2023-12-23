import { IsNotEmpty, IsString } from 'class-validator';

export class SetSepctatorDto {
  @IsString()
  @IsNotEmpty()
  gameName: string;

  @IsString()
  @IsNotEmpty()
  player: string;
}
