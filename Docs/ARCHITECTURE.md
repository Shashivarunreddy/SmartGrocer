# SmartGrocer — System Architecture

## 1. Architecture Overview

SmartGrocer uses a mobile client, an application API, a relational database, an authentication provider, and a separate machine-learning service.

## 2. Components

### React Native + Expo
Responsible for:
- Mobile screens and navigation.
- Forms and user interactions.
- Displaying products, lists, budgets, pantry entries, and recommendations.
- Sending authenticated API requests.
- Handling loading, empty, and error states.

### Clerk
Responsible for:
- User registration and sign-in.
- Session management.
- Providing identity and session tokens.
- Supporting protected mobile screens.

### Node.js + Express
Responsible for:
- Verifying Clerk tokens.
- Validating requests.
- Enforcing user permissions.
- Managing shopping lists and pantry records.
- Calculating estimated bills.
- Applying budget and replenishment rules.
- Reading and writing PostgreSQL data through Prisma.
- Calling the Python AI service.

### PostgreSQL + Prisma
Responsible for:
- Persistent user profiles and preferences.
- Products and prices.
- Shopping lists and list items.
- Pantry stock and expiry dates.
- Shopping trips and purchase history.
- Consumption and waste records.

### Python + FastAPI
Responsible for:
- Grocery demand prediction.
- Consumption prediction.
- Optional food-waste risk prediction.
- Returning structured predictions to Node.js.

## 3. Request Flow

1. A user signs in through Clerk in the mobile app.
2. The mobile app obtains a valid session token.
3. The app sends an authenticated request to Node.js.
4. Node.js verifies the token and identifies the user.
5. Node.js retrieves the user's data through Prisma.
6. Node.js calculates totals and applies business rules.
7. If a prediction is needed, Node.js sends a validated feature payload to Python.
8. Python returns a prediction.
9. Node.js validates the result, applies budget and stock constraints, and constructs the response.
10. The mobile app displays the result.

## 4. Architectural Rules

- The mobile app must never connect directly to PostgreSQL.
- The mobile app must never receive server-side secrets.
- Node.js is the only service that manages application database writes in the initial architecture.
- Python is a separate prediction service, not a replacement for Node.js.
- All money calculations must remain deterministic.
- Recommendations must be editable by users.
- Core application functions must remain available when Python is down.
- The server must derive the authenticated user from verified Clerk claims, not from a client-supplied user ID.

## 5. Failure Handling

If Python is unavailable, Node.js should return rule-based recommendations or explain that predictions are temporarily unavailable.

If the database is unavailable, the API should return an appropriate service error rather than pretending that data has been saved.

If product pricing is missing, the estimate should identify incomplete pricing rather than silently treating unknown prices as zero.

## 6. Architectural Evolution

Start with a single Express API and one PostgreSQL database. Add the separate FastAPI service when the core app is functional. Avoid microservices for every feature; only the AI service needs a separate runtime in the initial design.
