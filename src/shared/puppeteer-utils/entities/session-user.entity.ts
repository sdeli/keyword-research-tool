import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { Session } from '@puppeteer-utils/entities/session.entity';

@Entity()
export class SessionUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  email: string;

  @OneToMany(
    type => Session,
    session => session.sessionUser,
  )
  sessions: Session;

  @CreateDateColumn()
  createdAt: Date;
}
