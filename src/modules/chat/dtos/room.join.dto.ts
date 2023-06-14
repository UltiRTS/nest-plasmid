import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class RoomJoinDto {
  @IsString({ message: '`chatName` must be a string' })
  @IsNotEmpty({ message: '`chatName` cannot be empty' })
  chatName: string;

  @IsString({ message: '`password` must be a string' })
  @IsOptional()
  password?: string;
}
