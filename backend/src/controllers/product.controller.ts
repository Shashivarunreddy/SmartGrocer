import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { cacheGet, cacheSet } from "../config/redis";

// Redis Cache 1-Hour TTL (3600 seconds) for Catalogue products
const CACHE_TTL_SECONDS = 3600;

interface CategoryRule {
  tags: string[];
  keywords: string[];
  excludeNames?: string[];
}

const CATEGORY_MAP: Record<string, CategoryRule> = {
  "dairy & eggs": {
    tags: [
      "Dairies", "Milks", "Fresh milks", "Semi-skimmed milks", "Whole milks",
      "Skimmed milks", "Filtered milks", "Organic milks", "Cheeses", "Cheddar cheese",
      "Mozzarella", "Butters", "Salted butters", "Yogurts", "Greek-style yogurts",
      "Honey yogurts", "Eggs", "Chicken eggs", "Free-range eggs", "Creams",
      "Double creams", "Dairy desserts", "Dairy drinks", "Fermented milk products",
    ],
    keywords: ["milk", "dairy", "cheese", "cheddar", "butter", "yogurt", "yoghurt", "egg", "cream", "kefir"],
    excludeNames: [
      "peanut butter", "almond butter", "cashew butter", "cocoa butter",
      "milk chocolate", "butter biscuit", "butter chicken", "butterscotch",
      "egg noodle", "egg fried",
    ],
  },
  dairies: {
    tags: [
      "Dairies", "Milks", "Fresh milks", "Semi-skimmed milks", "Whole milks",
      "Skimmed milks", "Filtered milks", "Organic milks", "Cheeses", "Cheddar cheese",
      "Mozzarella", "Butters", "Salted butters", "Yogurts", "Greek-style yogurts",
      "Honey yogurts", "Eggs", "Chicken eggs", "Free-range eggs", "Creams",
      "Double creams", "Dairy desserts", "Dairy drinks", "Fermented milk products",
    ],
    keywords: ["milk", "dairy", "cheese", "cheddar", "butter", "yogurt", "yoghurt", "egg", "cream"],
    excludeNames: [
      "peanut butter", "almond butter", "cashew butter", "cocoa butter",
      "milk chocolate", "butter biscuit", "butter chicken", "butterscotch",
      "egg noodle", "egg fried",
    ],
  },
  "fresh produce": {
    tags: [
      "Fruits and vegetables based foods", "Fruits", "Vegetables", "Fresh foods",
      "Fresh fruits", "Fresh vegetables", "Salads", "Fruit-based foods and beverages",
      "Dates", "Medjool dates", "Tomatoes", "Potatoes", "Apples", "Bananas",
    ],
    keywords: ["fruit", "vegetable", "salad", "produce", "apple", "banana", "tomato", "potato", "spinach", "carrot"],
  },
  bakery: {
    tags: [
      "Breads", "White breads", "Sourdough breads", "Wholemeal breads", "Pastries",
      "Viennoiseries", "Brioches", "Croissants", "Scones", "Naans", "Flatbreads",
      "Special breads", "Biscuits and cakes", "Cakes",
    ],
    keywords: ["bread", "bakery", "cake", "pastry", "scone", "croissant", "naan", "bagel", "sourdough", "ciabattin"],
  },
  breads: {
    tags: [
      "Breads", "White breads", "Sourdough breads", "Wholemeal breads", "Pastries",
      "Brioches", "Naans", "Flatbreads", "Special breads", "Scones",
    ],
    keywords: ["bread", "scone", "naan", "bagel", "sourdough", "loaf", "roll", "croissant"],
  },
  "meat & poultry": {
    tags: [
      "Meats and their products", "Meats", "Meat preparations", "Beef", "Beef and its products",
      "Pork", "Pork and its products", "Chicken", "Chicken and its products", "Poultry",
      "Bacon", "Back bacon", "Lamb meat", "Seafood", "Fishes", "Fishes and their products",
      "Sausages", "Chicken kievs", "Tuna Steaks", "Yellowfin Tuna Steaks", "Plaice Fillets",
    ],
    keywords: ["meat", "chicken", "beef", "pork", "bacon", "lamb", "fish", "salmon", "tuna", "sausage", "steak", "fillet"],
  },
  beverages: {
    tags: [
      "Beverages", "Beverages and beverages preparations", "Plant-based beverages",
      "Fruit juices", "Teas", "Coffees", "Waters", "Soft drinks", "Hot beverages",
      "Unsweetened beverages", "Artificially sweetened beverages",
    ],
    keywords: ["beverage", "drink", "juice", "tea", "coffee", "water", "smoothie", "cola", "milk"],
  },
  "snacks & biscuits": {
    tags: [
      "Snacks", "Sweet snacks", "Salty snacks", "Biscuits", "Biscuits and crackers",
      "Biscuits and cakes", "Chocolates", "Crisps", "Cereal bars", "Fruits cereal bars",
      "Appetizers", "Confectioneries",
    ],
    keywords: ["snack", "biscuit", "chocolate", "crisp", "cracker", "bar", "cookie", "sweet"],
  },
  snacks: {
    tags: [
      "Snacks", "Sweet snacks", "Salty snacks", "Biscuits", "Biscuits and crackers",
      "Chocolates", "Crisps", "Cereal bars", "Fruits cereal bars", "Appetizers",
    ],
    keywords: ["snack", "biscuit", "chocolate", "crisp", "cracker", "bar", "cookie"],
  },
  "pantry staples": {
    tags: [
      "Cereals and potatoes", "Cereals and their products", "Pastas", "Rices",
      "Condiments", "Sauces", "Canned foods", "Spreads", "Meals", "Soups",
      "Cooking helpers", "Flours", "Fats",
    ],
    keywords: ["pasta", "rice", "sauce", "cereal", "condiment", "canned", "soup", "oil", "flour", "meal", "spread"],
  },
  groceries: {
    tags: [
      "Plant-based foods and beverages", "Plant-based foods", "Cereals and potatoes",
      "Condiments", "Meals", "Spreads", "Dairies", "Meats and their products",
    ],
    keywords: ["grocery", "pasta", "rice", "sauce", "cereal", "bread", "milk", "meal"],
  },
  breakfast: {
    tags: [
      "Breakfasts", "Breakfast cereals", "Spreads", "Sweet spreads", "Fruit and vegetable preserves",
      "Citrus jams", "Marmalades", "Orange jams", "Oats", "Porridges", "Cereal bars",
    ],
    keywords: ["breakfast", "cereal", "oat", "porridge", "marmalade", "jam", "granola", "croissant", "yogurt"],
  },
  spreads: {
    tags: [
      "Spreads", "Sweet spreads", "Salted spreads", "Plant-based spreads",
      "Butters", "Salted butters", "Jams", "Marmalades", "Orange jams", "Honey", "Peanut butters",
    ],
    keywords: ["spread", "jam", "marmalade", "butter", "honey"],
  },
};

function buildCategoryWhere(rawCategory: string): Prisma.ProductWhereInput {
  const key = rawCategory.trim().toLowerCase();
  const rule = CATEGORY_MAP[key];

  if (!rule) {
    return {
      category: { contains: rawCategory.trim(), mode: "insensitive" },
    };
  }

  const orConditions: Prisma.ProductWhereInput[] = [
    { categoriesTags: { hasSome: rule.tags } },
    ...rule.keywords.map((kw) => ({ category: { contains: kw, mode: "insensitive" as const } })),
    ...rule.keywords.slice(0, 5).map((kw) => ({ name: { contains: kw, mode: "insensitive" as const } })),
  ];

  if (rule.excludeNames && rule.excludeNames.length > 0) {
    return {
      AND: [
        { OR: orConditions },
        {
          NOT: {
            OR: rule.excludeNames.map((ex) => ({ name: { contains: ex, mode: "insensitive" as const } })),
          },
        },
      ],
    };
  }

  return { OR: orConditions };
}

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 20));
    const search = (req.query.search as string)?.trim();
    const category = (req.query.category as string)?.trim();

    const cacheKey = `products:list:${page}:${pageSize}:${search || "all"}:${category || "all"}`;
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.status(200).json(cached);
      return;
    }
    res.setHeader("X-Cache", "MISS");

    const andConditions: Prisma.ProductWhereInput[] = [{ isActive: true }];

    if (search) {
      const searchOr: Prisma.ProductWhereInput[] = [
        { name: { contains: search, mode: "insensitive" } },
        { brands: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { code: { contains: search } },
      ];
      if (search.toLowerCase() === "dairy" || search.toLowerCase() === "dairies") {
        searchOr.push({
          categoriesTags: {
            hasSome: ["Dairies", "Milks", "Fresh milks", "Semi-skimmed milks", "Whole milks", "Cheeses", "Butters", "Yogurts", "Eggs"],
          },
        });
      }
      andConditions.push({ OR: searchOr });
    }

    if (category) {
      andConditions.push(buildCategoryWhere(category));
    }

    const where: Prisma.ProductWhereInput = { AND: andConditions };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
        select: {
          id: true,
          code: true,
          name: true,
          brands: true,
          category: true,
          categoriesTags: true,
          imageUrl: true,
          unit: true,
          productQuantity: true,
          defaultUnitPrice: true,
          currency: true,
          isFood: true,
          isActive: true,
        },
      }),
    ]);

    const responsePayload = {
      data: products,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    // Store in Redis / In-Memory cache with 1-hour TTL
    await cacheSet(cacheKey, responsePayload, CACHE_TTL_SECONDS);

    res.status(200).json(responsePayload);
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId } = req.params;
    const cacheKey = `products:id:${productId}`;
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.status(200).json({ data: cached });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      res.status(404).json({
        code: "PRODUCT_NOT_FOUND",
        message: `Product with ID '${productId}' was not found.`,
      });
      return;
    }

    await cacheSet(cacheKey, product, CACHE_TTL_SECONDS);
    res.setHeader("X-Cache", "MISS");
    res.status(200).json({ data: product });
  } catch (error) {
    next(error);
  }
}
