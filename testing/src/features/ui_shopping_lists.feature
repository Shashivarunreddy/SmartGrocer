@ui @lists
Feature: Web UI Shopping List & Bill Predictor
  As an authenticated SmartGrocer user
  I want to review my shopping list, check off items, and track live bill estimates
  So that I know my total cost before checking out

  Scenario: Live bill prediction and item management
    Given I navigate to the active shopping list page
    Then I should see the Live Bill Predictor with Subtotal and Target Budget
    And I should see the list items with checkboxes and quantity adjusters
    When I click the checkbox on the first item
    Then the item should be marked as purchased

  Scenario: Complete shopping run and restock pantry
    Given I navigate to the active shopping list page
    When I click "Complete Shopping Run"
    Then the confirmation modal should appear with my actual total
    And the option to restock pantry should be selected

