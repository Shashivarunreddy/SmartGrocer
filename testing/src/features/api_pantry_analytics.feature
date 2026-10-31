@api @pantry @analytics
Feature: Pantry Expiry Tracking & Waste Analytics APIs
  As an authenticated SmartGrocer user
  I want to track pantry items and log food consumption
  So that I can prevent food waste and review spending analytics

  Background:
    Given I am authenticated as test user "user1@gmail.com"

  Scenario: Add an item to pantry and query expiring items
    Given I pick an available product from the catalogue
    When I add the product to my pantry with expiry date in 3 days
    Then the pantry item should be created successfully
    When I query expiring pantry items
    Then the response should contain items expiring within 5 days

  Scenario: Log food consumption and verify inventory deduction
    Given I pick an available product from the catalogue
    And I add the product to my pantry with quantity 2
    When I log consumption of 1 unit consumed and 1 unit wasted with reason "Expired before use"
    Then the consumption should be recorded with status 201
    And the analytics summary should reflect total savings and waste avoidance metrics

