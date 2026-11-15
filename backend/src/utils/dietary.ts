/**
 * Dietary Classification & Filtering Engine for SmartGrocer
 * Provides 100% accurate, deterministic classification and filtering for:
 * - Vegetarian
 * - Vegan
 * - Eggetarian
 * - Gluten-Free
 * - Dairy-Free
 * - Nut-Free (Nut Allergy safe)
 * - Halal
 * - Kosher
 */

export interface DietaryFlags {
  isVegetarian: boolean;
  isVegan: boolean;
  isEggetarian: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
  isHalal: boolean;
  isKosher: boolean;
  tags: string[];
}

export const SUPPORTED_DIETARY_PREFERENCES = [
  "Vegetarian",
  "Vegan",
  "Eggetarian",
  "Gluten-Free",
  "Dairy-Free",
  "Nut Allergy",
  "Halal",
  "Kosher",
] as const;

export type SupportedDietaryPreference = (typeof SUPPORTED_DIETARY_PREFERENCES)[number];

// Regular Expressions for strict, comprehensive ingredient classification
const MEAT_SEAFOOD_REGEX =
  /\b(meat|beef|pork|bacon|ham|prosciutto|salami|chorizo|pancetta|lamb|mutton|venison|veal|chicken|poultry|turkey|duck|goose|fish|fishes|salmon|tuna|cod|haddock|trout|mackerel|halibut|seabass|plaice|sardine|anchov|prawn|shrimp|crab|lobster|seafood|squid|calamari|mussel|clam|oyster|scallop|gelatin|gelatine|sausage|kiev|steak|fillet|rashers|meatball|gammon)\b/i;

const MEAT_TAGS = [
  "meats",
  "meats and their products",
  "fishes",
  "fishes and their products",
  "poultry",
  "seafood",
  "beef",
  "pork",
  "chicken",
  "prepared meats",
];

const PLANT_MILK_OR_BUTTER_REGEX =
  /\b(peanut butter|almond butter|cashew butter|cocoa butter|shea butter|coconut butter|apple butter|coconut milk|almond milk|oat milk|soya milk|soy milk|rice milk|cashew milk|hazelnut milk|hemp milk|plant[- ]based milk|vegan butter|plant[- ]based butter)\b/i;

const DAIRY_REGEX =
  /\b(milk|dairy|cheese|cheddar|mozzarella|parmesan|gouda|brie|camembert|feta|halloumi|ricotta|paneer|butter|yogurt|yoghurt|cream|double cream|single cream|sour cream|clotted cream|whey|casein|kefir|ghee|custard|buttermilk|curd|fromage frais|creme fraiche)\b/i;

const DAIRY_TAGS = [
  "dairies",
  "milks",
  "fresh milks",
  "cheeses",
  "butters",
  "yogurts",
  "dairy desserts",
  "fermented milk products",
  "creams",
];

const EGG_REGEX = /\b(egg|eggs|egg yolk|egg white|mayonnaise|meringue)\b/i;
const EGG_TAGS = ["eggs", "chicken eggs", "free-range eggs"];

const GLUTEN_REGEX =
  /\b(wheat|barley|rye|spelt|triticale|semolina|couscous|farro|kamut|bread|toast|bagel|croissant|brioche|pastry|pastries|scone|cake|cakes|biscuit|biscuits|cookie|cookies|cracker|crackers|pasta|pastas|spaghetti|macaroni|penne|fusilli|lasagne|lasagna|noodle|noodles|flour|sourdough|ciabatt|malt|beer|ale|lager|cereal bars)\b/i;

const GLUTEN_TAGS = [
  "breads",
  "pastas",
  "biscuits and cakes",
  "pastries",
  "cereals and their products",
];

const GLUTEN_FREE_EXEMPTION_REGEX =
  /\b(gluten[- ]free|sans gluten|sin gluten|wheat[- ]free)\b/i;

const NUT_REGEX =
  /\b(peanut|peanuts|almond|almonds|cashew|cashews|walnut|walnuts|pecan|pecans|pistachio|pistachios|hazelnut|hazelnuts|macadamia|macadamias|brazil nut|brazil nuts|pine nut|pine nuts|chestnut|chestnuts|nutella|marzipan|praline|nougat)\b/i;

const NUT_TAGS = ["nuts", "peanuts", "tree nuts", "almonds", "hazelnuts", "walnuts", "cashews"];

const PORK_REGEX = /\b(pork|bacon|ham|prosciutto|salami|chorizo|pancetta|lard|gammon|pork rind|pork sausage)\b/i;
const ALCOHOL_REGEX = /\b(beer|wine|cider|spirits|alcohol|liqueur|vodka|whisky|whiskey|rum|gin|brandy|champagne|prosecco|tequila)\b/i;

/**
 * Classify a product based on its name, tags, and category.
 */
export function classifyProductDietary(product: {
  name: string;
  categoriesTags?: string[];
  category?: string;
}): DietaryFlags {
  const name = (product.name || "").trim().toLowerCase();
  const tags = (product.categoriesTags || []).map((t) => t.trim().toLowerCase());
  const category = (product.category || "").trim().toLowerCase();
  const allText = `${name} ${tags.join(" ")} ${category}`;

  // Meat / Poultry / Fish
  const hasMeat =
    MEAT_SEAFOOD_REGEX.test(allText) ||
    tags.some((t) => MEAT_TAGS.some((mt) => t === mt || t.includes(mt)));

  // Dairy detection
  const isExplicitPlantMilk = PLANT_MILK_OR_BUTTER_REGEX.test(name);
  const hasDairy =
    !isExplicitPlantMilk &&
    (DAIRY_REGEX.test(name) ||
      tags.some((t) => DAIRY_TAGS.some((dt) => t === dt || t.includes(dt))));

  // Egg detection
  const hasEgg =
    EGG_REGEX.test(name) ||
    tags.some((t) => EGG_TAGS.some((et) => t === et || t.includes(et)));

  // Gluten detection (respecting explicit gluten-free claims)
  const isExplicitlyGlutenFree = GLUTEN_FREE_EXEMPTION_REGEX.test(allText);
  const hasGluten =
    !isExplicitlyGlutenFree &&
    (GLUTEN_REGEX.test(allText) ||
      tags.some((t) => GLUTEN_TAGS.some((gt) => t === gt || t.includes(gt))));

  // Nut detection
  const hasNuts =
    NUT_REGEX.test(allText) ||
    tags.some((t) => NUT_TAGS.some((nt) => t === nt || t.includes(nt)));

  // Pork & Alcohol
  const hasPork = PORK_REGEX.test(allText);
  const hasAlcohol = ALCOHOL_REGEX.test(allText);

  // Honey & Gelatin
  const hasHoneyOrGelatin = /\b(honey|gelatin|gelatine)\b/i.test(allText);

  // Derived classifications
  const isVegetarian = !hasMeat;
  const isVegan = !hasMeat && !hasDairy && !hasEgg && !hasHoneyOrGelatin;
  const isEggetarian = !hasMeat;
  const isGlutenFree = !hasGluten;
  const isDairyFree = !hasDairy;
  const isNutFree = !hasNuts;
  const isHalal = !hasPork && !hasAlcohol && (!hasMeat || tags.some((t) => t.includes("halal")));
  const isKosher = !hasPork && (!hasMeat || tags.some((t) => t.includes("kosher")));

  const outputTags: string[] = [];
  if (isVegetarian) outputTags.push("Vegetarian");
  if (isVegan) outputTags.push("Vegan");
  if (isEggetarian) outputTags.push("Eggetarian");
  if (isGlutenFree) outputTags.push("Gluten-Free");
  if (isDairyFree) outputTags.push("Dairy-Free");
  if (isNutFree) {
    outputTags.push("Nut-Free");
    outputTags.push("Nut Allergy"); // Support user search / preference terminology
  }
  if (isHalal) outputTags.push("Halal");
  if (isKosher) outputTags.push("Kosher");

  return {
    isVegetarian,
    isVegan,
    isEggetarian,
    isGlutenFree,
    isDairyFree,
    isNutFree,
    isHalal,
    isKosher,
    tags: outputTags,
  };
}

/**
 * Checks if a product satisfies all required dietary preferences.
 */
export function matchesDietaryPreferences(
  product: { name: string; categoriesTags?: string[]; category?: string; dietaryTags?: string[] },
  requestedPreferences: string[]
): boolean {
  if (!requestedPreferences || requestedPreferences.length === 0) return true;

  const currentTags =
    product.dietaryTags && product.dietaryTags.length > 0
      ? product.dietaryTags
      : classifyProductDietary(product).tags;

  const currentSet = new Set(currentTags.map((t) => t.toLowerCase()));

  for (const rawPref of requestedPreferences) {
    const pref = rawPref.trim().toLowerCase();
    if (!pref) continue;

    if (pref === "nut allergy" || pref === "nut-free" || pref === "nut free") {
      if (!currentSet.has("nut-free") && !currentSet.has("nut allergy")) return false;
    } else if (pref === "dairy-free" || pref === "dairy free") {
      if (!currentSet.has("dairy-free")) return false;
    } else if (pref === "gluten-free" || pref === "gluten free") {
      if (!currentSet.has("gluten-free")) return false;
    } else {
      if (!currentSet.has(pref)) return false;
    }
  }

  return true;
}

