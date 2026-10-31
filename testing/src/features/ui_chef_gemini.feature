@ui @chef @ai
Feature: Web UI Chef Gemini Recipes & One-Tap Add
  As an authenticated SmartGrocer user
  I want to view zero-waste recipes using my pantry items
  And add missing ingredients directly to my active list

  Scenario: Add missing ingredients and remove box from recipe card
    Given I navigate to the Chef AI page
    Then I should see recipes with zero-waste scores and used pantry items
    When I click "Add Missing Ingredients to Shopping List" on an eligible recipe
    Then the missing groceries section should be removed from that recipe card
    And a confirmation badge "Missing ingredients added" should be displayed

  Scenario: Open floating AI Assistant from any screen
    Given I navigate to the SmartGrocer Web App
    When I click the floating "Ask Chef Gemini" button in the corner
    Then the AI Assistant chat drawer should open with quick prompt suggestions
    When I select the quick prompt "What do I need to buy?"
    Then the conversation history should display the assistant recommendations

