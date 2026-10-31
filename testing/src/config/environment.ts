import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  API_BASE_URL: process.env.API_BASE_URL || "http://65.0.242.245:5000/api/v1",
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || "http://65.0.242.245:8000/api/v1",
  WEB_BASE_URL: process.env.WEB_BASE_URL || "http://localhost:3000",
  TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || "user1@gmail.com",
  TEST_USER_PASS: process.env.TEST_USER_PASS || "GrocerPass@1",
  HEADLESS: process.env.HEADLESS !== "false",
};

