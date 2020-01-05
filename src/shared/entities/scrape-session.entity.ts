import { Entity, Column, CreateDateColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Workflow } from '@shared/entities/workflow.entity';

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
    type => Workflow,
    workflow => workflow.scrapeSessions,
  )
  workflow: Workflow;

  @CreateDateColumn()
  createdAt: Date;
}
