import { IsNotEmpty, IsString } from 'class-validator';

export class SetModDto {
  @IsNotEmpty({ message: 'Game name is required' })
  @IsString({ message: 'Game name must be a string' })
  gameName: string;

  @IsNotEmpty({ message: 'modId is required' })
  @IsString({ message: 'modId must be a string' })
  modId: string;
}
