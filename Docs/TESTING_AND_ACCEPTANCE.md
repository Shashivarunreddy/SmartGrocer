# SmartGrocer — Testing and Acceptance Plan

## 1. Testing Objectives

Verify that the mobile application, backend, database, authentication, and AI service work correctly together, and that grocery recommendations are useful and explainable.

## 2. Mobile Testing

Test:
- Sign-in and sign-out.
- Onboarding and profile updates.
- Product search.
- Adding, removing, and editing list items.
- Bill estimation display.
- Budget warnings.
- Pantry updates.
- Expiry reminders.
- Shopping completion.
- Shopping history.
- Loading, empty, and error states.

Tools: Jest and React Native Testing Library, alongside manual device testing.

## 3. Backend Testing

Test:
- Request validation.
- Clerk token verification.
- Profile creation.
- Product retrieval.
- Shopping-list operations.
- Bill calculations.
- Pantry ownership and updates.
- Shopping-trip transactions.
- Recommendation rules.
- Error handling.

Tools: Jest or another suitable TypeScript test runner, Supertest, and a dedicated test database.

## 4. Database Testing

Test:
- Foreign-key relationships.
- Unique constraints.
- Valid quantities and prices.
- Transaction rollback when a related operation fails.
- Preservation of purchase price snapshots.
- User isolation.
- Migration correctness.

## 5. AI Testing

Test:
- Valid and invalid prediction inputs.
- Missing values.
- Unexpected quantities and units.
- Response schema correctness.
- Model loading failures.
- Prediction consistency.
- Performance against the baseline.
- Behaviour when Python is unavailable.

Use Pytest for Python unit and integration tests.

## 6. End-to-End Scenarios

### Scenario A: Budget Planning
Given a user has configured a budget, when products are added, the system calculates the total and identifies whether the list exceeds the budget.

### Scenario B: Existing Pantry
Given the user has confirmed that sufficient rice is available, the system should not recommend additional rice without a valid reason.

### Scenario C: Repeat Shopping
Given the user previously bought milk, the system asks whether milk remains at home before recommending replenishment.

### Scenario D: Purchase Completion
Given the user confirms actual quantities and prices, the system records the completed trip and makes the history available later.

### Scenario E: AI Unavailable
Given the Python service is unavailable, the user can still create lists, calculate bills, manage pantry stock, and receive supported rule-based suggestions.

### Scenario F: Cross-User Security
Given two different authenticated users, neither user can access or change the other's private shopping data.

## 7. Evaluation Metrics

- Estimated versus actual bill difference.
- Percentage of trips within budget.
- User acceptance and edit rates for recommendations.
- MAE for grocery quantity predictions.
- Precision and recall for food-waste risk, if implemented as classification.
- Recorded waste over a defined evaluation period.

Define measurement procedures before evaluating results. Do not claim that food waste has been reduced merely because the application displays waste predictions.

## 8. Release Criteria

A release candidate must pass the core end-to-end tests, authentication and ownership tests, data-integrity checks, and mobile usability review. Known limitations must be documented.
