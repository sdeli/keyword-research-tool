import { Injectable } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class UtilsService {
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
}
