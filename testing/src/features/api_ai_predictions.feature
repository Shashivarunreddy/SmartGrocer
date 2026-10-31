@api @ai
Feature: AI Recommendations, Replenishment Forecasting, and Chef Gemini APIs
  As an authenticated SmartGrocer user
  I want AI-powered grocery insights and pantry-based recipes
  So that I never run out of essentials and minimize kitchen waste

  Background:
    Given I am authenticated as test user "user1@gmail.com"

  Scenario: Fetch AI replenishment predictions
    When I request replenishment predictions
    Then the response should contain predicted grocery items
    And each prediction should include an urgency level and confidence score

  Scenario: Request food waste risk analysis
    When I request food waste risk analysis
    Then the response should return evaluated pantry waste risks

  Scenario: Generate zero-waste Chef Gemini recipes
    When I request chef recipes based on current pantry inventory
    Then the response should contain recipes with used pantry items and waste reduction scores

  Scenario: Query AI Assistant chatbot with grocery intent
    When I send a message "What do I need to buy for dinner?" to the AI Assistant
    Then the assistant reply should be relevant to groceries and food
    And the response should not be refused

