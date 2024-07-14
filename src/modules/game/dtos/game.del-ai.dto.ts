import { IsNotEmpty, IsString } from 'class-validator';

export class DelAiDto {
  @IsString({ message: 'gameName must be a string' })
  @IsNotEmpty({ message: 'gameName cannot be empty' })
  gameName: string;

  @IsString({ message: 'aiId must be a string' })
  @IsNotEmpty({ message: 'aiId cannot be empty' })
  ai: string;
}
