import { IsNotEmpty, IsString } from 'class-validator';

export class SetTeamDto {
  @IsNotEmpty({ message: 'Game name is required' })
  @IsString({ message: 'Game name must be a string' })
  gameName: string;

  @IsNotEmpty({ message: 'Team is required' })
  @IsString({ message: 'team must be a string' })
  team: string;

  @IsNotEmpty({ message: 'Player name is required' })
  @IsString({ message: 'Player name must be a string' })
  player: string;
}
