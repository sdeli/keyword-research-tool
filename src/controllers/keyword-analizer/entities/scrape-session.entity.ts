import { Entity, Column, CreateDateColumn, ManyToOne, PrimaryColumn, UpdateDateColumn, ManyToMany } from 'typeorm';
import { ScrapeWorkflow } from '@scrape-workflow/entities/scrape-workflow.entity';
import { EntityRelationNames } from '@keyword-analizer/keyword-analizer.interfaces';
import { Keyword } from '@keyword-analizer/entities/keyword.entity';

@Entity()
export class ScrapeSession {
  @PrimaryColumn({
    type: 'char',
    length: 36,
  })
  id: string;

  @Column({ type: 'varchar', nullable: true })
  masterKeyword: string;

  @Column('varchar')
  path: string;

  @Column({ type: 'boolean', nullable: true })
  isSuccesful: boolean;

  @Column({ type: 'json', nullable: true })
  error: any;

  @ManyToOne(
    type => ScrapeWorkflow,
    scrapeWorkflow => scrapeWorkflow.scrapeSessions,
  )
  scrapeWorkflow: ScrapeWorkflow;

  @ManyToMany(type => Keyword)
  keywords: Keyword[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({
    nullable: false,
  })
  updateAt: Date;

  static getRelationNames(): EntityRelationNames {
    const relationNames: EntityRelationNames = {};

    const sampleScrapeWorkflow = new ScrapeWorkflow();
    const sampleKeywords = [new Keyword()];
    const scrapeSession = new ScrapeSession();

    scrapeSession.scrapeWorkflow = sampleScrapeWorkflow;
    scrapeSession.keywords = sampleKeywords;

    for (const relationsKeyName in scrapeSession) {
      if (scrapeSession.hasOwnProperty(relationsKeyName)) {
        if (scrapeSession[relationsKeyName] === sampleScrapeWorkflow) {
          relationNames[relationsKeyName] = relationsKeyName;
        } else if (scrapeSession[relationsKeyName] === sampleKeywords) {
          relationNames[relationsKeyName] = relationsKeyName;
        }
      }
    }

    return relationNames;
  }
}
