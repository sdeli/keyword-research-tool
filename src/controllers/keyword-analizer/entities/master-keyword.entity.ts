import { Keyword } from './keyword.entity';
import { Entity, Column, PrimaryGeneratedColumn, JoinTable, ManyToMany, CreateDateColumn } from 'typeorm';

@Entity()
export class MasterKeyword {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  keyword: string;

  @ManyToMany(() => Keyword, {
    cascade: true,
  })
  @JoinTable()
  relatedKeywords: Keyword[];

  @CreateDateColumn()
  createdAt: Date;
}
