import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  game_config: string;

  @Column()
  team_win: number;

  @Column('datetime', { default: () => 'CURRENT_TIMESTAMP' })
  start_time: Date;

  @Column('datetime', { default: () => 'CURRENT_TIMESTAMP' })
  end_time: Date;
}
