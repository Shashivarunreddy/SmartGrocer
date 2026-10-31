@ui @catalogue
Feature: Web UI Catalogue Search & Product Filtering
  As an authenticated SmartGrocer user
  I want to browse and filter 1,000+ UK catalogue items
  So that I can add items to my active shopping list

  Scenario: Browse products and filter by category
    Given I navigate to the catalogue page
    Then I should see the category filter pills including "Dairy & Eggs"
    When I select the "Dairy & Eggs" category pill
    Then the displayed product cards should be updated with dairy items

  Scenario: Live search and one-click add to cart
    Given I navigate to the catalogue page
    When I search for "bread" in the catalogue search box
    Then the search results should display bread products
    When I click "+ Add" on the first product card
    Then the button state should update to show the item is in my list

