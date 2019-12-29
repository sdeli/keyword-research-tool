// tslint:disable-next-line:no-implicit-dependencies
import Faker from 'faker';
// tslint:disable-next-line:no-implicit-dependencies
import { define } from 'typeorm-seeding';
import { SessionUser } from '@puppeteer-utils/entities/session-user.entity';

interface Settings {
  email: string;
}

define(SessionUser, (faker: typeof Faker, sessionUserSettings?: Settings) => {
  const sessionUser = new SessionUser();
  sessionUser.email = sessionUserSettings.email;
  return sessionUser;
});
