import { ENV } from "../config/env";
import { prisma } from "../config/prisma";

export interface RecipeIngredientItem {
  name: string;
  quantity: string;
  isFromPantry: boolean;
  productId?: string;
  daysUntilExpiry?: number | null;
}

export interface RecipeMissingIngredient {
  name: string;
  quantity?: string;
  estimatedPriceGbp: number;
  suggestedCategory: string;
  matchedProductId?: string;
  matchedProductName?: string;
  matchedProductImage?: string | null;
  alreadyInList?: boolean;
}

export interface RecipeItem {
  id: string;
  title: string;
  description: string;
  prepTimeMinutes: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  cuisine: string;
  mealType?: string;
  tags?: string[];
  servings: number;
  pantryMatchPercent?: number;
  usedPantryItems: RecipeIngredientItem[];
  missingIngredients: RecipeMissingIngredient[];
  instructions: string[];
  chefTip?: string;
  wasteReductionScore: number;
}

export interface ChatSuggestedProduct {
  id: string;
  name: string;
  price: number;
  reason: string;
  imageUrl?: string | null;
  alreadyInPantry?: boolean;
}

export interface ChatAssistantResponse {
  reply: string;
  suggestedProducts?: ChatSuggestedProduct[];
  suggestedRecipe?: RecipeItem;
  suggestedFollowUps?: string[];
}

export interface PantryInputItem {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate?: Date | null;
}

interface CanonicalIngredient {
  name: string;
  quantity: string;
  keywords: string[];
  suggestedCategory: string;
  fallbackPriceGbp: number;
}

interface CuratedRecipeTemplate {
  id: string;
  title: string;
  description: string;
  prepTimeMinutes: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  cuisine: string;
  mealType: "breakfast" | "lunch" | "dinner";
  tags: string[];
  ingredients: CanonicalIngredient[];
  instructions: string[];
  chefTip: string;
}

const PANTRY_SYNONYM_GROUPS: string[][] = [
  ["milk", "semi skimmed", "semi-skimmed", "whole milk", "skimmed milk", "cravendale", "oat milk", "almond milk"],
  ["cheddar", "cheese", "mozzarella", "parmesan", "red leicester", "cathedral city"],
  ["butter", "lurpak", "spread", "clover", "anchor"],
  ["egg", "eggs", "free range eggs", "large eggs", "medium eggs"],
  ["bread", "sourdough", "loaf", "sliced bread", "wholemeal", "baguette", "toast"],
  ["yogurt", "yoghurt", "greek yogurt", "greek style yogurt"],
  ["pasta", "penne", "spaghetti", "fusilli", "tagliatelle", "macaroni"],
  ["chicken", "chicken breast", "chicken thigh", "poultry"],
  ["tomato", "tomatoes", "vine tomatoes", "chopped tomatoes", "passata"],
  ["spinach", "baby spinach", "greens", "kale"],
  ["potato", "potatoes", "jacket potato", "new potatoes"],
  ["oat", "oats", "porridge oats", "rolled oats"],
  ["honey", "clear honey", "maple syrup"],
  ["marmalade", "jam", "preserve"],
  ["rice", "basmati", "long grain rice", "jasmine rice"],
  ["beans", "baked beans", "chickpeas", "kidney beans", "lentils"],
  ["salmon", "salmon fillets", "fish"],
  ["beef", "minced beef", "beef mince", "steak"],
  ["chilli", "chili", "chilli flakes", "sriracha", "hot sauce", "paprika", "cayenne"],
  ["curry", "tikka", "curry paste", "masala", "garam masala"],
  ["pepper", "peppers", "bell pepper", "red pepper"],
  ["onion", "onions", "red onion", "spring onion"],
  ["garlic", "garlic cloves", "garlic puree"],
  ["cream", "double cream", "single cream", "creme fraiche"],
  ["pesto", "green pesto", "basil pesto"],
  ["soy sauce", "teriyaki", "noodles"],
];

const NON_CULINARY_NOISE_WORDS = [
  "chocolate",
  "biscuit",
  "cookie",
  "ice cream",
  "crisps",
  "candy",
  "sweet",
  "cake",
  "bar",
  "dog",
  "cat",
  "shampoo",
  "soap",
];

const CURATED_UK_RECIPES: CuratedRecipeTemplate[] = [
  {
    id: "rec-creamy-garlic-chicken-pasta",
    title: "Creamy Garlic Chicken & Spinach Penne",
    description: "Succulent pan-seared chicken tossed with al-dente penne in a silky garlic cream & cheddar sauce.",
    prepTimeMinutes: 25,
    difficulty: "EASY",
    cuisine: "Italian-British",
    mealType: "dinner",
    tags: ["dinner", "high-protein", "comfort", "family", "dairy", "chicken", "pasta"],
    ingredients: [
      { name: "Chicken Breast Fillets", quantity: "300g", keywords: ["chicken"], suggestedCategory: "Meat & Poultry", fallbackPriceGbp: 3.45 },
      { name: "Penne Pasta", quantity: "250g", keywords: ["pasta", "penne", "spaghetti"], suggestedCategory: "Pantry Staples", fallbackPriceGbp: 0.95 },
      { name: "Single or Double Cream", quantity: "150ml", keywords: ["cream", "milk"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 1.35 },
      { name: "Baby Spinach", quantity: "100g", keywords: ["spinach", "greens"], suggestedCategory: "Fresh Produce", fallbackPriceGbp: 1.2 },
      { name: "Mature Cheddar Cheese", quantity: "60g", keywords: ["cheddar", "cheese", "parmesan"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 2.5 },
      { name: "Garlic & Mixed Herbs", quantity: "2 cloves", keywords: ["garlic"], suggestedCategory: "Fresh Produce", fallbackPriceGbp: 0.65 },
    ],
    instructions: [
      "Boil salted water in a large pan and cook the penne pasta for 10–11 minutes until al dente.",
      "Dice the chicken breast, season with salt, pepper, and paprika, then sear in olive oil or butter for 6 minutes until golden.",
      "Lower the heat, stir in minced garlic and cream (or a splash of milk + butter), and simmer for 3 minutes.",
      "Toss in drained pasta, baby spinach, and grated cheese, stirring until wilted, glossy, and bubbling.",
    ],
    chefTip: "Save a mug of starchy pasta water before draining—one splash turns cream or cheddar into a restaurant-grade glaze.",
  },
  {
    id: "rec-cheddar-tomato-melt",
    title: "Crispy British Cheddar & Vine Tomato Melt",
    description: "Golden griddled sourdough toastie stuffed with melted mature cheddar, juicy tomatoes, and Dijon.",
    prepTimeMinutes: 12,
    difficulty: "EASY",
    cuisine: "British Cafe",
    mealType: "lunch",
    tags: ["quick", "lunch", "vegetarian", "comfort", "dairy", "cheese", "bread"],
    ingredients: [
      { name: "Artisan Sourdough or Sliced Bread", quantity: "4 slices", keywords: ["bread", "sourdough", "loaf"], suggestedCategory: "Bakery", fallbackPriceGbp: 1.35 },
      { name: "Mature British Cheddar", quantity: "90g", keywords: ["cheddar", "cheese"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 2.75 },
      { name: "Salted Butter", quantity: "20g", keywords: ["butter", "spread"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 2.0 },
      { name: "Vine Tomatoes", quantity: "2 medium", keywords: ["tomato"], suggestedCategory: "Fresh Produce", fallbackPriceGbp: 1.2 },
    ],
    instructions: [
      "Thinly slice the mature cheddar and vine tomatoes, patting tomato slices lightly with kitchen paper.",
      "Lightly spread salted butter on the outside faces of all bread slices for a crunchy golden crust.",
      "Layer cheese and tomatoes inside, adding black pepper or a pinch of chilli flakes if liked.",
      "Griddle in a dry frying pan over medium-low heat for 3–4 minutes per side until deeply golden and bubbling.",
    ],
    chefTip: "Cover the frying pan with a saucepan lid for the final minute so the cheddar melts right to the edges.",
  },
  {
    id: "rec-spinach-cheddar-omelette",
    title: "Loaded Spinach, Cheddar & Herb Omelette",
    description: "Fluffy three-egg French-British omelette folded around creamy melted cheddar and wilted spinach.",
    prepTimeMinutes: 10,
    difficulty: "EASY",
    cuisine: "Breakfast & Brunch",
    mealType: "breakfast",
    tags: ["quick", "breakfast", "lunch", "vegetarian", "high-protein", "keto", "dairy", "eggs"],
    ingredients: [
      { name: "Free Range Eggs", quantity: "3 large", keywords: ["egg"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 1.85 },
      { name: "Fresh Semi-Skimmed Milk", quantity: "2 tbsp", keywords: ["milk"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 1.28 },
      { name: "Salted Butter", quantity: "15g", keywords: ["butter"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 2.0 },
      { name: "Mature Cheddar Cheese", quantity: "50g", keywords: ["cheddar", "cheese"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 2.5 },
      { name: "Baby Spinach", quantity: "60g", keywords: ["spinach"], suggestedCategory: "Fresh Produce", fallbackPriceGbp: 1.15 },
    ],
    instructions: [
      "Whisk the free-range eggs with a splash of fresh milk, sea salt, and cracked black pepper until aerated.",
      "Melt butter in a non-stick skillet over medium heat and wilt the baby spinach for 60 seconds.",
      "Pour in the egg mixture, gently pulling cooked edges toward the centre so liquid egg flows underneath.",
      "Scatter grated cheddar across half the omelette when just set, fold carefully, and slide onto a warm plate.",
    ],
    chefTip: "Whisking a splash of milk into eggs stretches a carton that's near its use-by date and adds extra fluffiness.",
  },
  {
    id: "rec-spicy-chicken-stirfry",
    title: "Spicy Chilli & Garlic Chicken Stir-Fry",
    description: "Vibrant high-heat wok fry of tender chicken strips, crunchy peppers, soy glaze, and fresh noodles.",
    prepTimeMinutes: 20,
    difficulty: "EASY",
    cuisine: "Asian Fusion",
    mealType: "dinner",
    tags: ["quick", "dinner", "spicy", "high-protein", "healthy", "chicken"],
    ingredients: [
      { name: "Chicken Breast or Thigh Strips", quantity: "300g", keywords: ["chicken"], suggestedCategory: "Meat & Poultry", fallbackPriceGbp: 3.45 },
      { name: "Mixed Bell Peppers", quantity: "2 peppers", keywords: ["pepper"], suggestedCategory: "Fresh Produce", fallbackPriceGbp: 1.4 },
      { name: "Egg Noodles or Basmati Rice", quantity: "250g", keywords: ["noodles", "rice"], suggestedCategory: "Pantry Staples", fallbackPriceGbp: 1.15 },
      { name: "Soy Sauce", quantity: "2 tbsp", keywords: ["soy sauce", "teriyaki"], suggestedCategory: "Pantry Staples", fallbackPriceGbp: 1.25 },
      { name: "Chilli & Garlic Stir-Fry Sauce", quantity: "2 tbsp", keywords: ["chilli", "chili", "garlic", "sriracha"], suggestedCategory: "Pantry Staples", fallbackPriceGbp: 1.3 },
    ],
    instructions: [
      "Cook noodles or basmati rice according to packet instructions, then drain and set aside.",
      "Heat a tablespoon of oil in a wok or large frying pan until smoking hot; fry sliced chicken for 5 minutes.",
      "Throw in sliced peppers and garlic, stir-frying on high heat for 2–3 minutes so they stay crisp.",
      "Pour over soy sauce and chilli sauce, toss the noodles or rice through for 1 minute, and serve steaming hot.",
    ],
    chefTip: "Stir-frying leftover fridge vegetables like courgette, carrots, or broccoli stems rescues half-used bags in 3 minutes.",
  },
  {
    id: "rec-tikka-chickpea-curry",
    title: "Smoky Tikka Chickpea & Tomato Masala",
    description: "Richly spiced 20-minute plant-forward curry simmered with chopped tomatoes, yogurt swirl, and warm rice.",
    prepTimeMinutes: 22,
    difficulty: "EASY",
    cuisine: "British Indian",
    mealType: "dinner",
    tags: ["dinner", "spicy", "vegetarian", "healthy", "budget", "curry"],
    ingredients: [
      { name: "Tinned Chickpeas", quantity: "400g tin", keywords: ["chickpea", "beans", "lentil"], suggestedCategory: "Pantry Staples", fallbackPriceGbp: 0.75 },
      { name: "Chopped Tomatoes", quantity: "400g tin", keywords: ["tomato"], suggestedCategory: "Pantry Staples", fallbackPriceGbp: 0.65 },
      { name: "Tikka or Curry Paste", quantity: "2 tbsp", keywords: ["curry", "tikka", "masala"], suggestedCategory: "Pantry Staples", fallbackPriceGbp: 1.65 },
      { name: "Greek Style Yogurt", quantity: "3 tbsp", keywords: ["yogurt", "yoghurt"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 1.28 },
      { name: "Basmati Rice", quantity: "200g", keywords: ["rice"], suggestedCategory: "Pantry Staples", fallbackPriceGbp: 1.2 },
    ],
    instructions: [
      "Rinse the basmati rice and boil gently with a pinch of salt for 10–12 minutes until fluffy.",
      "Sauté onions or garlic with curry/tikka paste in a pan for 2 minutes until fragrant.",
      "Tip in chopped tomatoes and drained chickpeas; simmer gently for 10 minutes until thick and glossy.",
      "Take off the heat, swirl through chilled Greek yogurt for a creamy finish, and serve over warm basmati rice.",
    ],
    chefTip: "Stirring yogurt in OFF the heat prevents splitting and turns an ordinary tomato curry velvety without heavy cream.",
  },
  {
    id: "rec-spaghetti-bolognese",
    title: "Classic Rich Beef & Herb Spaghetti Bolognese",
    description: "Family-favourite UK midweek classic with rich tomato ragù, sautéed vegetables, and grated cheese.",
    prepTimeMinutes: 30,
    difficulty: "EASY",
    cuisine: "Italian",
    mealType: "dinner",
    tags: ["dinner", "comfort", "family", "high-protein", "beef", "pasta"],
    ingredients: [
      { name: "British Lean Minced Beef", quantity: "400g", keywords: ["beef", "mince"], suggestedCategory: "Meat & Poultry", fallbackPriceGbp: 3.25 },
      { name: "Spaghetti Pasta", quantity: "300g", keywords: ["spaghetti", "pasta"], suggestedCategory: "Pantry Staples", fallbackPriceGbp: 0.89 },
      { name: "Chopped Tomatoes or Passata", quantity: "400g", keywords: ["tomato"], suggestedCategory: "Pantry Staples", fallbackPriceGbp: 0.69 },
      { name: "Brown Onion", quantity: "1 large", keywords: ["onion"], suggestedCategory: "Fresh Produce", fallbackPriceGbp: 0.45 },
      { name: "Mature Cheddar or Grated Cheese", quantity: "50g", keywords: ["cheddar", "cheese", "parmesan"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 2.2 },
    ],
    instructions: [
      "Soften diced onion and garlic in a deep pan for 4 minutes, then brown the minced beef for 6 minutes.",
      "Pour in chopped tomatoes plus a splash of water and simmer gently for 15 minutes until rich.",
      "Meanwhile, cook spaghetti in boiling salted water for 9–10 minutes until tender.",
      "Drain spaghetti, spoon rich meat ragù on top, and shower with grated cheddar or parmesan.",
    ],
    chefTip: "Grate ageing carrots or mushrooms straight into the Bolognese sauce to bulk out portions and hide zero-waste veg!",
  },
  {
    id: "rec-scottish-berry-porridge",
    title: "Velvety Scottish Milk Porridge with Honey",
    description: "Slow-simmered rolled oats made ultra-creamy with fresh milk, topped with Greek yogurt and honey.",
    prepTimeMinutes: 10,
    difficulty: "EASY",
    cuisine: "Scottish / British",
    mealType: "breakfast",
    tags: ["quick", "breakfast", "vegetarian", "healthy", "budget", "dairy", "milk", "oats"],
    ingredients: [
      { name: "Scottish Rolled Oats", quantity: "90g", keywords: ["oat", "porridge"], suggestedCategory: "Pantry Staples", fallbackPriceGbp: 1.1 },
      { name: "Fresh Semi-Skimmed Milk", quantity: "350ml", keywords: ["milk"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 1.28 },
      { name: "Greek Style Yogurt", quantity: "2 tbsp", keywords: ["yogurt", "yoghurt"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 1.28 },
      { name: "Clear Honey", quantity: "1 tbsp", keywords: ["honey", "marmalade", "jam"], suggestedCategory: "Pantry Staples", fallbackPriceGbp: 1.85 },
    ],
    instructions: [
      "Combine rolled oats, fresh milk, and a tiny pinch of sea salt in a non-stick saucepan.",
      "Bring to a gentle simmer over medium heat, stirring continuously for 4–5 minutes until creamy.",
      "Spoon into warm bowls and crown with a dollop of chilled Greek yogurt and drizzled honey.",
    ],
    chefTip: "Making all-milk porridge is the fastest way to rescue milk within 48 hours of its use-by date.",
  },
  {
    id: "rec-sourdough-marmalade-yogurt",
    title: "Toasted Sourdough, Marmalade & Greek Yogurt Plate",
    description: "Crisp golden artisan toast spread with butter and Seville orange marmalade beside creamy yogurt.",
    prepTimeMinutes: 8,
    difficulty: "EASY",
    cuisine: "British Breakfast",
    mealType: "breakfast",
    tags: ["quick", "breakfast", "vegetarian", "dairy", "bread", "yogurt"],
    ingredients: [
      { name: "Artisan Sourdough Bread", quantity: "2 thick slices", keywords: ["bread", "sourdough", "toast"], suggestedCategory: "Bakery", fallbackPriceGbp: 1.75 },
      { name: "Salted Butter", quantity: "15g", keywords: ["butter", "spread"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 2.0 },
      { name: "Orange Fine Cut Marmalade", quantity: "2 tbsp", keywords: ["marmalade", "jam"], suggestedCategory: "Pantry Staples", fallbackPriceGbp: 2.2 },
      { name: "Greek Style Live Yogurt", quantity: "150g", keywords: ["yogurt", "yoghurt"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 1.5 },
    ],
    instructions: [
      "Toast sourdough slices until deeply golden and crisp around the crust.",
      "Immediately spread salted butter so it melts in, followed by fine-cut marmalade.",
      "Serve alongside a chilled bowl of thick Greek style yogurt topped with an extra drizzle of marmalade.",
    ],
    chefTip: "Day-old sourdough makes better toast than fresh bread—drizzle 2 drops of olive oil before griddling if slightly dry.",
  },
  {
    id: "rec-cheesy-baked-jacket-potatoes",
    title: "Crispy Jacket Potatoes with Cheddar & Beans",
    description: "Fluffy-centred baked potatoes loaded with salted butter, baked beans, and bubbling mature cheddar.",
    prepTimeMinutes: 25,
    difficulty: "EASY",
    cuisine: "British Comfort",
    mealType: "lunch",
    tags: ["lunch", "dinner", "vegetarian", "comfort", "budget", "dairy", "cheese"],
    ingredients: [
      { name: "Baking Potatoes", quantity: "2 large", keywords: ["potato"], suggestedCategory: "Fresh Produce", fallbackPriceGbp: 1.2 },
      { name: "Baked Beans in Tomato Sauce", quantity: "415g tin", keywords: ["beans", "baked beans"], suggestedCategory: "Pantry Staples", fallbackPriceGbp: 0.65 },
      { name: "Mature Cheddar Cheese", quantity: "80g", keywords: ["cheddar", "cheese"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 2.5 },
      { name: "Salted Butter", quantity: "20g", keywords: ["butter"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 2.0 },
    ],
    instructions: [
      "Prick baking potatoes with a fork, rub with a touch of oil & salt, and microwave 8 mins then crisp in a 200°C oven for 12 mins.",
      "Warm the baked beans gently in a small pan until piping hot (add a dash of Worcestershire or chilli if desired).",
      "Split open the hot potatoes, mash butter into the fluffy flesh, pile on the beans, and top generously with cheddar.",
    ],
    chefTip: "Half-microwave, half-oven cuts baking time from 70 minutes to 20 minutes while keeping the skin crisp!",
  },
  {
    id: "rec-pesto-mozzarella-pasta",
    title: "15-Minute Basil Pesto, Tomato & Mozzarella Pasta",
    description: "Vibrant green pesto penne bursting with sweet tomatoes, wilted spinach, and creamy melted mozzarella.",
    prepTimeMinutes: 15,
    difficulty: "EASY",
    cuisine: "Mediterranean",
    mealType: "lunch",
    tags: ["quick", "lunch", "dinner", "vegetarian", "healthy", "dairy", "pasta"],
    ingredients: [
      { name: "Penne or Fusilli Pasta", quantity: "250g", keywords: ["pasta", "penne", "fusilli"], suggestedCategory: "Pantry Staples", fallbackPriceGbp: 0.95 },
      { name: "Green Basil Pesto", quantity: "3 tbsp", keywords: ["pesto"], suggestedCategory: "Pantry Staples", fallbackPriceGbp: 1.5 },
      { name: "Fresh Tomatoes", quantity: "150g", keywords: ["tomato"], suggestedCategory: "Fresh Produce", fallbackPriceGbp: 1.2 },
      { name: "Mozzarella or Cheddar", quantity: "80g", keywords: ["mozzarella", "cheese", "cheddar"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 1.4 },
      { name: "Baby Spinach", quantity: "60g", keywords: ["spinach"], suggestedCategory: "Fresh Produce", fallbackPriceGbp: 1.15 },
    ],
    instructions: [
      "Boil pasta in salted water for 10 minutes, reserving 3 tablespoons of cooking water before draining.",
      "Return pasta to the warm pan off the heat, stir in green pesto and a splash of pasta water.",
      "Fold through halved tomatoes, baby spinach, and torn mozzarella or grated cheese until lightly melted.",
    ],
    chefTip: "Never boil pesto directly—warming it gently in residual pasta heat preserves its bright basil aroma.",
  },
  {
    id: "rec-zero-waste-frittata",
    title: "Mediterranean Zero-Waste Fridge Frittata",
    description: "Golden baked-style skillet frittata designed to rescue leftover dairy, eggs, and greens in one pan.",
    prepTimeMinutes: 18,
    difficulty: "EASY",
    cuisine: "Mediterranean / Zero-Waste",
    mealType: "lunch",
    tags: ["quick", "lunch", "dinner", "vegetarian", "high-protein", "dairy", "eggs"],
    ingredients: [
      { name: "Free Range Eggs", quantity: "4 large", keywords: ["egg"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 1.85 },
      { name: "Semi-Skimmed Milk", quantity: "50ml", keywords: ["milk", "cream"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 1.28 },
      { name: "Mature Cheddar Cheese", quantity: "60g", keywords: ["cheddar", "cheese"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 2.5 },
      { name: "Baby Spinach & Tomatoes", quantity: "100g", keywords: ["spinach", "tomato", "pepper"], suggestedCategory: "Fresh Produce", fallbackPriceGbp: 1.2 },
      { name: "Crispy Bread Side", quantity: "2 slices", keywords: ["bread", "sourdough"], suggestedCategory: "Bakery", fallbackPriceGbp: 1.2 },
    ],
    instructions: [
      "Sauté diced peppers, tomatoes, or spinach in an oven-safe pan until softened.",
      "Beat eggs with milk, seasoning, and half the cheese, then pour evenly over the vegetables.",
      "Cook on gentle heat for 5 minutes until edges set, scatter remaining cheese, and flash under a hot grill for 3 minutes.",
      "Slice into wedges and serve alongside warm buttered toast.",
    ],
    chefTip: "Literally any leftover cooked veg, ham, or cheese nearing expiry can be folded straight into this base.",
  },
  {
    id: "rec-crispy-salmon-new-potatoes",
    title: "Pan-Crispy Salmon with Garlic Butter Potatoes",
    description: "Omega-rich pan-seared salmon fillets served over herbed butter new potatoes and vibrant greens.",
    prepTimeMinutes: 22,
    difficulty: "MEDIUM",
    cuisine: "Modern British",
    mealType: "dinner",
    tags: ["dinner", "healthy", "high-protein", "dairy", "salmon", "fish"],
    ingredients: [
      { name: "Atlantic Salmon Fillets", quantity: "2 fillets", keywords: ["salmon", "fish"], suggestedCategory: "Meat & Poultry", fallbackPriceGbp: 3.9 },
      { name: "Baby or New Potatoes", quantity: "350g", keywords: ["potato"], suggestedCategory: "Fresh Produce", fallbackPriceGbp: 1.15 },
      { name: "Salted Butter", quantity: "25g", keywords: ["butter"], suggestedCategory: "Dairy & Eggs", fallbackPriceGbp: 2.0 },
      { name: "Baby Spinach or Greens", quantity: "100g", keywords: ["spinach", "greens"], suggestedCategory: "Fresh Produce", fallbackPriceGbp: 1.2 },
    ],
    instructions: [
      "Halve baby potatoes and boil in salted water for 12–14 minutes until fork-tender, then drain.",
      "Pat salmon fillets dry, season well, and pan-sear skin-side down for 4 minutes before flipping for 2–3 minutes.",
      "Toss hot potatoes in salted butter and wilt the spinach in the warm salmon pan for 45 seconds.",
      "Plate salmon over buttery potatoes and greens with cracked black pepper and lemon.",
    ],
    chefTip: "Start salmon in a cold or medium-hot pan skin-side down so the skin renders slowly into a shatteringly crisp crust.",
  },
];

function expandKeywords(keywords: string[]): string[] {
  const expanded = new Set<string>();
  for (const kw of keywords) {
    const low = kw.toLowerCase().trim();
    expanded.add(low);
    for (const group of PANTRY_SYNONYM_GROUPS) {
      if (group.some((g) => g.includes(low) || low.includes(g))) {
        group.forEach((g) => expanded.add(g));
      }
    }
  }
  return Array.from(expanded);
}

export function doesPantryItemMatchIngredient(
  pantryName: string,
  pantryCategory: string,
  keywords: string[]
): boolean {
  const nameLower = pantryName.toLowerCase();
  const catLower = (pantryCategory || "").toLowerCase();
  const allTerms = expandKeywords(keywords);

  // Guard against false-positive sweet/confectionery matches (e.g. "Milk Chocolate" != "Fresh Milk")
  const wantsRealDairyOrStaple = keywords.some((k) =>
    ["milk", "butter", "cream", "cheese", "egg"].includes(k.toLowerCase())
  );
  if (
    wantsRealDairyOrStaple &&
    (nameLower.includes("milk chocolate") ||
      nameLower.includes("peanut butter") ||
      nameLower.includes("almond butter") ||
      nameLower.includes("cashew butter") ||
      nameLower.includes("cocoa butter") ||
      nameLower.includes("butterscotch") ||
      nameLower.includes("butter biscuit"))
  ) {
    return false;
  }

  return allTerms.some((term) => nameLower.includes(term) || catLower.includes(term));
}

export async function findBestCatalogueProduct(
  ingredientName: string,
  keywords: string[] = [],
  suggestedCategory?: string
): Promise<{
  id: string;
  name: string;
  defaultUnitPrice: number;
  imageUrl: string | null;
} | null> {
  const cleanTokens = ingredientName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["and", "with", "for", "fresh", "style", "free", "range", "large", "small", "medium", "british", "tin"].includes(w));

  const searchTerms = Array.from(
    new Set([
      ...keywords.map((k) => k.toLowerCase()),
      ...cleanTokens,
    ])
  ).slice(0, 6);

  if (searchTerms.length === 0) return null;

  try {
    const candidates = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: searchTerms.map((term) => ({
          name: { contains: term, mode: "insensitive" as const },
        })),
      },
      select: {
        id: true,
        name: true,
        category: true,
        categoriesTags: true,
        defaultUnitPrice: true,
        imageUrl: true,
      },
      take: 25,
    });

    if (candidates.length === 0 && suggestedCategory) {
      const catTerm = suggestedCategory.split("&")[0].trim();
      const catMatch = await prisma.product.findFirst({
        where: {
          isActive: true,
          OR: [
            { category: { contains: catTerm, mode: "insensitive" } },
            { name: { contains: catTerm, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, defaultUnitPrice: true, imageUrl: true },
      });
      if (catMatch) {
        return {
          id: catMatch.id,
          name: catMatch.name,
          defaultUnitPrice: Number(catMatch.defaultUnitPrice),
          imageUrl: catMatch.imageUrl,
        };
      }
      return null;
    }

    if (candidates.length === 0) return null;

    // Score candidates so primary ingredient matches beat composite snacks (e.g. "Fresh Milk" beats "Milk Chocolate")
    const primaryKeyword = (keywords[0] || cleanTokens[0] || "").toLowerCase();
    const isIngredientNonSweet = !NON_CULINARY_NOISE_WORDS.some((w) =>
      ingredientName.toLowerCase().includes(w)
    );

    const ranked = candidates
      .map((c) => {
        const lower = c.name.toLowerCase();
        let score = 0;

        for (const t of searchTerms) {
          if (lower.includes(t)) score += 10;
        }
        if (primaryKeyword && lower.includes(primaryKeyword)) score += 15;
        if (suggestedCategory && c.category.toLowerCase().includes(suggestedCategory.toLowerCase().split("&")[0].trim())) {
          score += 5;
        }
        if (isIngredientNonSweet && NON_CULINARY_NOISE_WORDS.some((noise) => lower.includes(noise))) {
          score -= 35;
        }
        // Prefer concise, authentic product names over ultra-long snack names
        score -= Math.min(c.name.length / 25, 3);

        return { c, score };
      })
      .sort((a, b) => b.score - a.score);

    const best = ranked[0].c;
    return {
      id: best.id,
      name: best.name,
      defaultUnitPrice: Number(best.defaultUnitPrice),
      imageUrl: best.imageUrl,
    };
  } catch (err) {
    console.warn("[GeminiService] Catalogue product lookup failed:", err);
    return null;
  }
}

class GeminiService {
  private apiKey = ENV.GEMINI_API_KEY;

  /**
   * Generates Zero-Waste Recipes using Gemini Flash or interactive Curated UK Kitchen Engine,
   * accurately reconciling every ingredient against live Pantry stock and Shopping List.
   */
  async generateRecipes(
    pantryItems: PantryInputItem[],
    dietaryPreferences: string[] = [],
    householdSize: number = 2,
    options?: {
      mealType?: string;
      query?: string;
      refresh?: boolean;
      activeListProductIds?: Set<string>;
      activeListProductNames?: string[];
    }
  ): Promise<{ recipes: RecipeItem[]; source: string; summary: string }> {
    const expiringSoon = pantryItems.filter((item) => {
      if (!item.expiryDate) return false;
      const days = (new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return days <= 4;
    });

    let rawRecipes: RecipeItem[] = [];
    let source = "CURATED_UK_PANTRY_ENGINE";

    if (this.apiKey && this.apiKey.trim().length > 10) {
      try {
        const geminiResult = await this.callGeminiForRecipes(
          pantryItems,
          expiringSoon,
          dietaryPreferences,
          householdSize,
          options
        );
        if (geminiResult && geminiResult.length > 0) {
          rawRecipes = geminiResult;
          source = "GEMINI_AI";
        }
      } catch (err: any) {
        console.warn("[GeminiService] Recipe call failed, using UK Culinary Engine:", err.message);
      }
    }

    if (rawRecipes.length === 0) {
      rawRecipes = await this.buildSmartCuratedRecipes(
        pantryItems,
        expiringSoon,
        dietaryPreferences,
        householdSize,
        options
      );
    } else {
      rawRecipes = await this.reconcileExternalRecipesWithPantry(
        rawRecipes,
        pantryItems,
        options?.activeListProductIds,
        options?.activeListProductNames
      );
    }

    return {
      recipes: rawRecipes,
      source,
      summary:
        pantryItems.length > 0
          ? `Prepared ${rawRecipes.length} UK recipes cross-checked against your ${pantryItems.length} pantry item(s).`
          : `Showcasing ${rawRecipes.length} curated UK household dishes — click "Get All" on any dish to check your pantry & build your shopping list.`,
    };
  }

  private async reconcileExternalRecipesWithPantry(
    recipes: RecipeItem[],
    pantryItems: PantryInputItem[],
    activeListProductIds?: Set<string>,
    activeListProductNames: string[] = []
  ): Promise<RecipeItem[]> {
    const now = Date.now();
    const listNamesLower = activeListProductNames.map((n) => n.toLowerCase());

    const enriched: RecipeItem[] = [];
    for (const r of recipes) {
      // Combine both LLM lists and re-verify strictly against live pantry
      const allRaw = [
        ...(r.usedPantryItems || []).map((u) => ({
          name: u.name,
          quantity: u.quantity || "1 portion",
          suggestedCategory: "Groceries",
          estimatedPriceGbp: 1.5,
        })),
        ...(r.missingIngredients || []).map((m) => ({
          name: m.name,
          quantity: m.quantity || "1 pack",
          suggestedCategory: m.suggestedCategory || "Groceries",
          estimatedPriceGbp: Number(m.estimatedPriceGbp || 1.5),
        })),
      ];

      const seenNames = new Set<string>();
      const usedPantryItems: RecipeIngredientItem[] = [];
      const missingIngredients: RecipeMissingIngredient[] = [];
      let expiringMatched = 0;

      for (const ing of allRaw) {
        const norm = ing.name.toLowerCase().trim();
        if (seenNames.has(norm)) continue;
        seenNames.add(norm);

        const pantryMatch = pantryItems.find((p) =>
          doesPantryItemMatchIngredient(p.name, p.category, norm.split(/\s+/))
        );

        if (pantryMatch) {
          const daysLeft = pantryMatch.expiryDate
            ? Math.round((new Date(pantryMatch.expiryDate).getTime() - now) / 86400000)
            : null;
          if (daysLeft !== null && daysLeft <= 4) expiringMatched++;
          usedPantryItems.push({
            name: pantryMatch.name,
            quantity: `${ing.quantity} • Have ${pantryMatch.quantity} ${pantryMatch.unit}`,
            isFromPantry: true,
            productId: pantryMatch.productId,
            daysUntilExpiry: daysLeft,
          });
        } else {
          const catalogMatch = await findBestCatalogueProduct(ing.name, norm.split(/\s+/), ing.suggestedCategory);
          const inList =
            (catalogMatch && activeListProductIds?.has(catalogMatch.id)) ||
            listNamesLower.some((ln) => ln.includes(norm));
          missingIngredients.push({
            name: ing.name,
            quantity: ing.quantity,
            estimatedPriceGbp: catalogMatch ? catalogMatch.defaultUnitPrice : ing.estimatedPriceGbp,
            suggestedCategory: ing.suggestedCategory,
            matchedProductId: catalogMatch?.id,
            matchedProductName: catalogMatch?.name,
            matchedProductImage: catalogMatch?.imageUrl || null,
            alreadyInList: Boolean(inList),
          });
        }
      }

      const totalCount = usedPantryItems.length + missingIngredients.length;
      const pantryMatchPercent = totalCount > 0 ? Math.round((usedPantryItems.length / totalCount) * 100) : 0;

      enriched.push({
        ...r,
        pantryMatchPercent,
        wasteReductionScore: Math.min(99, Math.max(70, 68 + expiringMatched * 14 + Math.round(pantryMatchPercent * 0.25))),
        usedPantryItems,
        missingIngredients,
      });
    }

    return enriched;
  }

  private async buildSmartCuratedRecipes(
    pantryItems: PantryInputItem[],
    expiring: PantryInputItem[],
    dietaryPreferences: string[],
    householdSize: number,
    options?: {
      mealType?: string;
      query?: string;
      refresh?: boolean;
      activeListProductIds?: Set<string>;
      activeListProductNames?: string[];
    }
  ): Promise<RecipeItem[]> {
    const now = Date.now();
    const filterType = (options?.mealType || "all").toLowerCase().trim();
    const searchQuery = (options?.query || "").toLowerCase().trim();
    const isVegDiet = dietaryPreferences.some((d) =>
      ["vegetarian", "vegan", "plant-based"].includes(d.toLowerCase())
    );
    const listNamesLower = (options?.activeListProductNames || []).map((n) => n.toLowerCase());

    // Filter curated recipes by mealType, dietary preference, and craving query
    let candidates = CURATED_UK_RECIPES.filter((tpl) => {
      if (isVegDiet && !tpl.tags.includes("vegetarian")) return false;
      if (filterType && filterType !== "all" && filterType !== "pantry") {
        if (filterType === "quick") return tpl.prepTimeMinutes <= 18 || tpl.tags.includes("quick");
        return tpl.mealType === filterType || tpl.tags.includes(filterType);
      }
      return true;
    });

    if (searchQuery) {
      const qTokens = searchQuery.split(/\s+/).filter((t) => t.length > 1);
      const queryMatched = candidates.filter((tpl) => {
        const hay = `${tpl.title} ${tpl.description} ${tpl.cuisine} ${tpl.tags.join(" ")} ${tpl.ingredients.map((i) => i.name).join(" ")}`.toLowerCase();
        return qTokens.some((t) => hay.includes(t));
      });
      if (queryMatched.length > 0) {
        candidates = queryMatched;
      }
    }

    if (candidates.length === 0) {
      candidates = [...CURATED_UK_RECIPES];
    }

    // Score each recipe accurately against live pantry and expiring stock
    const scored = candidates.map((tpl, idx) => {
      const usedPantryItems: RecipeIngredientItem[] = [];
      const missingRaw: CanonicalIngredient[] = [];
      let expiringSaved = 0;

      for (const ing of tpl.ingredients) {
        const match = pantryItems.find((p) =>
          doesPantryItemMatchIngredient(p.name, p.category, ing.keywords)
        );
        if (match) {
          const daysLeft = match.expiryDate
            ? Math.round((new Date(match.expiryDate).getTime() - now) / 86400000)
            : null;
          if (daysLeft !== null && daysLeft <= 4) expiringSaved++;
          usedPantryItems.push({
            name: match.name,
            quantity: `${ing.quantity} • In Pantry (${match.quantity} ${match.unit})`,
            isFromPantry: true,
            productId: match.productId,
            daysUntilExpiry: daysLeft,
          });
        } else {
          missingRaw.push(ing);
        }
      }

      const totalCount = tpl.ingredients.length;
      const pantryMatchPercent = Math.round((usedPantryItems.length / totalCount) * 100);
      const wasteReductionScore = Math.min(
        98,
        usedPantryItems.length === 0 ? 75 + (idx % 3) * 4 : 74 + expiringSaved * 12 + Math.round(pantryMatchPercent * 0.2)
      );

      // Rank by: expiring items saved > pantry match > variety shuffle on refresh
      let sortScore = expiringSaved * 100 + usedPantryItems.length * 25;
      if (filterType === "pantry") sortScore += pantryMatchPercent * 2;
      if (options?.refresh) {
        sortScore += ((tpl.title.length * 13 + Math.floor(now / 1000)) % 35);
      }

      return {
        tpl,
        usedPantryItems,
        missingRaw,
        pantryMatchPercent,
        wasteReductionScore,
        sortScore,
      };
    });

    scored.sort((a, b) => b.sortScore - a.sortScore);
    const selected = scored.slice(0, 6);

    // Resolve missing ingredients against our 2,849-item PostgreSQL catalogue in parallel
    const results: RecipeItem[] = await Promise.all(
      selected.map(async (entry) => {
        const missingIngredients: RecipeMissingIngredient[] = await Promise.all(
          entry.missingRaw.map(async (m) => {
            const catProd = await findBestCatalogueProduct(m.name, m.keywords, m.suggestedCategory);
            const inList =
              (catProd && options?.activeListProductIds?.has(catProd.id)) ||
              listNamesLower.some((ln) => m.keywords.some((kw) => ln.includes(kw)));

            return {
              name: m.name,
              quantity: m.quantity,
              estimatedPriceGbp: catProd ? catProd.defaultUnitPrice : m.fallbackPriceGbp,
              suggestedCategory: m.suggestedCategory,
              matchedProductId: catProd?.id,
              matchedProductName: catProd?.name,
              matchedProductImage: catProd?.imageUrl || null,
              alreadyInList: Boolean(inList),
            };
          })
        );

        return {
          id: entry.tpl.id,
          title: entry.tpl.title,
          description: entry.tpl.description,
          prepTimeMinutes: entry.tpl.prepTimeMinutes,
          difficulty: entry.tpl.difficulty,
          cuisine: entry.tpl.cuisine,
          mealType: entry.tpl.mealType,
          tags: entry.tpl.tags,
          servings: householdSize,
          pantryMatchPercent: entry.pantryMatchPercent,
          usedPantryItems: entry.usedPantryItems,
          missingIngredients,
          instructions: entry.tpl.instructions,
          chefTip: entry.tpl.chefTip,
          wasteReductionScore: entry.wasteReductionScore,
        };
      })
    );

    return results;
  }

  private async callGeminiApi(prompt: string, options?: { json?: boolean }): Promise<string | null> {
    if (!this.apiKey || this.apiKey.trim().length < 10 || !this.apiKey.trim().startsWith("AIza")) {
      return null;
    }
    const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-latest"];
    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const body: any = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options?.json ? 0.3 : 0.4,
            ...(options?.json ? { responseMimeType: "application/json" } : {}),
          },
        };
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const json = (await response.json()) as any;
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim().length > 0) {
            return text.trim();
          }
        }
      } catch (err: any) {
        console.warn(`[GeminiService] Model ${model} call failed:`, err.message);
      }
    }
    return null;
  }

  private async callGeminiForRecipes(
    pantryItems: PantryInputItem[],
    expiring: PantryInputItem[],
    dietary: string[],
    householdSize: number,
    options?: { mealType?: string; query?: string }
  ): Promise<RecipeItem[]> {
    const pantryStr = pantryItems.map((p) => `${p.name} (${p.quantity} ${p.unit})`).join(", ") || "Empty Pantry";
    const expiringStr = expiring.map((p) => p.name).join(", ") || "None";
    const dietStr = dietary.join(", ") || "None";
    const filterNote = options?.mealType && options.mealType !== "all" ? `Preferred category: ${options.mealType}` : "";
    const queryNote = options?.query ? `User craving/request: "${options.query}"` : "";

    const prompt = `You are SmartGrocer's Zero-Waste Chef in the UK.
Household pantry inventory: [${pantryStr}]
Items expiring soon (PRIORITIZE THESE TO AVOID WASTE): [${expiringStr}]
Household Size: ${householdSize}
Dietary Restrictions: ${dietStr}
${filterNote}
${queryNote}

Suggest 4 realistic, UK supermarket-friendly meals. Even if the pantry is empty, propose popular approachable UK meals and list the ingredients under missingIngredients.
Respond ONLY with a valid JSON array of recipes matching this structure:
[
  {
    "id": "rec-1",
    "title": "Recipe Title",
    "description": "Short 1-2 sentence description",
    "prepTimeMinutes": 20,
    "difficulty": "EASY",
    "cuisine": "British",
    "servings": ${householdSize},
    "usedPantryItems": [
      { "name": "Ingredient Name", "quantity": "amount", "isFromPantry": true }
    ],
    "missingIngredients": [
      { "name": "Missing item", "quantity": "200g", "estimatedPriceGbp": 1.50, "suggestedCategory": "Dairy & Eggs" }
    ],
    "instructions": ["Step 1", "Step 2", "Step 3"],
    "chefTip": "Helpful cooking or zero-waste tip",
    "wasteReductionScore": 90
  }
]`;

    const text = await this.callGeminiApi(prompt, { json: true });
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : parsed.recipes || [];
    } catch {
      return [];
    }
  }

  /**
   * Generalized Domain Guardrail: Ensures queries are strictly relevant to
   * SmartGrocer, food, groceries, cooking, recipes, pantry inventory, or budgeting.
   */
  private isOffTopicQuery(query: string): boolean {
    const q = query.toLowerCase().trim();

    const groceryIntentPattern =
      /\b(need\w*|buy\w*|replenish\w*|shop\w*|grocer\w*|food\w*|pantry\w*|stock\w*|shelf\w*|shelves|expir\w*|spoil\w*|waste\w*|cook\w*|recipe\w*|meal\w*|eat\w*|dinner\w*|lunch\w*|breakfast\w*|brunch|snack\w*|dish\w*|ingredient\w*|budget\w*|cost\w*|price\w*|spend\w*|save\w*|saving\w*|bill\w*|supermarket\w*|tesco|sainsbury\w*|asda|aldi|lidl|morrisons|cart\w*|basket\w*|item\w*|product\w*|fridge|refrigerator|use-by|best-before|soon|hi|hello|hey|help|thanks|thank you|smartgrocer|diet\w*|calorie\w*|nutrition\w*|vegetarian|vegan|spicy|quick|easy|healthy|comfort|chicken|beef|pork|salmon|fish|pasta|spaghetti|penne|rice|curry|stir-fry|stir|omelette|frittata|porridge|oats?|milk|cheese|cheddar|butter|eggs?|bread|sourdough|yogurt|yoghurt|cream|tomato\w*|potato\w*|spinach|beans|pesto|marmalade|honey|swap\w*|alternative\w*|cheaper|inspire|surprise|craving|hungry|find|search|add)\b/i;

    const injectionPattern =
      /(ignore (all )?(previous|above) (instructions|rules|prompts)|you are now|pretend to be|act as (a|an|dan|jailbreak)|reveal (your )?(prompt|system prompt|instructions))/i;

    if (injectionPattern.test(q)) {
      return true;
    }

    if (!groceryIntentPattern.test(q)) {
      return true;
    }

    return false;
  }

  /**
   * AI Chatbot Assistant answering queries with live Python forecasting, pantry context,
   * 2,849-product UK catalogue matching, interactive recipe recommendations, and multi-turn memory.
   */
  async chatWithAssistant(
    userMessage: string,
    context: {
      householdSize?: number;
      pantryItems: PantryInputItem[];
      replenishments: any[];
      wasteRisks: any[];
      activeListItems: any[];
      budget?: number;
      actualSpending?: number;
      alternatives?: any[];
    },
    history?: Array<{ role: "user" | "assistant"; text: string }>
  ): Promise<ChatAssistantResponse> {
    const standardRefusal =
      "I am your SmartGrocer Assistant, designed specifically to help you with your groceries, pantry, recipes, and shopping budget. I can only answer questions related to food, groceries, and this app. How can I help with your groceries today?";

    const hasHistory = Array.isArray(history) && history.length > 0;
    const isFollowUp =
      hasHistory &&
      /^(can|could|what about|make it|how to|add|substitute|why|how|and|also|replace|more|less|give me|tell me|instead|another|different|something|yes|sure|ok|get all)/i.test(
        userMessage.trim()
      );

    if (!isFollowUp && this.isOffTopicQuery(userMessage)) {
      return {
        reply: standardRefusal,
      };
    }

    // Try live Gemini API first when valid AIza key is present
    if (this.apiKey && this.apiKey.trim().length > 10 && this.apiKey.trim().startsWith("AIza")) {
      try {
        const prompt = this.buildGeminiChatPrompt(userMessage, context, history);
        const reply = await this.callGeminiApi(prompt);
        if (reply && reply.trim().length > 0) {
          const cleanReply = reply.trim();
          if (
            cleanReply.includes("```") ||
            cleanReply.includes("public class") ||
            cleanReply.includes("System.out") ||
            cleanReply.includes("def ") ||
            cleanReply.includes("import ")
          ) {
            return {
              reply:
                "I am your SmartGrocer Assistant, dedicated exclusively to helping you manage your groceries, pantry, recipes, and shopping budget. I cannot provide programming code or technical scripts. How can I help with your groceries today?",
            };
          }

          const resolvedProducts = await this.resolveChatSuggestedProducts(context.replenishments, context.pantryItems);
          const intentLower = userMessage.toLowerCase();
          let suggestedRecipe: RecipeItem | undefined;
          if (/recipe|meal|cook|dinner|lunch|breakfast|hungry|dish|make it|spicy|vegetarian/i.test(intentLower)) {
            const recs = await this.buildSmartCuratedRecipes(context.pantryItems, [], [], context.householdSize || 2, {
              query: userMessage,
            });
            suggestedRecipe = recs[0];
          }

          return {
            reply: cleanReply,
            suggestedProducts: resolvedProducts,
            suggestedRecipe,
            suggestedFollowUps: this.getContextualFollowUps(userMessage, suggestedRecipe),
          };
        }
      } catch (err: any) {
        console.warn("[GeminiService] Chat call error:", err.message);
      }
    }

    return this.generateInteractiveChatResponse(userMessage, context, history);
  }

  private buildGeminiChatPrompt(
    userMessage: string,
    context: {
      householdSize?: number;
      pantryItems: PantryInputItem[];
      replenishments: any[];
      wasteRisks: any[];
      activeListItems: any[];
      budget?: number;
      actualSpending?: number;
    },
    history?: Array<{ role: "user" | "assistant"; text: string }>
  ): string {
    const replenishmentsSummary = context.replenishments
      .map(
        (r) =>
          `- ${r.productName} (Urgency: ${r.urgency}, empty in ${r.estimatedDaysUntilDepleted}d, suggest: ${r.suggestedQuantity} ${r.unit}, Price: £${Number(r.defaultUnitPrice || 1.5).toFixed(2)})`
      )
      .join("\n");

    const wasteRisksSummary = context.wasteRisks
      .map(
        (w) =>
          `- ${w.productName} (Expires in ${w.daysUntilExpiry}d, Risk: ${w.riskLevel}, Action: ${w.suggestedAction})`
      )
      .join("\n");

    const now = Date.now();
    const sortedPantry = [...context.pantryItems].sort((a, b) => {
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    });

    const pantrySummary = sortedPantry
      .slice(0, 25)
      .map((p) => {
        let expiryNote = "No expiry date";
        if (p.expiryDate) {
          const daysLeft = Math.round((new Date(p.expiryDate).getTime() - now) / 86400000);
          if (daysLeft < 0) expiryNote = `EXPIRED ${Math.abs(daysLeft)}d ago`;
          else if (daysLeft === 0) expiryNote = "Expires TODAY";
          else if (daysLeft <= 3) expiryNote = `Expires in ${daysLeft}d (CRITICAL)`;
          else expiryNote = `Expires in ${daysLeft}d`;
        }
        return `- ${p.name} (${p.quantity} ${p.unit}) -> [${expiryNote}]`;
      })
      .join("\n");

    const listSummary = context.activeListItems
      .map(
        (i) =>
          `- ${i.quantity}x ${i.product?.name || "Item"} (£${(Number(i.product?.defaultUnitPrice || 1) * Number(i.quantity || 1)).toFixed(2)})`
      )
      .join("\n");

    const hasHistory = Array.isArray(history) && history.length > 0;

    return `You are SmartGrocer's personal AI Grocery & Culinary Assistant for UK households.
LIVE USER GROCERY & PANTRY CONTEXT:
- Household Size: ${context.householdSize || 2}
- Target Weekly Budget: £${(context.budget || 75).toFixed(2)} (Current Basket Spend: £${(context.actualSpending || 0).toFixed(2)})
- Active Shopping List (${context.activeListItems.length} items):
${listSummary || "No items in active list"}
- PYTHON DEMAND FORECASTING:
${replenishmentsSummary || "All essentials currently in stock"}
- PANTRY EXPIRY RISKS:
${wasteRisksSummary || "No items near expiration"}
- PANTRY STOCK:
${pantrySummary || "Pantry is currently empty"}
${hasHistory ? `\nCONVERSATION HISTORY:\n${history!.slice(-6).map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.text}`).join("\n")}` : ""}

USER QUESTION: "${userMessage}"
Be warm, accurate, concise, and quote real GBP (£) prices and actual pantry items.`;
  }

  private async resolveChatSuggestedProducts(
    replenishments: any[],
    pantryItems: PantryInputItem[]
  ): Promise<ChatSuggestedProduct[]> {
    const pantryIds = new Set(pantryItems.map((p) => p.productId));
    const resolved: ChatSuggestedProduct[] = [];

    for (const r of replenishments.slice(0, 3)) {
      const existsInDb = r.productId && !String(r.productId).startsWith("seed-")
        ? await prisma.product.findUnique({ where: { id: r.productId }, select: { id: true, name: true, defaultUnitPrice: true, imageUrl: true } }).catch(() => null)
        : null;

      if (existsInDb) {
        resolved.push({
          id: existsInDb.id,
          name: existsInDb.name,
          price: Number(existsInDb.defaultUnitPrice),
          reason: r.reason || "Predicted household replenishment",
          imageUrl: existsInDb.imageUrl,
          alreadyInPantry: pantryIds.has(existsInDb.id),
        });
      } else {
        const matched = await findBestCatalogueProduct(r.productName || "Semi Skimmed Milk");
        if (matched) {
          resolved.push({
            id: matched.id,
            name: matched.name,
            price: matched.defaultUnitPrice,
            reason: r.reason || "Popular UK pantry staple",
            imageUrl: matched.imageUrl,
            alreadyInPantry: pantryIds.has(matched.id),
          });
        }
      }
    }

    return resolved;
  }

  private getContextualFollowUps(query: string, recipe?: RecipeItem): string[] {
    if (recipe) {
      return [
        "🌶️ Make it spicy",
        "🥗 Show a vegetarian dish",
        "⚡ Give me another quick dinner",
        "⏳ What is expiring soon?",
      ];
    }
    const lower = query.toLowerCase();
    if (lower.includes("expir") || lower.includes("waste")) {
      return [
        "🍳 Suggest a meal with expiring items",
        "📦 Show what is in my pantry",
        "🛒 What do I need to buy?",
      ];
    }
    if (lower.includes("budget") || lower.includes("save")) {
      return [
        "🏷️ Find cheaper own-brand swaps",
        "🍳 Cheap £3 dinner ideas",
        "🛒 What do I need to buy?",
      ];
    }
    return [
      "🍳 Suggest a dinner dish",
      "🥛 Find fresh milk & dairy",
      "⏳ What is expiring soon?",
      "💰 How is my grocery budget?",
    ];
  }

  private async generateInteractiveChatResponse(
    userMessage: string,
    context: {
      householdSize?: number;
      pantryItems: PantryInputItem[];
      replenishments: any[];
      wasteRisks: any[];
      activeListItems: any[];
      budget?: number;
      actualSpending?: number;
      alternatives?: any[];
    },
    history?: Array<{ role: "user" | "assistant"; text: string }>
  ): Promise<ChatAssistantResponse> {
    if (this.isOffTopicQuery(userMessage)) {
      return {
        reply:
          "I am your SmartGrocer Assistant, designed specifically to help you with your groceries, pantry, recipes, and shopping budget. I can only answer questions related to food, groceries, and this app. How can I help with your groceries today?",
      };
    }

    const lower = userMessage.toLowerCase();
    const lastUserAndAssistantText = (history || [])
      .slice(-4)
      .map((h) => h.text.toLowerCase())
      .join(" ");

    const activeListProductIds = new Set<string>(
      context.activeListItems.map((i) => i.productId || i.product?.id).filter(Boolean)
    );
    const activeListNames = context.activeListItems.map((i) => i.product?.name || "").filter(Boolean);

    // 1. Follow-up modifiers (e.g. "Can we make it spicy?", "Make it vegetarian", "Another recipe")
    const isRecipeIntent =
      /recipe|meal|cook|dinner|lunch|breakfast|brunch|dish|hungry|make something|eat|suggest a|craving|surprise|inspire|chili|chilli|spicy|vegetarian|vegan|chicken|pasta|curry|omelette|frittata|porridge|salmon|jacket potato|another/i.test(
        lower
      ) ||
      (/make it|substitute|something else|other option/i.test(lower) &&
        /recipe|meal|cook|dinner|lunch|breakfast|dish|frittata|pasta|curry|chicken|melt/i.test(lastUserAndAssistantText));

    if (isRecipeIntent) {
      let queryHint = lower;
      let mealType = "all";
      if (lower.includes("spicy") || lower.includes("chili") || lower.includes("chilli")) {
        queryHint = "spicy chilli";
        mealType = "spicy";
      } else if (lower.includes("vegetarian") || lower.includes("vegan") || lower.includes("meatless")) {
        mealType = "vegetarian";
      } else if (lower.includes("breakfast") || lower.includes("morning")) {
        mealType = "breakfast";
      } else if (lower.includes("lunch")) {
        mealType = "lunch";
      } else if (lower.includes("dinner")) {
        mealType = "dinner";
      } else if (lower.includes("quick") || lower.includes("fast") || lower.includes("easy")) {
        mealType = "quick";
      }

      const recipes = await this.buildSmartCuratedRecipes(
        context.pantryItems,
        [],
        mealType === "vegetarian" ? ["vegetarian"] : [],
        context.householdSize || 2,
        {
          mealType,
          query: queryHint,
          refresh: /another|different|other|surprise|inspire/i.test(lower),
          activeListProductIds,
          activeListProductNames: activeListNames,
        }
      );

      // Avoid repeating the last shown recipe if user asked for "another" or "make it spicy"
      let chosen = recipes[0];
      if (/another|different|other|something else|spicy/i.test(lower) && recipes.length > 1) {
        const unseen = recipes.find((r) => !lastUserAndAssistantText.includes(r.title.toLowerCase()));
        if (unseen) chosen = unseen;
      }

      const inPantryNames = chosen.usedPantryItems.map((i) => i.name);
      const missingCost = chosen.missingIngredients.reduce(
        (sum, m) => sum + (Number(m.estimatedPriceGbp) || 0),
        0
      );

      const spicyNote =
        lower.includes("spicy") && !chosen.title.toLowerCase().includes("spicy")
          ? "\n🌶️ **Spicy Twist:** Finish with crushed chilli flakes, smoked paprika, or a swirl of sriracha before serving!"
          : "";

      const pantryStatusLine =
        inPantryNames.length > 0
          ? `✅ **Already in your pantry (${inPantryNames.length}):** ${inPantryNames.join(", ")}`
          : `📦 **Pantry check:** None of these ingredients are in your pantry yet — click **"Get All"** on the recipe card below to add everything to your shopping list!`;

      const missingLine =
        chosen.missingIngredients.length > 0
          ? `🛒 **Missing to buy (${chosen.missingIngredients.length} items · ~£${missingCost.toFixed(2)}):** ${chosen.missingIngredients.map((m) => m.name).join(", ")}`
          : `🎉 **Ready to cook right now!** You already have every ingredient in your pantry.`;

      const productCards: ChatSuggestedProduct[] = chosen.missingIngredients
        .filter((m) => m.matchedProductId)
        .slice(0, 4)
        .map((m) => ({
          id: m.matchedProductId!,
          name: m.matchedProductName || m.name,
          price: Number(m.estimatedPriceGbp || 1.5),
          reason: `Needed for ${chosen.title}`,
          imageUrl: m.matchedProductImage,
          alreadyInPantry: false,
        }));

      return {
        reply: `👨‍🍳 **How about ${chosen.title}?** (${chosen.prepTimeMinutes} mins • ${chosen.cuisine})\n\n${pantryStatusLine}\n${missingLine}${spicyNote}`,
        suggestedRecipe: chosen,
        suggestedProducts: productCards,
        suggestedFollowUps: this.getContextualFollowUps(userMessage, chosen),
      };
    }

    // 2. Expiring / Food Waste Radar
    if (/expir|waste|spoil|use-by|shelf|going off|bad soon/i.test(lower)) {
      const now = Date.now();
      const itemsWithDates = context.pantryItems
        .filter((p) => p.expiryDate)
        .map((p) => ({
          ...p,
          days: Math.round((new Date(p.expiryDate!).getTime() - now) / 86400000),
        }))
        .sort((a, b) => a.days - b.days);

      if (itemsWithDates.length > 0) {
        const topExpiring = itemsWithDates.slice(0, 5).map((i) => {
          if (i.days < 0) return `🔴 ${i.name} (expired ${Math.abs(i.days)}d ago)`;
          if (i.days === 0) return `🔴 ${i.name} (expires TODAY)`;
          if (i.days <= 2) return `🟠 ${i.name} (expires in ${i.days}d)`;
          return `🟡 ${i.name} (expires in ${i.days}d)`;
        });

        const rescueRecipes = await this.buildSmartCuratedRecipes(
          itemsWithDates.slice(0, 3),
          itemsWithDates.slice(0, 3),
          [],
          context.householdSize || 2,
          { activeListProductIds, activeListProductNames: activeListNames }
        );
        const rescue = rescueRecipes[0];

        return {
          reply: `⏳ **Spoilage Radar — Items Expiring Soonest:**\n${topExpiring.join("\n")}\n\n💡 **Zero-Waste Rescue Idea:** Make **${rescue.title}** to rescue these before they spoil! Click **Get All** below to grab any missing items.`,
          suggestedRecipe: rescue,
          suggestedFollowUps: this.getContextualFollowUps(userMessage, rescue),
        };
      }

      if (context.pantryItems.length > 0) {
        return {
          reply: `✅ Good news! You have ${context.pantryItems.length} item(s) in your pantry and none are flagged for urgent expiration right now.`,
          suggestedFollowUps: this.getContextualFollowUps("expir"),
        };
      }

      return {
        reply: "📦 Your pantry is currently empty, so nothing is expiring! Try browsing **Chef Recipes** and clicking **Get All** on a dish to populate your shopping list and restock your pantry after your trip.",
        suggestedFollowUps: ["🍳 Suggest a dinner dish", "🥛 Find fresh milk & dairy", "🛒 What do I need to buy?"],
      };
    }

    // 3. Pantry Inventory Check
    if (/in my pantry|my pantry|what do i have|what's in|fridge|stock/i.test(lower)) {
      if (context.pantryItems.length === 0) {
        return {
          reply: "📦 Your pantry is currently empty! You can add items from the **Pantry** tab or pick a dish from **Chef Recipes** and click **Get All** to add everything you need to your shopping list.",
          suggestedFollowUps: ["🍳 Suggest a dinner dish", "🥛 Find fresh milk & dairy", "🛒 What do I need to buy?"],
        };
      }
      const listStr = context.pantryItems
        .slice(0, 8)
        .map((p) => `• **${p.name}** (${p.quantity} ${p.unit})`)
        .join("\n");
      return {
        reply: `📦 **Your Current Pantry (${context.pantryItems.length} items):**\n${listStr}\n\nWant me to suggest a recipe tailored to what you already have?`,
        suggestedFollowUps: ["🍳 Suggest a meal from my pantry", "⏳ What is expiring soon?", "🛒 What do I need to buy?"],
      };
    }

    // 4. Replenishment ("What do I need to buy?")
    if (/need|buy|replenish|restock|running low|empty/i.test(lower)) {
      const resolvedProducts = await this.resolveChatSuggestedProducts(context.replenishments, context.pantryItems);
      if (resolvedProducts.length > 0) {
        const names = context.replenishments
          .slice(0, 3)
          .map((r) => `${r.productName} (~${r.estimatedDaysUntilDepleted}d left)`)
          .join(", ");
        return {
          reply: `🛒 **You need this:** Based on your household's consumption pattern, ${names} are running low. Tap **+ Add** below to queue them straight into your active list!`,
          suggestedProducts: resolvedProducts,
          suggestedFollowUps: ["💰 How is my grocery budget?", "🍳 Suggest a dinner dish", "⏳ What is expiring soon?"],
        };
      }

      // If user has no history yet, query real popular UK dairy/bakery/produce essentials from DB
      const essentials = await Promise.all([
        findBestCatalogueProduct("Semi Skimmed Milk", ["semi skimmed milk", "milk"], "Dairy & Eggs"),
        findBestCatalogueProduct("Free Range Eggs", ["eggs"], "Dairy & Eggs"),
        findBestCatalogueProduct("Sourdough Bread", ["bread", "sourdough"], "Bakery"),
      ]);
      const realEssentials: ChatSuggestedProduct[] = essentials
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
        .map((e) => ({
          id: e.id,
          name: e.name,
          price: e.defaultUnitPrice,
          reason: "UK household essential from catalogue",
          imageUrl: e.imageUrl,
        }));

      return {
        reply: "🛒 Your regular staples look stocked! If you're doing a fresh shop today, here are top UK everyday essentials ready to add in one tap:",
        suggestedProducts: realEssentials,
        suggestedFollowUps: ["🍳 Suggest a dinner dish", "🥛 Find cheese & butter", "💰 How is my grocery budget?"],
      };
    }

    // 5. Budget & Money-Saving Alternatives
    if (/budget|spend|money|cost|save|saving|swap|cheaper|alternative|bill/i.test(lower)) {
      const budget = context.budget || 75;
      const spend = context.actualSpending || 0;
      const diff = budget - spend;
      const swaps = (context.alternatives || []).slice(0, 3);

      let swapLines = "";
      const swapCards: ChatSuggestedProduct[] = [];
      if (swaps.length > 0) {
        swapLines =
          "\n\n🏷️ **Smart Supermarket Swaps on Your List:**\n" +
          swaps
            .map(
              (s) =>
                `• Swap *${s.originalProductName}* (£${Number(s.originalPrice).toFixed(2)}) → **${s.suggestedProductName}** (£${Number(s.suggestedPrice).toFixed(2)}) — Save **£${Number(s.estimatedSavings).toFixed(2)}**`
            )
            .join("\n");
        swaps.forEach((s) =>
          swapCards.push({
            id: s.suggestedProductId,
            name: s.suggestedProductName,
            price: Number(s.suggestedPrice),
            reason: `Save £${Number(s.estimatedSavings).toFixed(2)} vs ${s.originalProductName}`,
            imageUrl: s.suggestedImageUrl,
          })
        );
      }

      const statusLine =
        diff >= 0
          ? `💰 **Budget Status:** Your active shopping list is **£${spend.toFixed(2)}**, leaving **£${diff.toFixed(2)}** under your **£${budget.toFixed(2)}** weekly target.`
          : `⚠️ **Over Budget Alert:** Your active list (£${spend.toFixed(2)}) is **£${Math.abs(diff).toFixed(2)}** over your **£${budget.toFixed(2)}** target.`;

      return {
        reply: `${statusLine}${swapLines || "\n\n💡 Head to **Shopping Lists** to run AI Smart Swaps and cut your bill automatically."}`,
        suggestedProducts: swapCards.length > 0 ? swapCards : undefined,
        suggestedFollowUps: ["🛒 What do I need to buy?", "🍳 Suggest a budget meal", "📦 What is in my pantry?"],
      };
    }

    // 6. Live UK Catalogue Product Search ("Find me milk & dairy", "cheese", "butter", etc.)
    const searchTokens = lower
      .replace(/find|search|show me|give me|any|price of|how much is|do you have|look up|get/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !["and", "the", "for", "with", "fresh", "some", "can"].includes(t));

    if (searchTokens.length > 0) {
      const dbMatches = await prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            ...searchTokens.map((t) => ({ name: { contains: t, mode: "insensitive" as const } })),
            ...searchTokens.map((t) => ({ category: { contains: t, mode: "insensitive" as const } })),
          ],
        },
        select: { id: true, name: true, category: true, defaultUnitPrice: true, imageUrl: true },
        take: 6,
      });

      if (dbMatches.length > 0) {
        const pantryIds = new Set(context.pantryItems.map((p) => p.productId));
        return {
          reply: `🔎 Found **${dbMatches.length} UK catalogue products** matching **${searchTokens.join(", ")}** (live £ pricing). Tap **+ Add** to drop any straight into your list:`,
          suggestedProducts: dbMatches.map((m) => ({
            id: m.id,
            name: m.name,
            price: Number(m.defaultUnitPrice),
            reason: m.category,
            imageUrl: m.imageUrl,
            alreadyInPantry: pantryIds.has(m.id),
          })),
          suggestedFollowUps: ["🍳 Suggest a recipe using milk & cheese", "💰 Check my budget", "📦 What is in my pantry?"],
        };
      }
    }

    // 7. Friendly Interactive Overview
    const defaultRecipes = await this.buildSmartCuratedRecipes(
      context.pantryItems,
      [],
      [],
      context.householdSize || 2,
      { activeListProductIds, activeListProductNames: activeListNames }
    );
    const featured = defaultRecipes[0];

    return {
      reply: `👋 Hi! I'm connected to your live Pantry (**${context.pantryItems.length} items**), Shopping List (**${context.activeListItems.length} items**), and our **2,849-product UK catalogue**.\n\nYou can ask me:\n• *"Suggest a dinner dish"* (I'll check what's in your pantry & let you Get All missing items!)\n• *"Find fresh milk or cheddar cheese"*\n• *"What is expiring soon?"* or *"How is my budget?"*`,
      suggestedRecipe: featured,
      suggestedFollowUps: [
        "🍳 Suggest a dinner dish",
        "🥛 Find fresh milk & dairy",
        "⏳ What is expiring soon?",
        "💰 How is my grocery budget?",
      ],
    };
  }
}

export const geminiService = new GeminiService();
