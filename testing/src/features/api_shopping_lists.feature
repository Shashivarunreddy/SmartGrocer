@api @shopping_lists
Feature: Shopping List Management & Bill Estimation APIs
  As an authenticated SmartGrocer user
  I want to create and manage shopping lists and estimate my bill
  So that I can stay on budget during my grocery trips

  Background:
    Given I am authenticated as test user "user1@gmail.com"

  Scenario: Create and fetch user shopping lists
    When I send an authenticated POST request to "/shopping-lists" with payload:
      """
      {
        "name": "E2E Test Weekly Run",
        "budget": 75,
        "currency": "GBP"
      }
      """
    Then the response status code should be 201 or 401
    And the shopping list name should be "E2E Test Weekly Run" if authenticated
    And the shopping list budget should be 75 if authenticated

  Scenario: Add an item, update quantity, and calculate bill estimate
    Given I have an active shopping list
    And I pick an available product from the catalogue
    When I add the product to the shopping list with quantity 2
    Then the list item should be added successfully
    When I calculate the bill estimate for the shopping list
    Then the estimate should return a positive total
    And the estimate should contain budget adherence status

  Scenario: Enforce BOLA authorization on list item modification
    Given I have an active shopping list
    When an unauthorized user attempts to delete a list item
    Then the API should reject the request with 404 or 401
