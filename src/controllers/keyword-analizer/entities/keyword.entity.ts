import { GoogleSerpLinks } from './google-serp.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToMany,
  UpdateDateColumn,
  JoinTable,
} from 'typeorm';
import { ScrapeSession } from '@keyword-analizer/entities/scrape-session.entity';
import { EntityRelationNames } from '@keyword-analizer/keyword-analizer.interfaces';

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

  @ManyToMany(
    type => ScrapeSession,
    scrapeSession => scrapeSession.keywords,
    {
      eager: true,
    },
  )
  @JoinTable()
  scrapeSessions: ScrapeSession[];

  @Column({
    default: false,
    nullable: true,
  })
  inProcess: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  error: any;

  @UpdateDateColumn({
    nullable: false,
  })
  updateAt: Date;

  static getRelationNames(): EntityRelationNames {
    const relationNames: EntityRelationNames = {};

    const sampleScrapeSession = new ScrapeSession();
    const keyw = new Keyword();

    keyw.scrapeSessions = [sampleScrapeSession];

    for (const relationsKeyName in keyw) {
      if (keyw.hasOwnProperty(relationsKeyName)) {
        if (keyw[relationsKeyName] === sampleScrapeSession) {
          relationNames[relationsKeyName] = relationsKeyName;
        }
      }
    }

    return relationNames;
  }
}
