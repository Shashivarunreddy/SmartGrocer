# SmartGrocer — Implementation Roadmap

## Stage 1: Requirements and Planning

Tasks:
- Finalise the MVP.
- Define user stories and acceptance criteria.
- Draw screen wireframes.
- Define database entities and service boundaries.
- Assign team responsibilities.
- Create a project board and timeline.

Deliverables:
- Approved PRD.
- Initial architecture.
- Wireframes.
- Project plan.

Completion condition: The team agrees on what the first release must deliver.

## Stage 2: Project Setup

Tasks:
- Create the GitHub repository.
- Initialise the Expo React Native application with TypeScript.
- Initialise the Express backend.
- Configure PostgreSQL and Prisma.
- Create the Python FastAPI service structure.
- Configure environment variables.
- Add linting, formatting, and test tooling.

Deliverables:
- Working mobile development environment.
- Working API service.
- Working database connection.
- Running Python service skeleton.

Completion condition: All three application components can start independently.

## Stage 3: Database and Product Catalogue

Tasks:
- Define the initial database schema.
- Create and apply migrations.
- Add the internal user profile model.
- Add product, shopping-list, pantry, and shopping-trip entities.
- Seed a development catalogue with sample grocery products and prices.
- Test relationships and constraints.

Deliverable: A working database with sample data.

Completion condition: The backend can retrieve products and persist test records.

## Stage 4: Authentication

Tasks:
- Configure Clerk for Expo.
- Build sign-in and sign-up screens.
- Protect authenticated screens.
- Add session-token handling to the API client.
- Verify tokens in Express.
- Create or retrieve user profiles.
- Test ownership enforcement.

Deliverable: A working authenticated mobile application.

Completion condition: Users can sign in and access only their own protected resources.

## Stage 5: Core Mobile Interface

Tasks:
- Build onboarding.
- Build the home screen.
- Build the grocery catalogue and search.
- Build shopping-list creation and editing.
- Add navigation and reusable components.
- Implement loading, empty, and error states.

Deliverable: Users can browse products and manage a list on a mobile device.

Completion condition: The core UI is usable on a physical Android device.

## Stage 6: Bill Estimation and Budget

Tasks:
- Implement server-side line-total and bill calculations.
- Display the budget and remaining amount.
- Show over-budget warnings.
- Allow users to adjust quantities.
- Add suitable cheaper alternatives.
- Test calculations with different prices and quantities.

Deliverable: A functional budget planner.

Completion condition: Estimated totals are consistent with the server-side calculation.

## Stage 7: Pantry and Shopping History

Tasks:
- Build the pantry screen.
- Allow users to record quantities and expiry dates.
- Allow users to confirm whether previously purchased items remain.
- Implement shopping-trip completion.
- Save actual purchased quantities and prices.
- Display purchase history.

Deliverable: A complete shopping and pantry workflow.

Completion condition: The next shopping session can use saved history and confirmed pantry stock.

## Stage 8: Rule-Based Recommendations

Tasks:
- Recommend replenishment items.
- Account for household size and shopping frequency.
- Exclude or reduce items already sufficiently stocked.
- Add expiry-based warnings.
- Suggest suitable cheaper products.
- Explain the reason for each recommendation.

Deliverable: A working recommendation engine without machine learning.

Completion condition: Recommendations follow documented rules and can be edited by users.

## Stage 9: Python Service Integration

Tasks:
- Define the prediction target.
- Define request and response schemas.
- Build a baseline predictor.
- Create FastAPI endpoints.
- Integrate Node.js with Python.
- Configure timeouts and error handling.
- Add automated tests.

Deliverable: An independently testable AI service connected to the backend.

Completion condition: Node.js can request predictions and safely handle service failures.

## Stage 10: Machine Learning

Tasks:
- Prepare historical or clearly labelled synthetic data.
- Establish a baseline.
- Train a suitable model.
- Evaluate the model against the baseline.
- Version the model and features.
- Integrate the trained model into FastAPI.
- Document limitations.

Deliverable: An evaluated prediction feature.

Completion condition: The model has documented test results and does not degrade core application reliability.

## Stage 11: Recipes and Analytics

Tasks:
- Add ingredient-based recipe suggestions.
- Display missing ingredients.
- Add spending summaries.
- Add budget-adherence analytics.
- Add recorded food-waste summaries.
- Consider notifications if time permits.

Deliverable: Selected advanced features.

Completion condition: Each feature has defined behaviour and passes its relevant tests.

## Stage 12: Testing and Deployment

Tasks:
- Run unit, integration, and end-to-end tests.
- Verify cross-user access restrictions.
- Test database transactions.
- Test AI-service failure handling.
- Deploy backend and database.
- Deploy the AI service.
- Create mobile builds with Expo EAS.
- Prepare demonstration accounts and sample data.
- Document limitations and evaluation results.

Deliverable: A working mobile prototype and demonstration.

Completion condition: The main user journey works reliably from sign-in through purchase history.

## Priority if Time Is Limited

### Must Have
- Authentication.
- Product catalogue.
- Shopping lists.
- Budget and bill estimation.
- Household size.
- Pantry management.
- Purchase history.
- Rule-based recommendations.

### Should Have
- Expiry reminders.
- Cheaper alternatives.
- Recipe suggestions.
- Spending analytics.

### Stretch Goals
- Trained demand prediction.
- Food-waste prediction.
- Receipt OCR.
- Advanced sustainability analytics.

## Definition of Done

A feature is complete when its requirements are documented, mobile interface is implemented, backend validation and authorization work, database changes are migrated, relevant tests pass, errors are handled, and the feature is demonstrated successfully.
