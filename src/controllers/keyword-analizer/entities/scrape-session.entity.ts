import { Entity, Column, CreateDateColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ScrapeWorkflow } from '@scrape-workflow/entities/scrape-workflow.entity';

@Entity()
export class ScrapeSession {
  @PrimaryColumn({
    type: 'char',
    length: 36,
  })
  id: string;

  @Column('varchar')
  keyword: string;

  @Column('varchar')
  path: string;

  @Column('boolean')
  isSuccesful: boolean;

  @Column({ type: 'json', nullable: true })
  error: string;

  @ManyToOne(
    type => ScrapeWorkflow,
    scrapeWorkflow => scrapeWorkflow.scrapeSessions,
  )
  scrapeWorkflow: ScrapeWorkflow;

  @CreateDateColumn()
  createdAt: Date;
}
