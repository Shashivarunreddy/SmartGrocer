# SmartGrocer — Database Schema Specification

## 1. Database Technology

- Database: PostgreSQL
- ORM: Prisma
- Primary identifiers: UUIDs for internal application records
- Authentication identity: Clerk user ID
- Currency: ISO currency code, initially INR
- Monetary values: use PostgreSQL Decimal or integer minor units, never floating-point arithmetic
- Timestamps: store consistently in UTC and display in the user's local timezone

## 2. Entity: UserProfile

Purpose: Store application-specific information for each Clerk user.

Fields:
- id: UUID, primary key
- clerkUserId: string, unique, required
- displayName: optional string
- householdSize: positive integer
- defaultBudget: optional monetary value
- currency: string, default INR
- shoppingFrequencyDays: optional positive integer
- dietaryPreferences: optional structured data
- allergies: optional structured data
- createdAt: timestamp
- updatedAt: timestamp

Relationships:
- One profile has many shopping lists.
- One profile has many pantry items.
- One profile has many shopping trips.
- One profile has many consumption records.

Clerk manages credentials; do not store user passwords in this table.

## 3. Entity: Product

Purpose: Maintain the grocery catalogue.

Fields:
- id: UUID, primary key
- name: required string
- description: optional text
- category: required string or category reference
- unit: required string, such as kg, g, litre, piece, or pack
- defaultUnitPrice: monetary value
- currency: ISO currency code
- isFood: boolean
- isActive: boolean
- createdAt: timestamp
- updatedAt: timestamp

Rules:
- Product prices must be non-negative.
- Units must be consistent when calculating quantities.
- Deactivated products should not appear in new shopping recommendations.
- Keep product descriptions optional; not every grocery requires a recipe description.

Future extension: introduce stores and store-specific prices if comparisons between shops are required.

## 4. Entity: ShoppingList

Purpose: Represent a user's planned shopping trip.

Fields:
- id: UUID, primary key
- userId: foreign key to UserProfile
- name: string
- status: DRAFT, ACTIVE, COMPLETED, or ARCHIVED
- budget: optional monetary value
- currency: ISO currency code
- householdSizeSnapshot: integer
- createdAt: timestamp
- updatedAt: timestamp
- completedAt: optional timestamp

Relationships:
- One shopping list has many ShoppingListItems.
- A list belongs to one user.

The household size snapshot records the value used when the list was created.

## 5. Entity: ShoppingListItem

Purpose: Store the products and quantities in a planned list.

Fields:
- id: UUID, primary key
- shoppingListId: foreign key to ShoppingList
- productId: foreign key to Product
- quantity: positive decimal
- unitPriceSnapshot: monetary value
- isPurchased: boolean
- notes: optional string
- createdAt: timestamp
- updatedAt: timestamp

Rules:
- The estimated line total is quantity multiplied by the stored unit price, using consistent monetary rounding.
- The price snapshot prevents later catalogue price changes from rewriting the historical estimate.
- Actual purchased quantity and price must be stored in the shopping-trip records.

## 6. Entity: PantryItem

Purpose: Track groceries currently available at home.

Fields:
- id: UUID, primary key
- userId: foreign key to UserProfile
- productId: foreign key to Product
- quantity: non-negative decimal
- unit: string
- purchasedAt: optional timestamp
- expiryDate: optional date
- source: MANUAL, SHOPPING_LIST, or RECEIPT
- createdAt: timestamp
- updatedAt: timestamp

Rules:
- Allow users to update stock or mark an item as consumed.
- Do not assume that stock is still available simply because a purchase exists in history.
- Expiry dates may be unknown.
- Handle multiple batches of the same product separately when expiry dates differ.

## 7. Entity: ShoppingTrip

Purpose: Record completed shopping trips and actual spending.

Fields:
- id: UUID, primary key
- userId: foreign key to UserProfile
- shoppingListId: optional foreign key to ShoppingList
- purchasedAt: timestamp
- actualTotal: monetary value
- currency: ISO currency code
- notes: optional string
- createdAt: timestamp

Relationships:
- One trip has many ShoppingTripItems.

## 8. Entity: ShoppingTripItem

Purpose: Record what the user actually purchased.

Fields:
- id: UUID, primary key
- shoppingTripId: foreign key to ShoppingTrip
- productId: foreign key to Product
- quantity: positive decimal
- unitPrice: monetary value
- lineTotal: monetary value
- createdAt: timestamp

Rules:
- Preserve actual prices separately from estimated prices.
- Recalculate and validate totals on the server.
- Completing a trip and updating pantry stock should be handled in a database transaction.

## 9. Entity: ConsumptionLog

Purpose: Collect data for future consumption and demand prediction.

Fields:
- id: UUID, primary key
- userId: foreign key to UserProfile
- productId: foreign key to Product
- pantryItemId: optional foreign key to PantryItem
- quantityConsumed: positive decimal
- quantityWasted: optional non-negative decimal
- loggedAt: timestamp
- reason: optional string

This entity is introduced when the application begins collecting consumption and waste information.

## 10. Entity: RecommendationLog

Purpose: Evaluate whether recommendations are useful.

Fields:
- id: UUID, primary key
- userId: foreign key to UserProfile
- productId: foreign key to Product
- recommendationType: string
- suggestedQuantity: optional decimal
- reason: string
- source: RULE_BASED or ML
- modelVersion: optional string
- outcome: optional string, such as ACCEPTED, EDITED, or DISMISSED
- createdAt: timestamp

Avoid storing unnecessary sensitive data in recommendation logs.

## 11. Relationships

- UserProfile → ShoppingList: one-to-many
- ShoppingList → ShoppingListItem: one-to-many
- Product → ShoppingListItem: one-to-many
- UserProfile → PantryItem: one-to-many
- Product → PantryItem: one-to-many
- UserProfile → ShoppingTrip: one-to-many
- ShoppingTrip → ShoppingTripItem: one-to-many
- Product → ShoppingTripItem: one-to-many
- UserProfile → ConsumptionLog: one-to-many
- UserProfile → RecommendationLog: one-to-many

## 12. Indexes and Constraints

- Unique index on UserProfile.clerkUserId.
- Index on product name and category for catalogue search.
- Index on user ownership fields.
- Index on shopping-list status and creation date.
- Index on pantry expiry date and product ID.
- Index on shopping-trip purchase date.
- Foreign-key constraints on all relationships.
- Check constraints for valid quantities, household size, and prices where supported.
- Use deliberate deletion rules so historical purchase records are not accidentally removed.

## 13. Migration Strategy

1. Create the initial profile and product tables.
2. Add shopping lists and list items.
3. Add pantry tracking.
4. Add shopping trips and purchase records.
5. Add consumption and recommendation logs when required.
6. Apply changes through Prisma migrations.
7. Seed a development product catalogue.
8. Test database constraints and cross-user isolation.

Never modify the production database schema manually without a tracked migration.
