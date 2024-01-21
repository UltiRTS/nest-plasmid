import { IsString } from 'class-validator';

export class StartGameDto {
  @IsString()
  public gameName: string;
}
