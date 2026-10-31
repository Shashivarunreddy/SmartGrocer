import { Before, After, BeforeAll, AfterAll, Status } from "@cucumber/cucumber";
import { chromium, request, Browser } from "playwright";
import { CustomWorld } from "./custom-world";
import { ENV } from "../config/environment";
import fs from "fs";
import path from "path";

let globalBrowser: Browser;

BeforeAll({ timeout: 60000 }, async function () {
  const reportsDir = path.join(process.cwd(), "reports");
  const screenshotsDir = path.join(reportsDir, "screenshots");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  globalBrowser = await chromium.launch({
    headless: ENV.HEADLESS,
  });
});

AfterAll({ timeout: 30000 }, async function () {
  if (globalBrowser) {
    await globalBrowser.close();
  }
});

Before(async function (this: CustomWorld, scenario) {
  this.scenarioData = {};

  // Setup Playwright API Request Context
  const base = ENV.API_BASE_URL.endsWith("/") ? ENV.API_BASE_URL : `${ENV.API_BASE_URL}/`;
  this.apiContext = await request.newContext({
    baseURL: base,
    extraHTTPHeaders: {
      "Content-Type": "application/json",
    },
  });

  // If scenario involves UI (@ui or @e2e), launch browser context & page
  const isUi = scenario.pickle.tags.some((t) => t.name.includes("ui") || t.name.includes("e2e"));
  if (isUi && globalBrowser) {
    this.context = await globalBrowser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    this.page = await this.context.newPage();
  }
});

After(async function (this: CustomWorld, scenario) {
  // Capture screenshot on UI test failure
  if (scenario.result?.status === Status.FAILED && this.page) {
    const screenshotName = `${scenario.pickle.name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.png`;
    const screenshotPath = path.join(process.cwd(), "reports", "screenshots", screenshotName);
    const screenshot = await this.page.screenshot({ path: screenshotPath, fullPage: true });
    this.attach(screenshot, "image/png");
  }

  if (this.page) await this.page.close();
  if (this.context) await this.context.close();
  if (this.apiContext) await this.apiContext.dispose();
});
