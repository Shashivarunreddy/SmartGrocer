@api @products
Feature: Product Catalogue & Backend Health APIs
  As an authenticated or guest client
  I want to check system health and browse products
  So that I can view available UK groceries

  Scenario: Verify backend service health probe
    When I send a GET request to "/health"
    Then the response status code should be 200
    And the response body should contain status "ok"

  Scenario: Retrieve active UK product catalogue
    When I send a GET request to "/products" with query parameters:
      | page     | 1  |
      | pageSize | 20 |
    Then the response status code should be 200
    And the response should contain a list of products
    And the product count should be at least 1

  Scenario: Filter products by search keyword
    When I send a GET request to "/products" with query parameter "search" as "milk"
    Then the response status code should be 200
    And every returned product name or category should match "milk"

  Scenario: Filter products by category
    When I send a GET request to "/products" with query parameter "category" as "Milks"
    Then the response status code should be 200
    And every returned product category should contain "Milk"

  Scenario: Retrieve single product details by valid ID
    Given I fetch the first available product ID
    When I send a GET request to "/products/{productId}"
    Then the response status code should be 200
    And the product details should match the requested ID
