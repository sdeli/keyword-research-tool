import { UtilsService } from '@utils/utils/utils.service';
import { Injectable, Inject } from '@nestjs/common';
import { Page } from 'puppeteer';
import { UTILS_CONFIG_TOKEN } from '@utils/utils.types';
import { UtilsConfigI } from '@utils/utils.interfaces';

@Injectable()
export class PreparePageForDetection {
  constructor(
    @Inject(UTILS_CONFIG_TOKEN) private readonly config: UtilsConfigI,
    private readonly utils: UtilsService,
  ) {}
  async do(page: Page): Promise<Page> {
    await page.setUserAgent(this.config.userAgent);
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    await this.passWebDriverTest(page);
    await this.passChromeTest(page);
    await this.passPermissionTest(page);
    await this.passPluginsTest(page);
    await this.passLanguageTest(page);
    await this.passBrokenImageTest(page);
    await this.passDimensionsTest(page);
    await this.passHardwareTest(page);

    await page.setViewport({
      width: this.getRandomScreenWidth(),
      height: this.getRandomScreenHeight(),
      deviceScaleFactor: 1,
    });

    return page;
  }

  private async passWebDriverTest(page: Page): Promise<Page> {
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    return page;
  }

  private async passChromeTest(page: Page): Promise<Page> {
    await page.evaluateOnNewDocument(() => {
      const chrome = {
        app: {
          isInstalled: false,
        },
        webstore: {
          onInstallStageChanged: {},
          onDownloadProgress: {},
        },
        runtime: {
          PlatformOs: {
            MAC: 'mac',
            WIN: 'win',
            ANDROID: 'android',
            CROS: 'cros',
            LINUX: 'linux',
            OPENBSD: 'openbsd',
          },
          PlatformArch: {
            ARM: 'arm',
            X86_32: 'x86-32',
            X86_64: 'x86-64',
          },
          PlatformNaclArch: {
            ARM: 'arm',
            X86_32: 'x86-32',
            X86_64: 'x86-64',
          },
          RequestUpdateCheckStatus: {
            THROTTLED: 'throttled',
            NO_UPDATE: 'no_update',
            UPDATE_AVAILABLE: 'update_available',
          },
          OnInstalledReason: {
            INSTALL: 'install',
            UPDATE: 'update',
            CHROME_UPDATE: 'chrome_update',
            SHARED_MODULE_UPDATE: 'shared_module_update',
          },
          OnRestartRequiredReason: {
            APP_UPDATE: 'app_update',
            OS_UPDATE: 'os_update',
            PERIODIC: 'periodic',
          },
        },
      };

      (window.navigator as any).chrome = chrome;

      (window.navigator as any).isChrome = true;
      (window as any).chrome = chrome;
      (window as any).isChrome = true;
    });

    return page;
  }

  private async passPermissionTest(page: Page): Promise<Page> {
    await page.evaluateOnNewDocument(() => {
      try {
        const originalQuery = (window.navigator as any).permissions.query;
        const queryFn = (parameters: any): Promise<any> => {
          return parameters.name === 'notifications'
            ? Promise.resolve({ state: 'default' })
            : originalQuery(parameters);
        };

        Object.defineProperty((navigator as any).permissions, 'query', { value: queryFn });
        Object.defineProperty(Notification, 'permission', { value: 'default', writable: true });
      } catch (error) {
        console.log(error);
      }
    });

    return page;
  }

  private async passPluginsTest(page: Page): Promise<Page> {
    // Pass the Plugins Length Test.
    await page.evaluateOnNewDocument(() => {
      // Overwrite the plugins property to use a custom getter.
      Object.defineProperty(navigator, 'plugins', {
        // This just needs to have length > 0 for the current test,
        // but we could mock the plugins too if necessary.
        get: () => [1, 2, 3, 4, 5],
      });
    });

    return page;
  }

  private async passLanguageTest(page: Page): Promise<Page> {
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'languages', { value: ['en-US', 'en'] });
      Object.defineProperty(navigator, 'language', { value: 'en-US' });
    });

    return page;
  }

  private async passBrokenImageTest(page: Page): Promise<Page> {
    await page.evaluateOnNewDocument(() => {
      ['height', 'width'].forEach(property => {
        // store the existing descriptor
        const imageDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, property);

        // redefine the property with a patched descriptor
        Object.defineProperty(HTMLImageElement.prototype, property, {
          ...imageDescriptor,
          // tslint:disable-next-line: object-literal-shorthand
          get: function() {
            // return an arbitrary non-zero dimension if the image failed to load
            if (this.complete && this.naturalHeight === 0) {
              return 20;
            }
            // otherwise, return the actual dimension
            return imageDescriptor.get.apply(this);
          },
        });
      });
    });

    return page;
  }

  private async passDimensionsTest(page: Page) {
    const screenWidth = this.getRandomScreenWidth();
    const screenHeigth = this.getRandomScreenHeight();
    console.log(screenWidth);
    console.log(screenHeigth);
    await page.evaluateOnNewDocument(
      (screenWidth, screenHeigth) => {
        Object.defineProperty(window, 'innerWidth', { value: screenWidth });
        Object.defineProperty(window, 'innerHeight', { value: screenHeigth });
        Object.defineProperty(window, 'outerWidth', { value: screenWidth });
        Object.defineProperty(window, 'outerHeight', { value: screenHeigth });
        Object.defineProperty(screen, 'width', { value: screenWidth });
        Object.defineProperty(screen, 'height', { value: screenHeigth });
        Object.defineProperty(screen, 'availLeft', { value: 0 });
        Object.defineProperty(screen, 'availTop', { value: 0 });
        Object.defineProperty(screen, 'availWidth', { value: screenWidth });
        Object.defineProperty(screen, 'availHeight', { value: screenHeigth });
      },
      screenWidth,
      screenHeigth,
    );
  }

  private async passHardwareTest(page: Page) {
    const deviceMemory = this.getDeviceMemory();
    const hardwareConcurrency = this.getHardwareConcurrency();

    await page.evaluateOnNewDocument(
      (deviceMemory, hardwareConcurrency) => {
        Object.defineProperty(navigator, 'deviceMemory', deviceMemory);
        Object.defineProperty(navigator, 'hardwareConcurrency', { value: hardwareConcurrency });
      },
      deviceMemory,
      hardwareConcurrency,
    );
  }
  private async passWebGlTest(page: Page) {
    // await page.evaluateOnNewDocument(() => {
    //   const getParameter = WebGLRenderingContext.getParameter;
    //   WebGLRenderingContext.prototype.getParameter = function(parameter) {
    //     // UNMASKED_VENDOR_WEBGL
    //     if (parameter === 37445) {
    //       return 'Intel Open Source Technology Center';
    //     }
    //     // UNMASKED_RENDERER_WEBGL
    //     if (parameter === 37446) {
    //       return 'Mesa DRI Intel(R) Ivybridge Mobile ';
    //     }
    //     return getParameter(parameter);
    //   };
    // });
  }

  private getDeviceMemory(): number {
    const deviceMemoryVariations = [4, 8];
    const randomIndex = Math.floor(Math.random() * deviceMemoryVariations.length);
    return deviceMemoryVariations[randomIndex];
  }

  private getHardwareConcurrency(): number {
    const hardwareConcurrencyVariations = [4, 8, 12, 16];
    const randomIndex = Math.floor(Math.random() * hardwareConcurrencyVariations.length);
    return hardwareConcurrencyVariations[randomIndex];
  }

  private getRandomScreenWidth() {
    const screenWidthMax = 1070;
    const screenWidthMin = 1580;

    return this.utils.getNumberBetween(screenWidthMax, screenWidthMin);
  }

  private getRandomScreenHeight() {
    const screenHeightMax = 915;
    const screenHeightMin = 720;

    return this.utils.getNumberBetween(screenHeightMax, screenHeightMin);
  }
}
