import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '@/modules/user/user.entity';

@Entity()
export class Confirmation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  text: string;

  @Column()
  type: string;

  @Column()
  payload: string;

  @Column()
  claimed: boolean;

  @ManyToOne(() => User, (user) => user.confirmations)
  user: User;
}
