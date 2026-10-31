const reporter = require("cucumber-html-reporter");
const path = require("path");
const fs = require("fs");

const jsonReportPath = path.join(__dirname, "reports", "cucumber-report.json");
const outputHtmlPath = path.join(__dirname, "reports", "cucumber-html-report.html");

if (!fs.existsSync(jsonReportPath)) {
  console.log("No JSON report found at:", jsonReportPath);
  process.exit(0);
}

const options = {
  theme: "bootstrap",
  jsonFile: jsonReportPath,
  output: outputHtmlPath,
  reportSuiteAsScenarios: true,
  scenarioTimestamp: true,
  launchReport: false,
  metadata: {
    "App Name": "SmartGrocer",
    "Test Environment": "End-to-End Full Stack (Web UI, API, AI)",
    Browser: "Chromium (Playwright)",
    Platform: process.platform,
    "Node Version": process.version,
    "Executed Date": new Date().toISOString(),
  },
  brandTitle: "SmartGrocer E2E Playwright & Cucumber BDD Report",
  name: "SmartGrocer Full-Stack Verification Suite",
};

try {
  reporter.generate(options);
  console.log("=================================================");
  console.log("✅ Playwright & Cucumber HTML Report Generated Successfully!");
  console.log("📄 Report Location: " + outputHtmlPath);
  console.log("=================================================");
} catch (err) {
  console.error("Error generating HTML report:", err);
}

