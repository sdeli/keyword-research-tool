import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SessionUser } from '@puppeteer-utils/entities/session-user.entity';

@Entity()
export class Session {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  domain: string;

  @Column({
    nullable: true,
    type: 'json',
  })
  cookies: string;

  @Column({
    nullable: true,
    type: 'json',
  })
  session: string;

  @Column({ default: false, nullable: false, type: 'boolean' })
  inUse: boolean;

  @ManyToOne(
    type => SessionUser,
    sessionUser => sessionUser.sessions,
    { nullable: true },
  )
  @JoinColumn()
  sessionUser: SessionUser;

  @CreateDateColumn()
  createdAt: Date;
}
