import { IsString, IsNotEmpty } from 'class-validator';

export class RoomLeaveDto {
  @IsString({ message: '`chatName` must be a string' })
  @IsNotEmpty({ message: '`chatName` cannot be empty' })
  chatName: string;
}
