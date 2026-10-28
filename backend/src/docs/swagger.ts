export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "SmartGrocer Backend API",
    version: "1.0.0",
    description:
      "Comprehensive REST API documentation for SmartGrocer backend services including Products, Shopping Lists, Pantry Tracking, and Shopping Trips. Protected routes require a Clerk session Bearer token.",
    contact: {
      name: "SmartGrocer Engineering Team",
    },
  },
  servers: [
    {
      url: "/api/v1",
      description: "Current Server (Auto-detects IP/domain)",
    },
    {
      url: "http://localhost:5000/api/v1",
      description: "Local Development",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Clerk JWT authentication token. Header format: Bearer <token>",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          code: { type: "string", example: "NOT_FOUND" },
          message: { type: "string", example: "Resource not found." },
          details: { type: "object", nullable: true },
        },
        required: ["code", "message"],
      },
      Product: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          code: { type: "string", example: "3017620422003" },
          name: { type: "string", example: "Nutella Hazelnut Spread" },
          brands: { type: "string", example: "Ferrero" },
          category: { type: "string", example: "Breakfast Spreads" },
          categoriesTags: { type: "array", items: { type: "string" } },
          imageUrl: { type: "string", nullable: true },
          unit: { type: "string", example: "g" },
          productQuantity: { type: "number", example: 400 },
          defaultUnitPrice: { type: "number", example: 4.99 },
          currency: { type: "string", example: "GBP" },
          isFood: { type: "boolean", example: true },
          isActive: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      UserProfile: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          clerkUserId: { type: "string", example: "user_2aBcDeFgHiJkLmNo" },
          displayName: { type: "string", nullable: true },
          householdSize: { type: "integer", example: 2 },
          defaultBudget: { type: "number", example: 150.0 },
          currency: { type: "string", example: "GBP" },
          shoppingFrequencyDays: { type: "integer", example: 7 },
          dietaryPreferences: { type: "array", items: { type: "string" }, nullable: true },
          allergies: { type: "array", items: { type: "string" }, nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ShoppingList: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          name: { type: "string", example: "Weekly Grocery Run" },
          status: { type: "string", enum: ["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"], example: "ACTIVE" },
          budget: { type: "number", nullable: true, example: 75.0 },
          currency: { type: "string", example: "GBP" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/ListItem" },
          },
        },
      },
      ListItem: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          listId: { type: "string", format: "uuid" },
          productId: { type: "string", format: "uuid" },
          quantity: { type: "number", example: 2 },
          isPurchased: { type: "boolean", example: false },
          notes: { type: "string", nullable: true },
          product: { $ref: "#/components/schemas/Product" },
        },
      },
      PantryItem: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          productId: { type: "string", format: "uuid" },
          quantity: { type: "number", example: 1 },
          unit: { type: "string", nullable: true, example: "bottle" },
          expiryDate: { type: "string", format: "date-time", nullable: true },
          source: { type: "string", enum: ["MANUAL", "SHOPPING_LIST", "RECEIPT"], example: "MANUAL" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          product: { $ref: "#/components/schemas/Product" },
        },
      },
      ShoppingTrip: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          shoppingListId: { type: "string", format: "uuid", nullable: true },
          actualTotal: { type: "number", example: 45.99 },
          currency: { type: "string", example: "GBP" },
          tripDate: { type: "string", format: "date-time" },
          notes: { type: "string", nullable: true },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                tripId: { type: "string", format: "uuid" },
                productId: { type: "string", format: "uuid" },
                quantity: { type: "number", example: 1 },
                unitPrice: { type: "number", example: 4.99 },
                subtotal: { type: "number", example: 4.99 },
                product: { $ref: "#/components/schemas/Product" },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    { name: "Health", description: "API Health & Status checks" },
    { name: "Products", description: "Global product catalogue and barcode lookups" },
    { name: "Profile", description: "Authenticated user settings and preferences" },
    { name: "Shopping Lists", description: "Smart shopping lists, item management, and bill estimations" },
    { name: "Pantry", description: "User pantry inventory, stock levels, and expiry alerts" },
    { name: "Shopping Trips", description: "Completed shopping trips with transaction history and automatic pantry restocking" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Check API health and database status",
        responses: {
          200: {
            description: "API server is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "OK" },
                    timestamp: { type: "string", format: "date-time" },
                    uptime: { type: "number", example: 12.34 },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/products": {
      get: {
        tags: ["Products"],
        summary: "List catalog products with pagination and search",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
            description: "Page number (default: 1)",
          },
          {
            name: "pageSize",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 100 },
            description: "Number of products per page (max: 100)",
          },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Keyword search matching name, brand, category, or barcode",
          },
          {
            name: "category",
            in: "query",
            schema: { type: "string" },
            description: "Filter products by specific category",
          },
        ],
        responses: {
          200: {
            description: "Paginated product list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Product" },
                    },
                    meta: {
                      type: "object",
                      properties: {
                        page: { type: "integer" },
                        pageSize: { type: "integer" },
                        total: { type: "integer" },
                        totalPages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/products/{productId}": {
      get: {
        tags: ["Products"],
        summary: "Get single product details by ID",
        parameters: [
          {
            name: "productId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "UUID of the product",
          },
        ],
        responses: {
          200: {
            description: "Product details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/Product" },
                  },
                },
              },
            },
          },
          404: {
            description: "Product not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/profile": {
      get: {
        tags: ["Profile"],
        summary: "Get current authenticated user profile",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Profile information",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/UserProfile" },
                  },
                },
              },
            },
          },
          401: {
            description: "Unauthorized - Bearer token missing or invalid",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Profile"],
        summary: "Update current user profile and preferences",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  displayName: { type: "string", example: "John Doe" },
                  householdSize: { type: "integer", example: 3 },
                  defaultBudget: { type: "number", example: 200 },
                  currency: { type: "string", example: "GBP" },
                  shoppingFrequencyDays: { type: "integer", example: 7 },
                  dietaryPreferences: {
                    type: "array",
                    items: { type: "string" },
                    example: ["Vegetarian", "Gluten-Free"],
                  },
                  allergies: {
                    type: "array",
                    items: { type: "string" },
                    example: ["Peanuts"],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Updated profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/UserProfile" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/shopping-lists": {
      get: {
        tags: ["Shopping Lists"],
        summary: "Get all shopping lists for the current user",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "List of shopping lists",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ShoppingList" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Shopping Lists"],
        summary: "Create a new shopping list",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Sunday Groceries" },
                  budget: { type: "number", example: 60.0 },
                  currency: { type: "string", example: "GBP" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created shopping list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/ShoppingList" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/shopping-lists/{listId}": {
      get: {
        tags: ["Shopping Lists"],
        summary: "Get shopping list details with all items",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "listId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Shopping list with items",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/ShoppingList" },
                  },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Shopping Lists"],
        summary: "Update shopping list metadata",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "listId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  status: {
                    type: "string",
                    enum: ["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"],
                  },
                  budget: { type: "number" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Updated list",
          },
        },
      },
      delete: {
        tags: ["Shopping Lists"],
        summary: "Delete a shopping list",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "listId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "List successfully deleted",
          },
        },
      },
    },
    "/shopping-lists/{listId}/items": {
      post: {
        tags: ["Shopping Lists"],
        summary: "Add a product item to a shopping list",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "listId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["productId"],
                properties: {
                  productId: { type: "string", format: "uuid" },
                  quantity: { type: "number", default: 1 },
                  notes: { type: "string", example: "Organic only" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Item added to list",
          },
        },
      },
    },
    "/shopping-lists/{listId}/items/{itemId}": {
      patch: {
        tags: ["Shopping Lists"],
        summary: "Update item quantity, notes, or purchased status",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "listId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "itemId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  quantity: { type: "number" },
                  isPurchased: { type: "boolean" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Item updated",
          },
        },
      },
      delete: {
        tags: ["Shopping Lists"],
        summary: "Remove an item from a shopping list",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "listId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "itemId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Item removed",
          },
        },
      },
    },
    "/shopping-lists/{listId}/estimate": {
      post: {
        tags: ["Shopping Lists"],
        summary: "Calculate total estimated bill and budget comparison",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "listId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Estimated bill summary",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        estimatedTotal: { type: "number", example: 42.5 },
                        budget: { type: "number", example: 50.0 },
                        budgetVariance: { type: "number", example: 7.5 },
                        isOverBudget: { type: "boolean", example: false },
                        itemsCount: { type: "integer", example: 6 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/pantry": {
      get: {
        tags: ["Pantry"],
        summary: "List all pantry inventory items for current user",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Pantry inventory items",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/PantryItem" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Pantry"],
        summary: "Add an item to the pantry",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["productId"],
                properties: {
                  productId: { type: "string", format: "uuid" },
                  quantity: { type: "number", default: 1 },
                  unit: { type: "string", example: "pack" },
                  expiryDate: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Pantry item created",
          },
        },
      },
    },
    "/pantry/expiring": {
      get: {
        tags: ["Pantry"],
        summary: "Get pantry items that are expiring soon (next 7 days)",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "List of items expiring soon",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/PantryItem" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/pantry/{pantryItemId}": {
      patch: {
        tags: ["Pantry"],
        summary: "Update pantry item quantity or expiry date",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "pantryItemId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  quantity: { type: "number", example: 0.5 },
                  expiryDate: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Pantry item updated",
          },
        },
      },
      delete: {
        tags: ["Pantry"],
        summary: "Delete an item from pantry",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "pantryItemId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Pantry item deleted",
          },
        },
      },
    },
    "/shopping-trips": {
      get: {
        tags: ["Shopping Trips"],
        summary: "List historical shopping trips",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Shopping trip history",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ShoppingTrip" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Shopping Trips"],
        summary: "Record a completed shopping trip and optionally restock pantry",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["items"],
                properties: {
                  shoppingListId: { type: "string", format: "uuid" },
                  notes: { type: "string", example: "Trip to Trader Joe's" },
                  updatePantry: { type: "boolean", default: true },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["productId", "quantity", "unitPrice"],
                      properties: {
                        productId: { type: "string", format: "uuid" },
                        quantity: { type: "number", example: 2 },
                        unitPrice: { type: "number", example: 3.49 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Shopping trip recorded",
          },
        },
      },
    },
    "/shopping-trips/{tripId}": {
      get: {
        tags: ["Shopping Trips"],
        summary: "Get specific shopping trip details with line items",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "tripId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Shopping trip details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/ShoppingTrip" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/recommendations/replenishments": {
      get: {
        tags: ["Recommendations"],
        summary: "Predict grocery items needing replenishment (FastAPI AI microservice with fallback)",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Replenishment recommendations",
          },
        },
      },
    },
    "/recommendations/waste-risk": {
      get: {
        tags: ["Recommendations"],
        summary: "Predict pantry items at risk of spoiling before consumption",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Waste risk analysis",
          },
        },
      },
    },
    "/recommendations/alternatives/{listId}": {
      get: {
        tags: ["Recommendations"],
        summary: "Find cheaper product substitutions for an active shopping list",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "listId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Cheaper alternative suggestions",
          },
        },
      },
    },
  },
};
