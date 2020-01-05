import { GoogleSerpLinks } from './google-serp.entity';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToMany, ManyToOne } from 'typeorm';
import { ScrapeSession } from '@keyword-analizer/entities/scrape-session.entity';

@Entity()
export class Keyword {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  keyword: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  searchVolume: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  searchDifficulty: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  payedDifficulty: number;

  @ManyToMany(() => Keyword, {
    cascade: true,
  })
  googleSerpLinks: GoogleSerpLinks[];

  @ManyToOne(
    type => ScrapeSession,
    scrapeSession => scrapeSession.id,
  )
  scrapeSession: ScrapeSession;

  @CreateDateColumn()
  createdAt: Date;
}
