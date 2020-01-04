import { GoogleSerpLinks } from './google-serp.entity';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToMany, ManyToOne } from 'typeorm';
import { ScrapeSession } from '@shared/entities/scrape-session.entity';

@Entity()
export class Keyword {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  keyword: string;

  @Column('int')
  searchvolume: number;

  @Column('int')
  searchDifficulty: number;

  @Column('int')
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
