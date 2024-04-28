import { IsString, IsNotEmpty } from 'class-validator';

export class MidJoinDto {
  @IsString()
  @IsNotEmpty({ message: 'Game name is required' })
  public gameName: string;
}
