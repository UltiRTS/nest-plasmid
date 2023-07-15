import { IsNotEmpty, IsString } from 'class-validator';

export class FriendMarkDto {
  @IsString({ message: '`name` must be a string' })
  @IsNotEmpty({ message: '`name` cannot be empty' })
  name: string;

  @IsString({ message: '`text` must be a string' })
  @IsNotEmpty({ message: '`text` cannot be empty' })
  text: string;
}
