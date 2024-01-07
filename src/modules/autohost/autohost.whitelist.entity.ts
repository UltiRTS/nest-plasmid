import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class AutoHostWhitelist {
  @PrimaryColumn()
  id: number;

  @Column()
  ip: string;
}
