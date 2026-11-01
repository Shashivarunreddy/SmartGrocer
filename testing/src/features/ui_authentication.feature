@ui @auth
Feature: Web UI Landing Page & Authentication Showcase
  As a visitor on the SmartGrocer Web App
  I want to see the brand landing page showcasing core features with top sign-in and sign-up buttons
  So that I understand the application and can access my account

  Scenario: Render public landing page with core feature showcase
    Given I navigate to the SmartGrocer Web App
    Then I should see the "SmartGrocer" branding with Leaf Basket icon
    And I should see the "Sign In" and "Sign Up" action buttons
    And I should see the live bill predictor and expiry alerts feature cards

  Scenario: Access grocery dashboard via authentication
    Given I navigate to the SmartGrocer Web App
    When I click "Sign In"
    Then I should be able to access the grocery dashboard
