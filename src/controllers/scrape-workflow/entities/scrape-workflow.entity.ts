import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { ScrapeSession } from '@keyword-analizer/entities/scrape-session.entity';

@Entity()
export class ScrapeWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @Column('varchar')
  path: string;

  @Column({ type: 'boolean', nullable: true })
  isSuccesful: boolean;

  @Column({ type: 'json', nullable: true })
  error: string;

  @OneToMany(
    type => ScrapeSession,
    scrapeSession => scrapeSession.id,
    { cascade: true },
  )
  scrapeSessions: ScrapeSession[];

  @CreateDateColumn()
  createdAt: Date;
}
