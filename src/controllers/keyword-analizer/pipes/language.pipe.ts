import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { supportedLanguages } from '@keyword-analizer/keyword-analizer.types';

@Injectable()
export class LanguagePipe implements PipeTransform {
  transform(language: string, metadata: ArgumentMetadata): string {
    const isRequestedLangSupported = supportedLanguages[language];
    if (!isRequestedLangSupported) {
      console.log(`not supported language ${language}`);
      throw new BadRequestException('Validation failed');
    }

    return language;
  }
}
