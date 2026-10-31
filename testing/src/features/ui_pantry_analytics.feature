@ui @pantry
Feature: Web UI - Pantry Inventory and Expiry Tracking
  As a SmartGrocer household user
  I want to view my pantry inventory with real-time expiry alerts
  So that I can prevent food spoilage and log consumption

  Scenario: Viewing pantry inventory and expiry status indicators
    Given I navigate to the pantry page
    Then I should see the pantry inventory list with expiry countdown badges
    And I should see filters for "All", "Expiring Soon", and "Fresh"

  Scenario: Filtering pantry items by expiry status
    Given I navigate to the pantry page
    When I click the "Expiring Soon" pantry filter pill
    Then only items with high spoilage risk should be visible

