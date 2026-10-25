# SmartGrocer — REST API Specification

## 1. General Rules

Base path: `/api/v1`

Backend: Node.js + Express + TypeScript.

All protected endpoints require a valid Clerk session token in the Authorization Bearer header.

All requests and responses use JSON unless a future feature explicitly requires another content type.

## 2. Standard Responses

Successful responses should contain a data object and optional metadata.

Errors should contain a stable error code and a human-readable message.

Use suitable HTTP status codes:
- 200: successful request
- 201: resource created
- 204: successful deletion without response content
- 400: malformed request
- 401: unauthenticated
- 403: unauthorized operation
- 404: resource not found
- 409: conflicting state
- 422: validation failure
- 500: unexpected server error
- 503: required service temporarily unavailable

## 3. Profile APIs

- GET /api/v1/profile — retrieve the current user's profile.
- PATCH /api/v1/profile — update household size, budget, currency, and preferences.

Requirements:
- Derive the user from the verified Clerk token.
- Validate household size and budget.
- Create the internal profile on first authenticated use if it does not exist.

## 4. Product APIs

- GET /api/v1/products — browse products.
- GET /api/v1/products/:productId — retrieve product details.

Supported query parameters may include search text, category, page, and page size.

Product catalogue creation and price administration should be restricted to an authorized administrative workflow.

## 5. Shopping List APIs

- GET /api/v1/shopping-lists — retrieve the user's lists.
- POST /api/v1/shopping-lists — create a list.
- GET /api/v1/shopping-lists/:listId — retrieve a list and its items.
- PATCH /api/v1/shopping-lists/:listId — update list metadata or status.
- DELETE /api/v1/shopping-lists/:listId — delete an eligible draft list.
- POST /api/v1/shopping-lists/:listId/items — add an item.
- PATCH /api/v1/shopping-lists/:listId/items/:itemId — update quantity or purchase status.
- DELETE /api/v1/shopping-lists/:listId/items/:itemId — remove an item.
- POST /api/v1/shopping-lists/:listId/estimate — calculate the estimated bill.

Requirements:
- Verify that the list belongs to the authenticated user.
- Validate product IDs and quantities.
- Use current server-side prices or documented price snapshots.
- Return subtotal, estimated total, budget, remaining budget, and warnings.
- Recalculate totals after quantity or product changes.

## 6. Pantry APIs

- GET /api/v1/pantry — retrieve pantry stock.
- POST /api/v1/pantry — add a pantry entry.
- PATCH /api/v1/pantry/:pantryItemId — update quantity or expiry date.
- DELETE /api/v1/pantry/:pantryItemId — remove an entry.
- GET /api/v1/pantry/expiring — retrieve items expiring within a specified number of days.
- POST /api/v1/pantry/confirm-stock — record user-confirmed stock information.

Requirements:
- Validate quantities and dates.
- Prevent cross-user access.
- Preserve separate batches when expiry dates differ.

## 7. Shopping History APIs

- POST /api/v1/shopping-trips — record a completed trip.
- GET /api/v1/shopping-trips — retrieve paginated history.
- GET /api/v1/shopping-trips/:tripId — retrieve one trip.
- PATCH /api/v1/shopping-trips/:tripId — correct eligible purchase details.

Completing a trip should save actual quantities and prices, update the linked list status, and apply the chosen pantry update policy in a database transaction.

## 8. Recommendation APIs

- POST /api/v1/recommendations/groceries — generate grocery suggestions.
- POST /api/v1/recommendations/budget — optimise a proposed list against a budget.
- POST /api/v1/recommendations/recipes — suggest recipes from available ingredients.
- GET /api/v1/analytics/summary — retrieve spending and shopping statistics.

Recommendation results should include:
- Product identifier and name.
- Suggested quantity and unit.
- Estimated line cost, when pricing is available.
- Reason for recommendation.
- Recommendation source: rule-based or ML.
- Model version, when applicable.

Do not invent confidence scores. Only return a confidence value when it is meaningful and appropriately calibrated.

## 9. Internal AI Integration

Node.js may call a private Python endpoint for demand prediction. This endpoint should not be directly accessible to mobile users.

The request should contain only the validated features needed for prediction. The response should include product identifiers, suggested quantities, explanations, and model version.

## 10. API Validation and Security

- Validate request bodies and query parameters.
- Apply pagination and request-size limits.
- Rate-limit expensive endpoints.
- Verify authentication and resource ownership.
- Never trust user IDs from client payloads.
- Use transactions for related database changes.
- Log request IDs and operational errors without logging credentials.
- Do not expose stack traces or internal secrets in responses.

## 11. API Testing Requirements

Test successful operations, invalid inputs, missing authentication, invalid tokens, forbidden access, missing resources, database errors, and Python-service failures.
