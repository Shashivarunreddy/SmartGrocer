import { ENV } from "../config/env";
import { prisma } from "../config/prisma";

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

export interface ExtractedReceiptItem {
  rawName: string;
  matchedProductId: string | null;
  matchedProductName: string | null;
  category: string;
  quantity: number;
  unitPriceGbp: number;
  totalPriceGbp: number;
  confidence: number;
}

export interface ReceiptScanResult {
  storeName: string;
  transactionDate: string;
  totalGbp: number;
  items: ExtractedReceiptItem[];
  matchedCatalogueCount: number;
  source: "GEMINI_VISION" | "DEMO_UK_RECEIPT_SIMULATOR";
}

class GeminiService {
  private apiKey = ENV.GEMINI_API_KEY;

  /**
   * Generates Zero-Waste Recipes using Gemini Flash or UK grocery heuristic fallback.
   */
  async generateRecipes(
    pantryItems: Array<{
      productId: string;
      name: string;
      category: string;
      quantity: number;
      unit: string;
      expiryDate?: Date | null;
    }>,
    dietaryPreferences: string[] = [],
    householdSize: number = 2
  ): Promise<{ recipes: RecipeItem[]; source: string; summary: string }> {
    const expiringSoon = pantryItems.filter((item) => {
      if (!item.expiryDate) return false;
      const days = (new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return days <= 4;
    });

    if (this.apiKey && this.apiKey.trim().length > 10) {
      try {
        const geminiResult = await this.callGeminiForRecipes(pantryItems, expiringSoon, dietaryPreferences, householdSize);
        if (geminiResult && geminiResult.length > 0) {
          return {
            recipes: geminiResult,
            source: "GEMINI_AI",
            summary: `Chef Gemini generated ${geminiResult.length} zero-waste meals using your actual pantry stock.`,
          };
        }
      } catch (err: any) {
        console.warn("[GeminiService] Recipe call failed, using fallback:", err.message);
      }
    }

    // Heuristic Fallback
    const fallbackRecipes = this.generateHeuristicRecipes(pantryItems, expiringSoon, householdSize);
    return {
      recipes: fallbackRecipes,
      source: "CURATED_UK_PANTRY_HEURISTIC",
      summary: `Prepared ${fallbackRecipes.length} UK pantry recipes prioritizing ${expiringSoon.length} item(s) expiring soon.`,
    };
  }

  /**
   * Scans a supermarket receipt image using Gemini 1.5/2.5 Flash Vision.
   */
  async scanReceipt(base64Image: string, mimeType: string = "image/jpeg"): Promise<ReceiptScanResult> {
    // If Gemini key is available, use multimodal vision
    if (this.apiKey && this.apiKey.trim().length > 10 && base64Image && base64Image.length > 50) {
      try {
        const visionResult = await this.callGeminiVisionForReceipt(base64Image, mimeType);
        if (visionResult) {
          return await this.matchReceiptWithCatalogue(visionResult);
        }
      } catch (err: any) {
        console.warn("[GeminiService] Vision OCR failed, using catalogue simulator:", err.message);
      }
    }

    // Simulation / Demo Mode when no camera photo or no key
    return this.generateSimulatedReceipt();
  }

  private async callGeminiForRecipes(
    pantryItems: any[],
    expiring: any[],
    dietary: string[],
    householdSize: number
  ): Promise<RecipeItem[]> {
    const pantryStr = pantryItems.map((p) => `${p.name} (${p.quantity} ${p.unit})`).join(", ");
    const expiringStr = expiring.map((p) => p.name).join(", ") || "None";
    const dietStr = dietary.join(", ") || "None";

    const prompt = `You are SmartGrocer's Zero-Waste Chef in the UK.
Household pantry inventory: [${pantryStr}]
Items expiring soon (PRIORITIZE THESE TO AVOID WASTE): [${expiringStr}]
Household Size: ${householdSize}
Dietary Restrictions: ${dietStr}

Suggest 3 realistic, British household meals.
Respond ONLY with a valid JSON array of recipes matching this structure:
[
  {
    "id": "rec-1",
    "title": "Recipe Title",
    "description": "Appetizing 1-sentence description",
    "prepTimeMinutes": 20,
    "difficulty": "EASY",
    "cuisine": "British",
    "servings": ${householdSize},
    "usedPantryItems": [
      { "name": "Ingredient Name", "quantity": "amount", "isFromPantry": true }
    ],
    "missingIngredients": [
      { "name": "Missing item", "estimatedPriceGbp": 1.50, "suggestedCategory": "Groceries" }
    ],
    "instructions": ["Step 1", "Step 2", "Step 3"],
    "chefTip": "Helpful cooking or zero-waste tip",
    "wasteReductionScore": 90
  }
]`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return [];

    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : parsed.recipes || [];
  }

  private async callGeminiVisionForReceipt(base64Data: string, mimeType: string): Promise<any> {
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `You are a high-accuracy supermarket receipt scanner for UK supermarkets (Tesco, Sainsbury's, Asda, M&S, Morrisons, Aldi, Lidl).
Examine this receipt image carefully.
Extract:
- storeName (e.g. Tesco Express, Sainsbury's Local)
- transactionDate (YYYY-MM-DD or estimated)
- totalGbp (number)
- items: array of line items with:
    - rawName: text on receipt (e.g. "TESCO SEMI SKIM MILK 2.27L", "HOVIS WHOLEMEAL 800G")
    - quantity: number
    - unitPriceGbp: number
    - totalPriceGbp: number
    - category: "Dairies" | "Breads" | "Beverages" | "Snacks" | "Breakfast" | "Spreads" | "Groceries"

Return ONLY a valid JSON object matching:
{
  "storeName": "Tesco",
  "transactionDate": "2026-10-29",
  "totalGbp": 14.50,
  "items": [
    { "rawName": "...", "quantity": 1, "unitPriceGbp": 1.50, "totalPriceGbp": 1.50, "category": "Dairies" }
  ]
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType || "image/jpeg",
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini Vision error: ${response.status}`);
    }

    const json = (await response.json()) as any;
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? JSON.parse(text) : null;
  }

  /**
   * Matches raw receipt items against the 525 verified UK items in our PostgreSQL database.
   */
  private async matchReceiptWithCatalogue(extracted: any): Promise<ReceiptScanResult> {
    const allProducts = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, brands: true, category: true, defaultUnitPrice: true },
    });

    const items: ExtractedReceiptItem[] = [];
    let matchedCount = 0;

    for (const raw of extracted.items || []) {
      const searchTerms = raw.rawName.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      
      // Best fuzzy match based on brand or title keywords
      let bestMatch: any = null;
      let highestScore = 0;

      for (const p of allProducts) {
        let score = 0;
        const pNameLower = p.name.toLowerCase();
        const pBrandLower = (p.brands || "").toLowerCase();

        for (const word of searchTerms) {
          if (pNameLower.includes(word)) score += 3;
          if (pBrandLower.includes(word)) score += 4;
        }

        if (score > highestScore && score >= 3) {
          highestScore = score;
          bestMatch = p;
        }
      }

      if (bestMatch) matchedCount++;

      items.push({
        rawName: raw.rawName,
        matchedProductId: bestMatch ? bestMatch.id : null,
        matchedProductName: bestMatch ? bestMatch.name : null,
        category: raw.category || (bestMatch ? bestMatch.category : "Groceries"),
        quantity: raw.quantity || 1,
        unitPriceGbp: Number(raw.unitPriceGbp || (bestMatch ? bestMatch.defaultUnitPrice : 1.5)),
        totalPriceGbp: Number(raw.totalPriceGbp || raw.unitPriceGbp || 1.5),
        confidence: bestMatch ? 0.92 : 0.65,
      });
    }

    return {
      storeName: extracted.storeName || "UK Supermarket",
      transactionDate: extracted.transactionDate || new Date().toISOString().split("T")[0],
      totalGbp: Number(extracted.totalGbp || items.reduce((acc, i) => acc + i.totalPriceGbp, 0).toFixed(2)),
      items,
      matchedCatalogueCount: matchedCount,
      source: "GEMINI_VISION",
    };
  }

  /**
   * Provides realistic sample UK receipts for immediate testing in demo mode.
   */
  private async generateSimulatedReceipt(): Promise<ReceiptScanResult> {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      take: 4,
    });

    const items: ExtractedReceiptItem[] = products.map((p) => ({
      rawName: `${(p.brands || "UK").toUpperCase()} ${p.name.toUpperCase().slice(0, 22)}`,
      matchedProductId: p.id,
      matchedProductName: p.name,
      category: p.category,
      quantity: 1,
      unitPriceGbp: Number(p.defaultUnitPrice || 1.8),
      totalPriceGbp: Number(p.defaultUnitPrice || 1.8),
      confidence: 0.98,
    }));

    const total = items.reduce((sum, item) => sum + item.totalPriceGbp, 0);

    return {
      storeName: "Tesco Express - London Bridge",
      transactionDate: new Date().toISOString().split("T")[0],
      totalGbp: Number(total.toFixed(2)),
      items,
      matchedCatalogueCount: items.length,
      source: "DEMO_UK_RECEIPT_SIMULATOR",
    };
  }

  private generateHeuristicRecipes(pantryItems: any[], expiring: any[], householdSize: number): RecipeItem[] {
    const names = pantryItems.map((p) => p.name.toLowerCase());
    const hasBread = names.some((n) => n.includes("bread") || n.includes("sourdough"));
    const hasMarmalade = names.some((n) => n.includes("marmalade") || n.includes("jam"));
    const hasYogurt = names.some((n) => n.includes("yogurt") || n.includes("yoghurt"));
    const hasCheese = names.some((n) => n.includes("cheddar") || n.includes("cheese"));

    return [
      {
        id: "rec-artisan-toast",
        title: "Toasted Sourdough with Fine Cut Marmalade & Greek Yogurt",
        description: "Golden crispy toasted artisan bread spread with fine marmalade, served alongside chilled Greek yogurt.",
        prepTimeMinutes: 10,
        difficulty: "EASY",
        cuisine: "British Breakfast",
        servings: householdSize,
        usedPantryItems: [
          { name: "Artisan Sourdough", quantity: "2 thick slices", isFromPantry: hasBread },
          { name: "Orange Fine Cut Marmalade", quantity: "1 tbsp", isFromPantry: hasMarmalade },
          { name: "0% Fat Greek Style Yogurt", quantity: "120g", isFromPantry: hasYogurt },
        ],
        missingIngredients: hasYogurt
          ? []
          : [{ name: "Greek Style Yogurt", estimatedPriceGbp: 1.1, suggestedCategory: "Dairies" }],
        instructions: [
          "Toast the artisan bread slices until golden brown and crunchy at the edges.",
          "Spread a generous spoonful of marmalade across the hot toast.",
          "Spoon Greek yogurt into a small bowl and serve immediately.",
        ],
        chefTip: "Pair with an Earl Grey or English Breakfast tea for a traditional morning lift.",
        wasteReductionScore: 95,
      },
      {
        id: "rec-cheddar-toastie",
        title: "British Mature Cheddar & Tomato Grill",
        description: "Classic gooey cheddar melt toasted in a skillet until bubbling, golden, and satisfying.",
        prepTimeMinutes: 15,
        difficulty: "EASY",
        cuisine: "Comfort Food",
        servings: householdSize,
        usedPantryItems: [
          { name: "Sliced Bread", quantity: "4 slices", isFromPantry: hasBread },
          { name: "Mature Cheddar", quantity: "90g", isFromPantry: hasCheese },
        ],
        missingIngredients: [
          { name: "Fresh Vine Tomatoes", estimatedPriceGbp: 1.25, suggestedCategory: "Groceries" },
        ],
        instructions: [
          "Thinly slice the mature cheddar.",
          "Layer cheese and sliced tomatoes between bread slices.",
          "Toast in a skillet over medium heat for 3-4 minutes each side until cheese melts completely.",
        ],
        chefTip: "Covering the pan with a lid creates oven-like steam to melt cheese evenly without burning the crust.",
        wasteReductionScore: 88,
      },
      {
        id: "rec-pantry-porridge",
        title: "Creamy Scottish Rolled Oats Porridge",
        description: "Wholesome, slow-simmered porridge oats cooked in milk with honey.",
        prepTimeMinutes: 12,
        difficulty: "EASY",
        cuisine: "Scottish",
        servings: householdSize,
        usedPantryItems: [
          { name: "Rolled Oats", quantity: "80g", isFromPantry: true },
          { name: "Semi-Skimmed Milk", quantity: "300ml", isFromPantry: true },
        ],
        missingIngredients: [
          { name: "Pure Honey", estimatedPriceGbp: 1.8, suggestedCategory: "Spreads" },
        ],
        instructions: [
          "Stir oats and milk with a pinch of salt in a small saucepan.",
          "Simmer gently over medium heat for 4-5 minutes until smooth and thick.",
          "Drizzle with honey or golden syrup.",
        ],
        chefTip: "Using milk nearing its expiration date in cooked porridge avoids waste and tastes delicious.",
        wasteReductionScore: 92,
      },
    ];
  }
}

export const geminiService = new GeminiService();
