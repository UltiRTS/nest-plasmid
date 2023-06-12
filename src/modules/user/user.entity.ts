import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

import { Confirmation } from '@/modules/confirmation/confirmation.entity';
import { Chat } from '@/modules/chat/chat.entity';
import { Adventure } from '@/modules/adventure/adventure.entity';

// import c from "crypto"

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { unique: true })
  username: string;

  @Column()
  @Exclude()
  hash: string;

  @Column()
  @Exclude()
  salt: string;

  @Column('int', { default: 0 })
  accessLevel: number;

  @Column('int', { default: 0 })
  exp: number;

  @Column('boolean', { default: false })
  @Exclude()
  blocked: boolean;

  @Column('int', { default: 0 })
  winCount: number;

  @Column('int', { default: 0 })
  loseCount: number;

  @OneToMany(() => Confirmation, (confirmation) => confirmation.user)
  confirmations: Confirmation[];

  @OneToMany(() => Chat, (chat) => chat.author)
  chats: Chat[];

  @ManyToMany(() => Adventure)
  @JoinTable()
  adventures: Adventure[];

  @ManyToMany(() => User, (user) => user.id)
  @JoinTable()
  friends: User[];

  @OneToMany(() => Mark, (mark) => mark.user)
  marks: Mark[];

  @OneToMany(() => Mark, (mark) => mark.target)
  reverseMarks: Mark[];

  @OneToMany(() => InventoryItem, (inventory) => inventory.user)
  inventory: InventoryItem[];
}

@Entity()
export class Mark {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  mark: string;

  @ManyToOne(() => User, (user) => user.marks)
  user: User;

  @ManyToOne(() => User, (user) => user.reverseMarks)
  target: User;
}

@Entity()
export class InventoryItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // name of the item

  @Column('int', { default: 0 })
  qty: number; // quantity of the item

  @Column({ default: 'consumable' })
  type: string; // type of the item

  @Column({ default: 'global' })
  scope: string; // scope of the item

  @Column({ default: '' })
  alias: string; // alias of the item

  @Column()
  description: string; // description of the item

  @ManyToOne(() => User, (user) => user.inventory)
  user: User;
}
