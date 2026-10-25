# SmartGrocer — Mobile Application Specification

## 1. Technology

- React Native
- Expo
- TypeScript
- Expo Router
- Clerk authentication
- REST API client
- PostgreSQL access exclusively through the backend

NativeWind may be used for styling, but the project should maintain consistent design tokens and reusable UI components.

## 2. Screens

### Screen 1: Welcome and Authentication
Purpose: Allow users to register, sign in, or resume an authenticated session.

### Screen 2: Onboarding
Collect:
- Household size.
- Preferred budget.
- Currency.
- Shopping frequency.
- Dietary preferences and relevant allergies.

Users should be able to change these settings later.

### Screen 3: Home
Display:
- Current shopping list.
- Estimated bill.
- Remaining budget.
- Quick access to pantry and history.
- Relevant replenishment suggestions.

### Screen 4: Grocery Catalogue
Provide:
- Product search.
- Categories.
- Product name and price.
- Unit information.
- Add-to-list actions.
- Food descriptions where useful.

### Screen 5: Shopping List
Users can:
- Add and remove products.
- Change quantities.
- See line totals.
- See the estimated bill.
- Compare the estimate with their budget.
- Review cheaper alternatives.

### Screen 6: Pantry
Display:
- Existing grocery items.
- Available quantities.
- Optional expiry dates.
- Items expiring soon.
- Actions to update stock or mark items as consumed.

### Screen 7: Replenishment Review
Display previously purchased products and ask users to confirm whether each item remains at home.

The system should use confirmed stock to determine which products need replenishment.

### Screen 8: Shopping Completion
Allow users to confirm:
- Actual products purchased.
- Actual quantities.
- Actual prices.
- Total spending.

Save the completed trip to the backend.

### Screen 9: Shopping History
Show previous shopping trips, dates, purchased items, and recorded spending.

### Screen 10: Recipes
Display suggested meals based on available ingredients, along with preparation descriptions and missing ingredients.

### Screen 11: Analytics
Show spending trends, budget adherence, and recorded waste metrics.

### Screen 12: Profile and Settings
Allow users to update household details, budget, preferences, and account settings.

## 3. Navigation

Use Expo Router for screen navigation.

Unauthenticated users should see authentication and onboarding routes as appropriate. Authenticated users should access the main application screens.

Navigation must not be treated as the security boundary. The backend must enforce authorization.

## 4. UI Requirements

- Use a simple grocery-shopping layout familiar to mobile users.
- Keep the estimated bill visible while editing a shopping list.
- Clearly distinguish estimates from actual spending.
- Make quantity editing straightforward.
- Show why a product is recommended.
- Provide loading indicators and actionable error messages.
- Support empty states for users with no pantry items or purchase history.
- Make expiry warnings understandable without being intrusive.
- Allow recommendations to be edited, dismissed, or ignored.

## 5. API Integration

Create a shared API client that:
- Uses the configured backend URL.
- Retrieves a current Clerk session token.
- Sends authenticated requests.
- Parses JSON responses.
- Handles expired authentication and API errors.
- Avoids duplicating request logic across screens.

For physical-device testing, configure an API URL reachable from the device. `localhost` on a phone refers to the phone itself, not the development computer.

## 6. Local State and Persistence

Use local component state or a suitable state-management library for temporary UI state.

The backend remains the source of truth for saved shopping lists, prices, pantry records, and shopping history.

Offline support can be introduced later. If drafts are stored locally, implement a clear synchronisation and conflict-resolution policy.

## 7. Mobile Acceptance Criteria

The mobile app must allow a user to complete the entire primary journey: sign in, set household details, create a list, estimate its bill, confirm pantry stock, complete a trip, and review purchase history.
