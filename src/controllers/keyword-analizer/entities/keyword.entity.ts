import { GoogleSerpLinks } from './google-serp.entity';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToMany, JoinTable } from 'typeorm';

@Entity()
export class Keyword {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  keyword: string;

  @Column('int')
  volume: number;

  @Column('int')
  siteDifficulty: number;

  @ManyToMany(() => Keyword, {
    cascade: true,
  })
  @JoinTable()
  relatedKeywords: GoogleSerpLinks[];

  @CreateDateColumn()
  createdAt: Date;
}
