# SmartGrocer — Product Requirements Document

## 1. Purpose

SmartGrocer helps users purchase the right groceries in the right quantities while staying within their budget and accounting for items already available at home.

## 2. Problem Statement

Traditional grocery shopping can lead to:
- Buying items that are already available at home.
- Purchasing quantities that exceed household requirements.
- Exceeding the intended shopping budget.
- Forgetting groceries before their expiry dates.
- Struggling to decide what meals to prepare from affordable ingredients.
- Repeating purchases without considering consumption patterns.

SmartGrocer addresses these problems through grocery planning, pantry tracking, budget estimation, and personalised recommendations.

## 3. Target Users

- Individuals managing their own grocery shopping.
- Families planning groceries for multiple people.
- Budget-conscious households.
- Users who want to reduce unnecessary purchases and food waste.
- Users who need simple meal suggestions from available ingredients.

## 4. Functional Requirements

### FR-01: Authentication
Users must be able to sign up, sign in, sign out, and manage authenticated sessions through Clerk.

### FR-02: User Profile
Users must be able to configure household size, preferred currency, shopping budget, dietary preferences, and shopping frequency.

### FR-03: Product Catalogue
Users must be able to browse, search, and filter grocery products. Each product should include a name, category, unit, and price. Food products may include descriptions and recipe-related information.

### FR-04: Shopping List
Users must be able to create shopping lists, add products, change quantities, remove products, and mark items as purchased.

### FR-05: Bill Estimation
The system must calculate an estimated bill from product prices and selected quantities. It must display the estimated total, budget, remaining amount, and budget-overrun warnings.

### FR-06: Budget-Aware Recommendations
The system should recommend suitable groceries and quantities based on household size, budget, dietary preferences, and pantry stock.

When the proposed list exceeds the budget, the system should suggest cheaper suitable alternatives or reductions in lower-priority items.

### FR-07: Pantry Management
Users must be able to add groceries already available at home, record quantities, update stock, and optionally record expiry dates.

### FR-08: Stock Confirmation
Before recommending repeat purchases, the system should ask users whether previously purchased items are still available. Recommendations must account for confirmed stock.

### FR-09: Shopping History
The system must store completed shopping trips, purchased products, quantities, prices, dates, and actual spending.

### FR-10: Replenishment Recommendations
The system should use shopping history and available stock to suggest items that may need replenishment.

### FR-11: Expiry Tracking
The application should identify items approaching their expiry dates and provide reminders.

### FR-12: Recipe Suggestions
For relevant food ingredients, the system should suggest meals that can be prepared with available ingredients. It should identify missing ingredients where possible.

### FR-13: Consumption Prediction
The system may estimate how quickly groceries are consumed and when items might run out.

### FR-14: Food-Waste Prediction
The system may identify products at risk of being wasted based on expiry dates, purchase quantities, and recorded consumption or waste.

### FR-15: Analytics
Users should be able to view spending trends, budget adherence, purchase history, and recorded food waste.

## 5. Non-Functional Requirements

- Security: Protect user data and enforce ownership of all user-specific records.
- Performance: Common screens and API operations should respond promptly under normal project-demo workloads.
- Reliability: Shopping lists, bill calculations, and pantry operations must work if the AI service is unavailable.
- Usability: The mobile interface must be understandable to non-technical users.
- Maintainability: Keep mobile, backend, database, and AI responsibilities separate.
- Data integrity: Shopping totals and purchase records must be calculated and stored consistently.
- Testability: Business rules and API endpoints must have automated tests.
- Scalability: The architecture should allow backend and AI services to be scaled independently.

## 6. Business Rules

1. The server is the source of truth for prices, totals, and persisted records.
2. Users can edit recommendations before purchasing.
3. A recommendation is not a confirmed purchase.
4. The system must not assume an item remains in stock indefinitely.
5. Budget calculations must use reliable monetary arithmetic.
6. Dietary preferences and recorded allergies must be respected when generating suggestions.
7. Machine-learning predictions must be presented as estimates, not guarantees.
8. The application must not make purchases automatically.
9. If product prices are unavailable or outdated, the app must disclose that the estimate may be incomplete.
10. The system should distinguish between estimated spending and actual spending.

## 7. User Stories

- As a user, I want to set a grocery budget so I can control my spending.
- As a user, I want to specify household size so recommended quantities suit my household.
- As a user, I want to see an estimated bill before shopping.
- As a user, I want to record existing groceries so I do not buy unnecessary duplicates.
- As a user, I want to see my previous purchases so I can plan the next shopping trip.
- As a user, I want to receive replenishment suggestions based on my shopping habits.
- As a user, I want expiry reminders so I can use groceries before they expire.
- As a user, I want affordable recipe suggestions based on ingredients at home.
- As a user, I want to see how much I spend over time.
- As a user, I want to correct AI suggestions when they do not match my actual needs.

## 8. MVP Scope

The first working version must include authentication, profile setup, products, shopping lists, bill estimation, budget warnings, pantry management, shopping history, and rule-based recommendations.

Machine-learning models, receipt scanning, advanced recipe generation, and sustainability estimates are later enhancements.

## 9. Success Metrics

- Accuracy of estimated bills compared with recorded actual totals.
- Percentage of shopping trips within the user's budget.
- Percentage of recommendations accepted or edited by users.
- Accuracy of grocery demand predictions.
- Number of duplicate purchases avoided, where measurable.
- User-reported food waste over time.
- Successful completion of core mobile workflows.

## 10. Acceptance Criteria

The MVP is considered functionally complete when a user can sign in, configure a household, build a shopping list, see a calculated total, compare it with a budget, record pantry stock, complete a shopping trip, and use saved history to prepare the next list.
