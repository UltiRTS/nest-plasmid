import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '@/modules/user/user.entity';

@Entity()
export class Adventure {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  config: string;

  @Column('datetime', { default: () => 'CURRENT_TIMESTAMP' })
  createAt: Date;

  @Column('boolean', { default: false })
  closed: boolean;

  @ManyToMany(() => User)
  @JoinTable()
  members: User[];
}
