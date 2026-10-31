import Constants from "expo-constants";
import { Platform } from "react-native";

function resolveApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("10.0.2.2")) {
    return envUrl;
  }
  return "http://65.0.242.245:5000/api/v1";
}

const API_BASE_URL = resolveApiBaseUrl();

let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  authTokenGetter = getter;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  brands: string;
  category: string;
  categoriesTags: string[];
  imageUrl: string | null;
  unit: string;
  productQuantity: number;
  defaultUnitPrice: number;
  currency: string;
  isFood: boolean;
  isActive: boolean;
}

export interface ListItem {
  id: string;
  listId: string;
  productId: string;
  quantity: number;
  isPurchased: boolean;
  notes?: string | null;
  product: Product;
}

export interface ShoppingList {
  id: string;
  userId: string;
  name: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  budget: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: ListItem[];
  _count?: { items: number };
}

export interface PantryItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  unit: string | null;
  expiryDate: string | null;
  source: "MANUAL" | "SHOPPING_LIST" | "RECEIPT";
  createdAt: string;
  updatedAt: string;
  product: Product;
}

export interface BillEstimate {
  estimatedTotal: number;
  budget: number | null;
  budgetVariance: number | null;
  isOverBudget: boolean;
  itemsCount: number;
}

export interface ReplenishmentItem {
  productId: string;
  productName: string;
  category: string;
  suggestedQuantity: number;
  unit: string;
  estimatedDaysUntilDepleted: number;
  urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidenceScore: number;
  reason: string;
  imageUrl?: string | null;
  defaultUnitPrice?: number;
}

export interface WasteRiskItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  daysUntilExpiry: number;
  estimatedDaysToConsume: number;
  riskLevel: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  potentialWasteQuantity: number;
  suggestedAction: string;
  imageUrl?: string | null;
}

export interface AlternativeItem {
  originalProductId: string;
  originalProductName: string;
  originalPrice: number;
  suggestedProductId: string;
  suggestedProductName: string;
  suggestedPrice: number;
  estimatedSavings: number;
  reason: string;
  suggestedImageUrl?: string | null;
}

export interface ShoppingTripItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: Product;
}

export interface ShoppingTripRecord {
  id: string;
  userId: string;
  shoppingListId: string | null;
  actualTotal: number;
  currency: string;
  notes: string | null;
  purchasedAt: string;
  items: ShoppingTripItem[];
}

export interface AnalyticsSummary {
  spending: {
    lifetimeSpendGbp: number;
    thisMonthSpendGbp: number;
    totalTripsCount: number;
    targetWeeklyBudgetGbp: number;
    budgetAdherenceRate: number;
    totalSavedUnderBudgetGbp: number;
    monthlyHistory: Array<{ month: string; total: number; tripCount: number }>;
    categoryDistribution: Array<{
      category: string;
      totalGbp: number;
      itemsCount: number;
      percentage: number;
    }>;
  };
  foodWaste: {
    wasteAvoidanceRate: number;
    totalQuantityConsumed: number;
    totalQuantityWasted: number;
    estimatedMoneySavedGbp: number;
    pantryTotalStockCount: number;
    expiringSoonCount: number;
  };
}


export interface RecipeItem {
  id: string;
  title: string;
  description: string;
  prepTimeMinutes: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  cuisine: string;
  servings: number;
  usedPantryItems: Array<{
    name: string;
    quantity: string;
    isFromPantry: boolean;
    productId?: string;
  }>;
  missingIngredients: Array<{
    name: string;
    estimatedPriceGbp: number;
    suggestedCategory: string;
    matchedProductId?: string;
  }>;
  instructions: string[];
  chefTip?: string;
  wasteReductionScore: number;
}

export interface ChatAssistantResponse {
  reply: string;
  suggestedProducts?: Array<{
    id: string;
    name: string;
    price: number;
    reason: string;
  }>;
}


async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (authTokenGetter) {
    try {
      const token = await authTokenGetter();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch {
      // Continue without token if guest or unauthenticated
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Health
  checkHealth: () => request<{ status: string; timestamp: string }>("/health"),

  // Products
  getProducts: (params?: { page?: number; pageSize?: number; search?: string; category?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.pageSize) query.append("pageSize", params.pageSize.toString());
    if (params?.search) query.append("search", params.search);
    if (params?.category && params.category !== "All") query.append("category", params.category);

    const queryString = query.toString();
    return request<{
      data: Product[];
      meta: { page: number; pageSize: number; total: number; totalPages: number };
    }>(`/products${queryString ? `?${queryString}` : ""}`);
  },

  getProductById: (productId: string) =>
    request<{ data: Product }>(`/products/${productId}`),

  // Profile
  getProfile: () => request<{ data: any }>("/profile"),
  updateProfile: (data: any) =>
    request<{ data: any }>("/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Shopping Lists
  getShoppingLists: () =>
    request<{ data: ShoppingList[] }>("/shopping-lists"),

  createShoppingList: (name: string, budget?: number, currency: string = "GBP") =>
    request<{ data: ShoppingList }>("/shopping-lists", {
      method: "POST",
      body: JSON.stringify({ name, budget, currency }),
    }),

  getShoppingList: (listId: string) =>
    request<{ data: ShoppingList }>(`/shopping-lists/${listId}`),

  updateShoppingList: (listId: string, data: Partial<ShoppingList>) =>
    request<{ data: ShoppingList }>(`/shopping-lists/${listId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteShoppingList: (listId: string) =>
    request<{ message: string }>(`/shopping-lists/${listId}`, {
      method: "DELETE",
    }),

  addItemToList: (listId: string, productId: string, quantity: number = 1, notes?: string) =>
    request<{ data: ListItem }>(`/shopping-lists/${listId}/items`, {
      method: "POST",
      body: JSON.stringify({ productId, quantity, notes }),
    }),

  updateListItem: (listId: string, itemId: string, data: { quantity?: number; isPurchased?: boolean; notes?: string }) =>
    request<{ data: ListItem }>(`/shopping-lists/${listId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteListItem: (listId: string, itemId: string) =>
    request<{ message: string }>(`/shopping-lists/${listId}/items/${itemId}`, {
      method: "DELETE",
    }),

  estimateBill: (listId: string) =>
    request<{ data: BillEstimate }>(`/shopping-lists/${listId}/estimate`, {
      method: "POST",
    }),

  // Pantry
  getPantryItems: () =>
    request<{ data: PantryItem[] }>("/pantry"),

  getExpiringPantryItems: () =>
    request<{ data: PantryItem[] }>("/pantry/expiring"),

  addPantryItem: (productId: string, quantity: number = 1, unit?: string, expiryDate?: string) =>
    request<{ data: PantryItem }>("/pantry", {
      method: "POST",
      body: JSON.stringify({ productId, quantity, unit, expiryDate }),
    }),

  updatePantryItem: (pantryItemId: string, data: { quantity?: number; expiryDate?: string | null }) =>
    request<{ data: PantryItem }>(`/pantry/${pantryItemId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deletePantryItem: (pantryItemId: string) =>
    request<{ message: string }>(`/pantry/${pantryItemId}`, {
      method: "DELETE",
    }),

  // Shopping Trips
  getShoppingTrips: () =>
    request<{ data: ShoppingTripRecord[]; meta?: any }>("/shopping-trips"),

  recordShoppingTrip: (data: {
    shoppingListId?: string;
    notes?: string;
    updatePantry?: boolean;
    items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  }) =>
    request<{ data: any }>("/shopping-trips", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // AI Recommendations
  getReplenishments: () =>
    request<{
      data: {
        source: "AI_SERVICE" | "RULE_BASED_FALLBACK";
        replenishments: ReplenishmentItem[];
        modelVersion: string;
      };
    }>("/recommendations/replenishments"),

  getWasteRisks: () =>
    request<{
      data: {
        source: "AI_SERVICE" | "RULE_BASED_FALLBACK";
        atRiskItems: WasteRiskItem[];
        summary: string;
      };
    }>("/recommendations/waste-risk"),

  getAlternatives: (listId: string) =>
    request<{
      data: {
        source: "AI_SERVICE" | "RULE_BASED_FALLBACK";
        potentialTotalSavings: number;
        substitutions: AlternativeItem[];
        summary: string;
      };
    }>(`/recommendations/alternatives/${listId}`),

  // Zero-Waste Chef Recipes (Gemini AI + Pantry)
  getRecipes: () =>
    request<{
      data: {
        recipes: RecipeItem[];
        source: string;
        summary: string;
      };
    }>("/recommendations/recipes"),

  // AI Grocery Assistant Chatbot (Gemini + Python Analysis)
  chatWithAssistant: (message: string) =>
    request<{
      data: ChatAssistantResponse;
    }>("/recommendations/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  // Spending & Food-Waste Analytics (Phase B)
  getAnalyticsSummary: () =>
    request<{ data: AnalyticsSummary }>("/analytics/summary"),

  logConsumption: (data: {
    productId: string;
    pantryItemId?: string;
    quantityConsumed: number;
    quantityWasted?: number;
    reason?: string;
  }) =>
    request<{ data: any; message: string }>("/analytics/consumption", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
