import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne } from 'typeorm';
import { SessionUser } from '@puppeteer-utils/entities/session-user.entity';

@Entity()
export class Session {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true,
    type: 'simple-json',
  })
  cookies: string;

  @Column({
    nullable: true,
    type: 'simple-json',
  })
  session: string;

  @ManyToOne(
    () => SessionUser,
    sessionUser => sessionUser.id,
    { nullable: false },
  )
  sessionUser: SessionUser;

  @CreateDateColumn()
  createdAt: Date;
}
