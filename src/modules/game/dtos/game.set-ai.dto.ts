import { IsNotEmpty, IsString } from 'class-validator';

export class SetAiDto {
  @IsString({ message: 'gameName must be a string' })
  @IsNotEmpty({ message: 'gameName cannot be empty' })
  gameName: string;

  @IsString({ message: 'aiId must be a string' })
  @IsNotEmpty({ message: 'aiId cannot be empty' })
  ai: string;

  @IsString({ message: 'caller must be a string' })
  @IsNotEmpty({ message: 'caller cannot be empty' })
  type: string;

  @IsString({ message: 'team must be a string' })
  @IsNotEmpty({ message: 'team cannot be empty' })
  team: string;
}
