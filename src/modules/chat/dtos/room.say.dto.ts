import { IsString, IsNotEmpty } from 'class-validator';

export class RoomSayDto {
  @IsString({ message: '`chatName` must be a string' })
  @IsNotEmpty({ message: '`chatName` cannot be empty' })
  chatName: string;

  @IsString({ message: '`message` must be a string' })
  @IsNotEmpty({ message: '`message` cannot be empty' })
  message?: string;
}
