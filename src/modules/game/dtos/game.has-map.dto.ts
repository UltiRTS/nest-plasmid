import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class HasMapDto {
  @IsNotEmpty({ message: 'Game name is required' })
  @IsString({ message: 'Game name must be a string' })
  gameName: string;

  @IsNotEmpty({ message: 'mapId is required' })
  @IsNumber()
  mapId: number;
}
