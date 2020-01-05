import * as fs from 'fs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ScrapeSession } from '@keyword-analizer/entities/scrape-session.entity';
import { SaveScrapeSessionParamsI } from '@keyword-analizer/keyword-analizer.interfaces';

@Injectable()
export class UtilsService {
  constructor(@InjectRepository(ScrapeSession) private readonly scrapeSessionRepo: Repository<ScrapeSession>) {}

  waitBetween(min: number = 3000, max: number = 6000): Promise<void> {
    const timeToWait = Math.floor(Math.random() * (max - min) + min);
    console.log(timeToWait);
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
    console.log(folderAbsPath);
    console.log(fileNameToWaitFor);
    return new Promise((resolve, reject) => {
      const watcher = fs.watch(folderAbsPath);

      watcher.on('change', (eventType, currFilesName) => {
        console.log(fileNameToWaitFor);
        console.log(currFilesName);
        const isDownloadFile = currFilesName === fileNameToWaitFor;
        console.log(isDownloadFile);
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

  async saveScrapeSession(scrapeSessionParams: SaveScrapeSessionParamsI) {
    const { scrapeSessionId, keyword, path, err } = scrapeSessionParams;
    let errorJson = null;

    if (err) {
      errorJson = JSON.stringify({ name: err.name, msg: err.message, stack: err.stack }, null, 2);
    }
    const scrapeSession = new ScrapeSession();

    scrapeSession.id = scrapeSessionId;
    scrapeSession.keyword = keyword;
    scrapeSession.isSuccesful = !err;
    scrapeSession.error = errorJson;
    scrapeSession.path = path;

    await this.scrapeSessionRepo.save(scrapeSession);
  }
}
