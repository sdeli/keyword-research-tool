import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { ScrapeSession } from '@shared/entities/scrape-session.entity';

@Entity()
export class Workflow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  link: string;

  @OneToMany(
    type => ScrapeSession,
    scrapeSession => scrapeSession.workflow,
    { cascade: true },
  )
  scrapeSessions: ScrapeSession[];

  @CreateDateColumn()
  createdAt: Date;
}
