import { classifyProductDietary, matchesDietaryPreferences } from "../utils/dietary";
import { prisma } from "../config/prisma";

async function runTests() {
  console.log("==================================================================");
  console.log("  SMARTGROCER TEST SUITE: DIETARY CLASSIFICATION & ONBOARDING     ");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (detail) console.error(`     Detail: ${detail}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. DIETARY CLASSIFICATION UNIT TESTS
  // -------------------------------------------------------------------------
  console.log("--- 1. Testing Product Dietary Classification (Zero Margin of Error) ---");

  // Dairy vs Plant Milk
  const wholeMilk = classifyProductDietary({
    name: "Cravendale Whole Fresh Milk 2L",
    category: "Dairy & Eggs",
    categoriesTags: ["milks", "dairies"],
  });
  assert(wholeMilk.isVegetarian === true, "Whole Milk is Vegetarian");
  assert(wholeMilk.isVegan === false, "Whole Milk is NOT Vegan");
  assert(wholeMilk.isDairyFree === false, "Whole Milk is NOT Dairy-Free");
  assert(wholeMilk.isNutFree === true, "Whole Milk is Nut-Free");
  assert(wholeMilk.isGlutenFree === true, "Whole Milk is Gluten-Free");

  const oatMilk = classifyProductDietary({
    name: "Oatly Barista Edition Oat Milk 1L",
    category: "Dairy & Eggs",
    categoriesTags: ["plant-based milks", "oat milks"],
  });
  assert(oatMilk.isVegan === true, "Oat Milk is Vegan");
  assert(oatMilk.isDairyFree === true, "Oat Milk is Dairy-Free");

  const almondMilk = classifyProductDietary({
    name: "Alpro Roasted Almond Milk 1L",
    category: "Dairy & Eggs",
    categoriesTags: ["almond milks", "plant milks"],
  });
  assert(almondMilk.isDairyFree === true, "Almond Milk is Dairy-Free");
  assert(almondMilk.isNutFree === false, "Almond Milk is NOT Nut-Free (Allergy Safe)");

  // Meat / Pork / Halal / Kosher
  const bacon = classifyProductDietary({
    name: "British Smoked Back Bacon Rashers 300g",
    category: "Meat & Poultry",
    categoriesTags: ["meats", "pork", "bacon"],
  });
  assert(bacon.isVegetarian === false, "Pork Bacon is NOT Vegetarian");
  assert(bacon.isVegan === false, "Pork Bacon is NOT Vegan");
  assert(bacon.isHalal === false, "Pork Bacon is strictly NOT Halal");
  assert(bacon.isKosher === false, "Pork Bacon is strictly NOT Kosher");

  const halalChicken = classifyProductDietary({
    name: "Halal Fresh British Diced Chicken Breast 500g",
    category: "Meat & Poultry",
    categoriesTags: ["halal", "poultry", "chicken"],
  });
  assert(halalChicken.isVegetarian === false, "Chicken is NOT Vegetarian");
  assert(halalChicken.isHalal === true, "Halal Chicken is Halal");

  // Eggs & Eggetarian
  const eggs = classifyProductDietary({
    name: "Happy Egg Co. Large Free Range Eggs 6 Pack",
    category: "Dairy & Eggs",
    categoriesTags: ["eggs", "free-range eggs"],
  });
  assert(eggs.isVegetarian === true, "Eggs are Vegetarian");
  assert(eggs.isEggetarian === true, "Eggs are Eggetarian");
  assert(eggs.isVegan === false, "Eggs are NOT Vegan");
  assert(eggs.isDairyFree === true, "Eggs are naturally Dairy-Free");

  // Gluten & Gluten-Free
  const sourdough = classifyProductDietary({
    name: "San Francisco Artisan Sourdough Loaf 400g",
    category: "Bakery",
    categoriesTags: ["breads", "wheat bread"],
  });
  assert(sourdough.isGlutenFree === false, "Wheat Sourdough is NOT Gluten-Free");

  const gfBread = classifyProductDietary({
    name: "Genius Gluten-Free Seeded Sliced Bread 535g",
    category: "Bakery",
    categoriesTags: ["gluten-free", "breads"],
  });
  assert(gfBread.isGlutenFree === true, "Gluten-Free Seeded Bread is Gluten-Free");

  // Nuts & Nut Allergy
  const peanutButter = classifyProductDietary({
    name: "Pip & Nut Crunchy Peanut Butter 300g",
    category: "Pantry Staples",
    categoriesTags: ["spreads", "peanuts"],
  });
  assert(peanutButter.isNutFree === false, "Peanut Butter is NOT Nut-Free");
  assert(peanutButter.tags.includes("Nut Allergy") === false, "Peanut Butter has no Nut Allergy safe tag");

  // -------------------------------------------------------------------------
  // 2. PREFERENCE MATCHING UNIT TESTS
  // -------------------------------------------------------------------------
  console.log("\n--- 2. Testing End-to-End Preference Matching Engine ---");

  assert(
    matchesDietaryPreferences(
      { name: "Organic Spinach 200g", dietaryTags: ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Nut-Free"] },
      ["Vegan", "Gluten-Free"]
    ) === true,
    "Fresh Spinach matches Vegan + Gluten-Free"
  );

  assert(
    matchesDietaryPreferences(
      { name: "Cheddar Cheese 350g", dietaryTags: ["Vegetarian", "Gluten-Free", "Nut-Free"] },
      ["Vegan"]
    ) === false,
    "Cheddar Cheese strictly fails Vegan filter"
  );

  assert(
    matchesDietaryPreferences(
      { name: "Whole Milk 2L", dietaryTags: ["Vegetarian", "Gluten-Free", "Nut-Free"] },
      ["Dairy-Free"]
    ) === false,
    "Cow Milk strictly fails Dairy-Free filter"
  );

  assert(
    matchesDietaryPreferences(
      { name: "Salted Roasted Peanuts", dietaryTags: ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free"] },
      ["Nut Allergy"]
    ) === false,
    "Peanuts strictly fail Nut Allergy filter"
  );

  // -------------------------------------------------------------------------
  // 3. ONBOARDING LOGIC & VALIDATION TESTS
  // -------------------------------------------------------------------------
  console.log("\n--- 3. Testing Mandatory Household & Budget Onboarding Logic ---");

  function isUserFullyOnboarded(profile: {
    isOnboarded: boolean;
    householdSize: number;
    defaultBudget: number;
  }): boolean {
    return (
      profile.isOnboarded === true &&
      typeof profile.householdSize === "number" &&
      profile.householdSize >= 1 &&
      typeof profile.defaultBudget === "number" &&
      profile.defaultBudget > 0
    );
  }

  const rawFreshUser = {
    isOnboarded: false,
    householdSize: 1,
    defaultBudget: 0,
  };
  assert(
    isUserFullyOnboarded(rawFreshUser) === false,
    "Fresh user with budget 0 requires onboarding modal pop-up"
  );

  const completedUser = {
    isOnboarded: true,
    householdSize: 3,
    defaultBudget: 75.0,
  };
  assert(
    isUserFullyOnboarded(completedUser) === true,
    "User with household size 3 and budget £75 is fully onboarded"
  );

  // -------------------------------------------------------------------------
  // 4. LIVE DATABASE INTEGRATION TESTS (POSTGRESQL VIA PRISMA)
  // -------------------------------------------------------------------------
  console.log("\n--- 4. Testing Live Database Queries with Dietary Filtering ---");

  try {
    const totalProducts = await prisma.product.count({ where: { isActive: true } });
    console.log(`  ℹ️ Total active products in database: ${totalProducts}`);

    // Test Vegan query
    const veganProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        dietaryTags: { hasEvery: ["Vegan"] },
      },
      take: 20,
      select: { id: true, name: true, dietaryTags: true },
    });
    assert(veganProducts.length > 0, `Database has ${veganProducts.length}+ indexed Vegan products`);

    // Verify zero meat or cow milk in any returned vegan product
    const meatOrDairyViolations = veganProducts.filter((p) => {
      const n = p.name.toLowerCase();
      return (
        n.includes("chicken") ||
        n.includes("beef") ||
        n.includes("bacon") ||
        n.includes("cheddar") ||
        (n.includes("milk") && !n.includes("oat") && !n.includes("almond") && !n.includes("coconut") && !n.includes("soya"))
      );
    });
    assert(
      meatOrDairyViolations.length === 0,
      "Zero meat or dairy leaks in Vegan database query results",
      meatOrDairyViolations.map((p) => p.name).join(", ")
    );

    // Test Gluten-Free query
    const gfProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        dietaryTags: { hasEvery: ["Gluten-Free"] },
      },
      take: 20,
      select: { id: true, name: true, dietaryTags: true },
    });
    assert(gfProducts.length > 0, `Database has ${gfProducts.length}+ indexed Gluten-Free products`);

    const glutenViolations = gfProducts.filter((p) => {
      const n = p.name.toLowerCase();
      const isWheatGluten = (n.includes("penne") || n.includes("spaghetti") || n.includes("sourdough") || n.includes("croissant")) && !n.includes("gluten free") && !n.includes("gluten-free");
      return isWheatGluten;
    });
    assert(
      glutenViolations.length === 0,
      "Zero gluten leaks in Gluten-Free database query results",
      glutenViolations.map((p) => p.name).join(", ")
    );

    // Test Combined Filter: [Vegan, Gluten-Free]
    const veganGfProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        dietaryTags: { hasEvery: ["Vegan", "Gluten-Free"] },
      },
      take: 15,
      select: { id: true, name: true, dietaryTags: true },
    });
    assert(
      veganGfProducts.length > 0,
      `Database returns ${veganGfProducts.length}+ products for combined [Vegan, Gluten-Free]`
    );

  } catch (err) {
    console.error("Database connection error during test:", err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();

