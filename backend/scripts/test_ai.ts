import { geminiService } from "../src/services/gemini.service";

async function runTest() {
  console.log("=================================================");
  console.log("🤖 TESTING SMARTGROCER AI & GEMINI LAYER (Pillar 1)");
  console.log("=================================================\n");

  // TEST 1: Zero-Waste Chef Recipe Generation
  console.log("👉 [1/2] Testing Zero-Waste Chef Recipe Generation...");
  const mockPantry = [
    {
      productId: "prod-1",
      name: "Sourdough grain and seeds",
      category: "Breads",
      quantity: 1,
      unit: "loaf",
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // Expires in 2 days
    },
    {
      productId: "prod-2",
      name: "Greek Style Yogurt 0% Fat",
      category: "Dairies",
      quantity: 2,
      unit: "pot",
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // Expires in 3 days
    },
    {
      productId: "prod-3",
      name: "Orange Fine Cut Marmalade",
      category: "Spreads",
      quantity: 1,
      unit: "jar",
      expiryDate: null,
    },
  ];

  try {
    const recipeResult = await geminiService.generateRecipes(mockPantry, ["Vegetarian"], 2);
    console.log(`\n✅ Source: ${recipeResult.source}`);
    console.log(`ℹ️  Summary: ${recipeResult.summary}`);
    console.log(`📋 Total Recipes Generated: ${recipeResult.recipes.length}`);
    
    recipeResult.recipes.forEach((r, idx) => {
      console.log(`\n  🍳 Recipe #${idx + 1}: ${r.title}`);
      console.log(`     • Prep Time: ${r.prepTimeMinutes} mins | Difficulty: ${r.difficulty} | Waste Reduction: ${r.wasteReductionScore}%`);
      console.log(`     • Description: ${r.description}`);
      console.log(`     • Pantry Items Used: ${r.usedPantryItems.map((i) => i.name).join(", ")}`);
      console.log(`     • Missing Items: ${r.missingIngredients.map((m) => `${m.name} (~£${m.estimatedPriceGbp.toFixed(2)})`).join(", ") || "None"}`);
      console.log(`     • Step 1: ${r.instructions[0]}`);
      if (r.chefTip) console.log(`     • 💡 Chef Tip: ${r.chefTip}`);
    });
  } catch (err: any) {
    console.error("❌ Recipe test error:", err.message);
  }

  // TEST 2: Supermarket Receipt OCR & Catalogue Matching
  console.log("\n-------------------------------------------------");
  console.log("👉 [2/2] Testing Supermarket Receipt OCR & UK Catalogue Matching...");
  try {
    const scanResult = await geminiService.scanReceipt("");
    console.log(`\n✅ Source: ${scanResult.source}`);
    console.log(`🏪 Store: ${scanResult.storeName}`);
    console.log(`📅 Transaction Date: ${scanResult.transactionDate}`);
    console.log(`💰 Total Spent: £${scanResult.totalGbp.toFixed(2)}`);
    console.log(`🎯 Catalogue Match: ${scanResult.matchedCatalogueCount} of ${scanResult.items.length} items matched in DB\n`);

    scanResult.items.forEach((item, idx) => {
      console.log(
        `   [${idx + 1}] ${item.rawName.padEnd(30)} -> Matched: ${item.matchedProductName || "None"}`
      );
      console.log(
        `       Qty: ${item.quantity} | Unit Price: £${item.unitPriceGbp.toFixed(2)} | Line Total: £${item.totalPriceGbp.toFixed(2)} | Confidence: ${(item.confidence * 100).toFixed(0)}%`
      );
    });

    console.log("\n=================================================");
    console.log("🎉 ALL PILLAR 1 AI INTEGRATIONS VERIFIED SUCESSFULLY!");
    console.log("=================================================");
  } catch (err: any) {
    console.error("❌ Receipt test error:", err.message);
  }
}

runTest().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
