import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class SetMapDto {
  @IsNotEmpty({ message: 'Game name is required' })
  @IsString({ message: 'Game name must be a string' })
  gameName: string;

  @IsNotEmpty({ message: 'mapId is required' })
  @IsNumber()
  mapId: number;
}
