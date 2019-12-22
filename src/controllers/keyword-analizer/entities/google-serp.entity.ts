import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class GoogleSerpLinks {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  link: string;

  @Column('int')
  volume: number;

  @Column('int')
  estimatedVisits: number;

  @Column('int')
  domainScore: number;

  @Column('int')
  socialShares: number;
}
