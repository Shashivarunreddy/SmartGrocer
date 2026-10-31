@ui @auth
Feature: Web UI Authentication & Test User Onboarding
  As a shopper on the SmartGrocer Web App
  I want to see the brand onboarding screen and log in with 1-click test credentials
  So that I can immediately manage my groceries

  Scenario: Render landing hero banner and quick test login drawer
    Given I navigate to the SmartGrocer Web App
    Then I should see the "SmartGrocer" branding with Leaf Basket icon
    And I should see the quick test login accounts "User 1" through "User 10"
    And I should see the live bill predictor and expiry alerts badges

  Scenario: Authenticate using seeded test account
    Given I navigate to the SmartGrocer Web App
    When I click the quick test login for "User 1"
    Then I should be signed into the dashboard with my grocery overview

