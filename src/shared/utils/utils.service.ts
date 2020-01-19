import * as fs from 'fs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ScrapeSession } from '@keyword-analizer/entities/scrape-session.entity';
import { SaveScrapeSessionParamsI } from '@keyword-analizer/keyword-analizer.interfaces';
import { ParsedProcessArgsT } from '@shared/shared.types';

@Injectable()
export class UtilsService {
  constructor(@InjectRepository(ScrapeSession) private readonly scrapeSessionRepo: Repository<ScrapeSession>) {}

  waitBetween(min: number = 3000, max: number = 6000): Promise<void> {
    const timeToWait = Math.floor(Math.random() * (max - min) + min);
    return new Promise(resolve => {
      setTimeout(() => {
        console.log('waited: ' + timeToWait);
        resolve();
      }, timeToWait);
    });
  }

  wait(delay: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        console.log('waited: ' + delay);
        resolve();
      }, delay);
    });
  }

  getNumberBetween(max: number, min: number) {
    return Math.floor(Math.random() * (max - min) + min);
  }

  async saveIntoFile(filePath: string, content: string, contentName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, content, err => {
        if (err) {
          console.log(`${contentName} file could not be written.`, err);
          return reject(err);
        }

        resolve();
        console.log(`${contentName} has been successfully saved`);
      });
    });
  }

  async waitToDownloadFile(folderAbsPath: string, fileNameToWaitFor: string) {
    console.log(`download folders absolut path: ${folderAbsPath}`);
    console.log(`files name to wait for: ${fileNameToWaitFor}`);
    return new Promise((resolve, reject) => {
      const watcher = fs.watch(folderAbsPath);

      watcher.on('change', (eventType, currFilesName) => {
        console.log(fileNameToWaitFor);
        console.log(`to the file has happened something: ${currFilesName}`);
        const isDownloadFile = currFilesName === fileNameToWaitFor;
        console.log(`is the file downloaded: ${isDownloadFile}`);
        if (isDownloadFile) {
          watcher.close();
          return resolve();
        }
      });

      watcher.on('error', error => {
        console.log(error);
        watcher.close();
        reject();
      });
    });
  }

  deleteFileSync(downloadedFilePath: string) {
    try {
      fs.unlinkSync(downloadedFilePath);
    } catch (err) {
      console.error(err);
    }
  }

  saveScrapeSession(scrapeSessionParams: SaveScrapeSessionParamsI): Promise<ScrapeSession> {
    const { scrapeSessionId, keyword, path, err } = scrapeSessionParams;
    let errorJson = null;

    if (err) {
      errorJson = JSON.stringify({ name: err.name, msg: err.message, stack: err.stack }, null, 2);
    }
    const scrapeSession = new ScrapeSession();

    scrapeSession.id = scrapeSessionId;
    scrapeSession.masterKeyword = keyword;
    scrapeSession.isSuccesful = !err;
    scrapeSession.error = errorJson;
    scrapeSession.path = path;

    return this.scrapeSessionRepo.save(scrapeSession);
  }

  getParsedProcessArgs(): ParsedProcessArgsT {
    const args: ParsedProcessArgsT = {};
    args.noName = [];

    process.argv.forEach(currArg => {
      const isArgWithName = currArg.indexOf('=') > -1;

      if (isArgWithName) {
        const [key, value] = currArg.split('=');
        args[key] = value;
      } else {
        args.noName.push(currArg);
      }
    });

    return args;
  }
}
