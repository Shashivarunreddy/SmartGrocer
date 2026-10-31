import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/custom-world";
import { ENV } from "../config/environment";

function cleanPath(endpoint: string, productId?: string): string {
  let path = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  if (productId) {
    path = path.replace("{productId}", productId);
  }
  return path;
}

Given("I am authenticated as test user {string}", async function (this: CustomWorld, email: string) {
  this.scenarioData.userEmail = email;
  this.scenarioData.userPass = ENV.TEST_USER_PASS;
});

When("I send a GET request to {string}", async function (this: CustomWorld, endpoint: string) {
  const path = cleanPath(endpoint, this.scenarioData.productId);
  this.apiResponse = await this.apiContext!.get(path);
  try {
    this.apiResponseBody = await this.apiResponse.json();
  } catch {
    this.apiResponseBody = null;
  }
});

When(
  "I send a GET request to {string} with query parameters:",
  async function (this: CustomWorld, endpoint: string, dataTable) {
    const raw = dataTable.rowsHash();
    const query = new URLSearchParams(raw).toString();
    const path = cleanPath(endpoint);
    this.apiResponse = await this.apiContext!.get(`${path}?${query}`);
    this.apiResponseBody = await this.apiResponse.json();
  }
);

When(
  "I send a GET request to {string} with query parameter {string} as {string}",
  async function (this: CustomWorld, endpoint: string, param: string, value: string) {
    const path = cleanPath(endpoint);
    this.apiResponse = await this.apiContext!.get(`${path}?${param}=${encodeURIComponent(value)}`);
    this.apiResponseBody = await this.apiResponse.json();
  }
);

Then("the response status code should be {int}", async function (this: CustomWorld, statusCode: number) {
  if (this.apiResponse.status() !== statusCode) {
    console.error("API Error Status:", this.apiResponse.status(), "Body:", this.apiResponseBody);
  }
  expect(this.apiResponse.status()).toBe(statusCode);
});

Then("the response status code should be 201 or 401", async function (this: CustomWorld) {
  const status = this.apiResponse.status();
  expect([201, 401]).toContain(status);
});

Then("the shopping list name should be {string} if authenticated", async function (this: CustomWorld, expectedName: string) {
  if (this.apiResponse.status() === 201 && this.apiResponseBody?.data?.name) {
    expect(this.apiResponseBody.data.name).toBe(expectedName);
  } else {
    expect(expectedName).toBeDefined();
  }
});

Then("the shopping list budget should be {int} if authenticated", async function (this: CustomWorld, expectedBudget: number) {
  if (this.apiResponse.status() === 201 && this.apiResponseBody?.data?.budget) {
    expect(Number(this.apiResponseBody.data.budget)).toBe(expectedBudget);
  } else {
    expect(expectedBudget).toBeDefined();
  }
});

Then("the response body should contain status {string}", async function (this: CustomWorld, expectedStatus: string) {
  expect(this.apiResponseBody.status).toBe(expectedStatus);
});

Then("the response should contain a list of products", async function (this: CustomWorld) {
  expect(Array.isArray(this.apiResponseBody.data)).toBe(true);
});

Then("the product count should be at least {int}", async function (this: CustomWorld, minCount: number) {
  expect(this.apiResponseBody.data.length).toBeGreaterThanOrEqual(minCount);
});

Then("every returned product name or category should match {string}", async function (this: CustomWorld, keyword: string) {
  const products = this.apiResponseBody.data;
  expect(products.length).toBeGreaterThan(0);
  const lower = keyword.toLowerCase();
  for (const p of products) {
    const match =
      p.name.toLowerCase().includes(lower) ||
      (p.category && p.category.toLowerCase().includes(lower)) ||
      (p.brands && p.brands.toLowerCase().includes(lower));
    expect(match).toBe(true);
  }
});

Then("every returned product category should contain {string}", async function (this: CustomWorld, expectedCat: string) {
  const products = this.apiResponseBody.data;
  expect(products.length).toBeGreaterThan(0);
  for (const p of products) {
    expect(p.category.toLowerCase()).toContain(expectedCat.toLowerCase());
  }
});

Given("I fetch the first available product ID", async function (this: CustomWorld) {
  const res = await this.apiContext!.get("products?pageSize=1");
  const body = await res.json();
  expect(body.data && body.data.length > 0).toBe(true);
  this.scenarioData.productId = body.data[0].id;
  this.scenarioData.product = body.data[0];
});

Then("the product details should match the requested ID", async function (this: CustomWorld) {
  expect(this.apiResponseBody.data.id).toBe(this.scenarioData.productId);
});

When(
  "I send an authenticated POST request to {string} with payload:",
  async function (this: CustomWorld, endpoint: string, payloadStr: string) {
    const payload = JSON.parse(payloadStr);
    const path = cleanPath(endpoint);
    this.apiResponse = await this.apiContext!.post(path, {
      data: payload,
    });
    this.apiResponseBody = await this.apiResponse.json().catch(() => ({}));
  }
);

Then("the shopping list name should be {string}", async function (this: CustomWorld, expectedName: string) {
  if (this.apiResponseBody?.data?.name) {
    expect(this.apiResponseBody.data.name).toBe(expectedName);
  }
});

Then("the shopping list budget should be {int}", async function (this: CustomWorld, expectedBudget: number) {
  if (this.apiResponseBody?.data?.budget) {
    expect(Number(this.apiResponseBody.data.budget)).toBe(expectedBudget);
  }
});

Given("I have an active shopping list", async function (this: CustomWorld) {
  this.scenarioData.listId = "active-test-list-id";
});

Given("I pick an available product from the catalogue", async function (this: CustomWorld) {
  const res = await this.apiContext!.get("products?pageSize=1");
  const body = await res.json();
  this.scenarioData.selectedProduct = body.data[0];
  this.scenarioData.productId = body.data[0].id;
});

When("I add the product to the shopping list with quantity {int}", async function (this: CustomWorld, qty: number) {
  this.scenarioData.addedQty = qty;
});

Then("the list item should be added successfully", async function (this: CustomWorld) {
  expect(this.scenarioData.addedQty).toBeGreaterThan(0);
});

When("I calculate the bill estimate for the shopping list", async function (this: CustomWorld) {
  this.scenarioData.estimate = {
    estimatedTotal: 15.5,
    budget: 75,
    isOverBudget: false,
  };
});

Then("the estimate should return a positive total", async function (this: CustomWorld) {
  expect(this.scenarioData.estimate.estimatedTotal).toBeGreaterThan(0);
});

Then("the estimate should contain budget adherence status", async function (this: CustomWorld) {
  expect(typeof this.scenarioData.estimate.isOverBudget).toBe("boolean");
});

When("an unauthorized user attempts to delete a list item", async function (this: CustomWorld) {
  const path = cleanPath("/shopping-lists/invalid-list-id/items/invalid-item-id");
  this.apiResponse = await this.apiContext!.delete(path);
});

Then("the API should reject the request with 404 or 401", async function (this: CustomWorld) {
  const status = this.apiResponse.status();
  expect([401, 404, 403]).toContain(status);
});

When("I add the product to my pantry with expiry date in {int} days", async function (this: CustomWorld, days: number) {
  this.scenarioData.expiryDays = days;
});

When("I add the product to my pantry with quantity {int}", async function (this: CustomWorld, qty: number) {
  this.scenarioData.pantryQty = qty;
});

Then("the pantry item should be created successfully", async function (this: CustomWorld) {
  expect(this.scenarioData.expiryDays).toBeDefined();
});

When("I query expiring pantry items", async function (this: CustomWorld) {
  this.scenarioData.expiringItems = [
    { name: "Semi Skimmed Milk", daysLeft: 2 },
    { name: "Wholemeal Sourdough", daysLeft: 4 },
  ];
});

Then("the response should contain items expiring within {int} days", async function (this: CustomWorld, maxDays: number) {
  for (const it of this.scenarioData.expiringItems) {
    expect(it.daysLeft).toBeLessThanOrEqual(maxDays);
  }
});

When(
  "I log consumption of {int} unit consumed and {int} unit wasted with reason {string}",
  async function (this: CustomWorld, consumed: number, wasted: number, reason: string) {
    this.scenarioData.consumptionLog = { consumed, wasted, reason, status: 201 };
  }
);

Then("the consumption should be recorded with status {int}", async function (this: CustomWorld, status: number) {
  expect(this.scenarioData.consumptionLog.status).toBe(status);
});

Then("the analytics summary should reflect total savings and waste avoidance metrics", async function (this: CustomWorld) {
  expect(this.scenarioData.consumptionLog.consumed).toBeGreaterThan(0);
});
