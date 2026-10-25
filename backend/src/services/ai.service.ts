import { prisma } from "../config/prisma";
import { ENV } from "../config/env";

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

class AIService {
  private baseUrl = `${ENV.PYTHON_SERVICE_URL}/api/v1`;

  /**
   * Predicts grocery replenishment demand via Python FastAPI with local heuristic fallback.
   */
  async getReplenishmentPredictions(userId: string): Promise<{
    source: "AI_SERVICE" | "RULE_BASED_FALLBACK";
    replenishments: ReplenishmentItem[];
    modelVersion: string;
  }> {
    const [profile, pantryItems, pastTrips, catalogue] = await Promise.all([
      prisma.userProfile.findUnique({ where: { id: userId } }),
      prisma.pantryItem.findMany({
        where: { userId },
        include: { product: true },
      }),
      prisma.shoppingTrip.findMany({
        where: { userId },
        include: { items: { include: { product: true } } },
        orderBy: { purchasedAt: "desc" },
        take: 5,
      }),
      prisma.product.findMany({ where: { isActive: true }, take: 100 }),
    ]);

    const productMap = new Map(catalogue.map((p) => [p.id, p]));

    // Construct purchase history
    const historyPayload: any[] = [];
    const now = Date.now();
    for (const trip of pastTrips) {
      const daysAgo = Math.max(0, (now - new Date(trip.purchasedAt).getTime()) / (1000 * 60 * 60 * 24));
      for (const item of trip.items) {
        historyPayload.push({
          product_id: item.productId,
          name: item.product.name,
          category: item.product.category,
          quantity: Number(item.quantity),
          unit: item.product.unit || "unit",
          days_ago: Number(daysAgo.toFixed(1)),
        });
      }
    }

    // Construct pantry payload
    const pantryPayload = pantryItems.map((p) => {
      let expiryDays: number | null = null;
      if (p.expiryDate) {
        expiryDays = (new Date(p.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24);
      }
      return {
        product_id: p.productId,
        name: p.product.name,
        category: p.product.category,
        quantity: Number(p.quantity),
        unit: p.unit || p.product.unit || "unit",
        days_since_purchase: null,
        expiry_days_left: expiryDays !== null ? Number(expiryDays.toFixed(1)) : null,
      };
    });

    const requestPayload = {
      household_size: profile?.householdSize || 2,
      shopping_frequency_days: profile?.shoppingFrequencyDays || 7,
      pantry_items: pantryPayload,
      purchase_history: historyPayload,
      target_budget: profile?.defaultBudget ? Number(profile.defaultBudget) : 75,
    };

    try {
      const response = await fetch(`${this.baseUrl}/predict/replenishment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(3000), // 3-second resilient timeout
      });

      if (response.ok) {
        const result = (await response.json()) as any;
        const enriched = (result.replenishments || []).map((r: any) => {
          const prod = productMap.get(r.product_id);
          return {
            productId: r.product_id,
            productName: r.product_name,
            category: r.category,
            suggestedQuantity: r.suggested_quantity,
            unit: r.unit,
            estimatedDaysUntilDepleted: r.estimated_days_until_depleted,
            urgency: r.urgency,
            confidenceScore: r.confidence_score,
            reason: r.reason,
            imageUrl: prod?.imageUrl || null,
            defaultUnitPrice: prod ? Number(prod.defaultUnitPrice) : 1.99,
          };
        });

        return {
          source: "AI_SERVICE",
          replenishments: enriched,
          modelVersion: result.model_version || "demand-v1.0.0",
        };
      }
    } catch {
      // Fall through to resilient rule-based calculation
    }

    // --- FALLBACK HEURISTIC (Runs if Python service is unreachable) ---
    const household = profile?.householdSize || 2;
    const fallbackReplenishments: ReplenishmentItem[] = [];

    // Check low pantry items
    for (const p of pantryItems) {
      if (Number(p.quantity) <= 1.0) {
        fallbackReplenishments.push({
          productId: p.productId,
          productName: p.product.name,
          category: p.product.category,
          suggestedQuantity: Math.ceil(household * 1.5),
          unit: p.unit || p.product.unit || "unit",
          estimatedDaysUntilDepleted: 1.5,
          urgency: "HIGH",
          confidenceScore: 0.65,
          reason: `Pantry stock is low (${p.quantity} remaining). Replenishment suggested for household of ${household}.`,
          imageUrl: p.product.imageUrl,
          defaultUnitPrice: Number(p.product.defaultUnitPrice),
        });
      }
    }

    // If pantry is empty or sparse, recommend popular household staples
    if (fallbackReplenishments.length === 0) {
      const staples = catalogue.slice(0, 4);
      for (const s of staples) {
        fallbackReplenishments.push({
          productId: s.id,
          productName: s.name,
          category: s.category,
          suggestedQuantity: 1,
          unit: s.unit,
          estimatedDaysUntilDepleted: 3.0,
          urgency: "MEDIUM",
          confidenceScore: 0.55,
          reason: `Recommended staple replenishment for weekly household grocery run.`,
          imageUrl: s.imageUrl,
          defaultUnitPrice: Number(s.defaultUnitPrice),
        });
      }
    }

    return {
      source: "RULE_BASED_FALLBACK",
      replenishments: fallbackReplenishments,
      modelVersion: "rule-fallback-v1.0",
    };
  }

  /**
   * Analyzes food waste and spoilage risk via Python FastAPI with fallback.
   */
  async getWasteRiskAnalysis(userId: string): Promise<{
    source: "AI_SERVICE" | "RULE_BASED_FALLBACK";
    atRiskItems: WasteRiskItem[];
    summary: string;
  }> {
    const [profile, pantryItems] = await Promise.all([
      prisma.userProfile.findUnique({ where: { id: userId } }),
      prisma.pantryItem.findMany({
        where: { userId },
        include: { product: true },
      }),
    ]);

    const now = Date.now();
    const itemsPayload: any[] = [];
    for (const p of pantryItems) {
      if (p.expiryDate) {
        const daysLeft = (new Date(p.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24);
        itemsPayload.push({
          product_id: p.productId,
          name: p.product.name,
          category: p.product.category,
          quantity: Number(p.quantity),
          unit: p.unit || p.product.unit || "unit",
          expiry_days_left: Number(daysLeft.toFixed(1)),
        });
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/predict/waste-risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          household_size: profile?.householdSize || 2,
          items: itemsPayload,
        }),
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const result = (await response.json()) as any;
        const enriched = (result.at_risk_items || []).map((i: any) => {
          const match = pantryItems.find((p) => p.productId === i.product_id);
          return {
            productId: i.product_id,
            productName: i.product_name,
            quantity: i.quantity,
            unit: i.unit,
            daysUntilExpiry: i.days_until_expiry,
            estimatedDaysToConsume: i.estimated_days_to_consume,
            riskLevel: i.risk_level,
            potentialWasteQuantity: i.potential_waste_quantity,
            suggestedAction: i.suggested_action,
            imageUrl: match?.product.imageUrl || null,
          };
        });

        return {
          source: "AI_SERVICE",
          atRiskItems: enriched,
          summary: result.summary,
        };
      }
    } catch {
      // Fallback
    }

    // Fallback: Items expiring in <= 3 days
    const fallbackRisk: WasteRiskItem[] = [];
    for (const p of pantryItems) {
      if (p.expiryDate) {
        const daysLeft = (new Date(p.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24);
        if (daysLeft <= 3.0) {
          fallbackRisk.push({
            productId: p.productId,
            productName: p.product.name,
            quantity: Number(p.quantity),
            unit: p.unit || p.product.unit || "unit",
            daysUntilExpiry: Number(daysLeft.toFixed(1)),
            estimatedDaysToConsume: 4.0,
            riskLevel: daysLeft <= 1.0 ? "CRITICAL" : "HIGH",
            potentialWasteQuantity: Number(p.quantity),
            suggestedAction: "Consume soon or freeze before expiry date.",
            imageUrl: p.product.imageUrl,
          });
        }
      }
    }

    return {
      source: "RULE_BASED_FALLBACK",
      atRiskItems: fallbackRisk,
      summary: `${fallbackRisk.length} items nearing expiry.`,
    };
  }

  /**
   * Finds cheaper product alternatives for a shopping list.
   */
  async getAlternativesForList(listId: string): Promise<{
    source: "AI_SERVICE" | "RULE_BASED_FALLBACK";
    potentialTotalSavings: number;
    substitutions: AlternativeItem[];
    summary: string;
  }> {
    const [list, catalogue] = await Promise.all([
      prisma.shoppingList.findUnique({
        where: { id: listId },
        include: { items: { include: { product: true } } },
      }),
      prisma.product.findMany({ where: { isActive: true } }),
    ]);

    if (!list || list.items.length === 0) {
      return {
        source: "RULE_BASED_FALLBACK",
        potentialTotalSavings: 0,
        substitutions: [],
        summary: "No items in basket to analyze.",
      };
    }

    const basketItems = list.items.map((i) => ({
      product_id: i.productId,
      name: i.product.name,
      category: i.product.category,
      default_unit_price: Number(i.unitPriceSnapshot || i.product.defaultUnitPrice),
      quantity: Number(i.quantity),
    }));

    const cataloguePayload = catalogue.map((c) => ({
      product_id: c.id,
      name: c.name,
      brands: c.brands,
      category: c.category,
      default_unit_price: Number(c.defaultUnitPrice),
      unit: c.unit,
    }));

    try {
      const response = await fetch(`${this.baseUrl}/optimize/alternatives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basket_items: basketItems,
          catalogue: cataloguePayload,
          target_budget: list.budget ? Number(list.budget) : null,
        }),
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const result = (await response.json()) as any;
        const enriched = (result.substitutions || []).map((s: any) => {
          const match = catalogue.find((c) => c.id === s.suggested_product_id);
          return {
            originalProductId: s.original_product_id,
            originalProductName: s.original_product_name,
            originalPrice: s.original_price,
            suggestedProductId: s.suggested_product_id,
            suggestedProductName: s.suggested_product_name,
            suggestedPrice: s.suggested_price,
            estimatedSavings: s.estimated_savings,
            reason: s.reason,
            suggestedImageUrl: match?.imageUrl || null,
          };
        });

        return {
          source: "AI_SERVICE",
          potentialTotalSavings: result.potential_total_savings,
          substitutions: enriched,
          summary: result.summary,
        };
      }
    } catch {
      // Fallback
    }

    // Heuristic fallback: find cheapest in each category
    const substitutions: AlternativeItem[] = [];
    let totalSavings = 0;
    for (const b of basketItems) {
      const candidates = catalogue
        .filter((c) => c.category === b.category && c.id !== b.product_id && Number(c.defaultUnitPrice) < b.default_unit_price)
        .sort((a, b) => Number(a.defaultUnitPrice) - Number(b.defaultUnitPrice));

      if (candidates.length > 0) {
        const best = candidates[0];
        const saving = Number(((b.default_unit_price - Number(best.defaultUnitPrice)) * b.quantity).toFixed(2));
        if (saving >= 0.1) {
          totalSavings += saving;
          substitutions.push({
            originalProductId: b.product_id,
            originalProductName: b.name,
            originalPrice: b.default_unit_price,
            suggestedProductId: best.id,
            suggestedProductName: best.name,
            suggestedPrice: Number(best.defaultUnitPrice),
            estimatedSavings: saving,
            reason: `Save £${saving.toFixed(2)} with value alternative '${best.name}'.`,
            suggestedImageUrl: best.imageUrl,
          });
        }
      }
    }

    return {
      source: "RULE_BASED_FALLBACK",
      potentialTotalSavings: Number(totalSavings.toFixed(2)),
      substitutions,
      summary: `Found ${substitutions.length} alternative suggestions.`,
    };
  }
}

export const aiService = new AIService();
