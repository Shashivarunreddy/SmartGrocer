import { World, IWorldOptions, setWorldConstructor } from "@cucumber/cucumber";
import { Browser, BrowserContext, Page, APIRequestContext } from "playwright";

export interface CustomWorld extends World {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  apiContext?: APIRequestContext;
  apiResponse?: any;
  apiResponseBody?: any;
  authToken?: string;
  scenarioData: Record<string, any>;
}

export class SmartGrocerWorld extends World implements CustomWorld {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  apiContext?: APIRequestContext;
  apiResponse?: any;
  apiResponseBody?: any;
  authToken?: string;
  scenarioData: Record<string, any> = {};

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(SmartGrocerWorld);

