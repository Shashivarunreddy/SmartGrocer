import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../src/config/prisma";
import { createClerkClient } from "@clerk/express";
import { ENV } from "../src/config/env";

const clerk = createClerkClient({ secretKey: ENV.CLERK_SECRET_KEY });

// User profiles configuration
const USER_PROFILES_CONFIG = [
  {
    email: "user1@gmail.com",
    displayName: "Oliver Smith",
    householdSize: 3,
    budget: 85.0,
    diet: ["Standard"],
    allergies: [],
    shoppingDays: 7,
  },
  {
    email: "user2@gmail.com",
    displayName: "Emma Jones",
    householdSize: 2,
    budget: 65.0,
    diet: ["Vegetarian"],
    allergies: [],
    shoppingDays: 7,
  },
  {
    email: "user3@gmail.com",
    displayName: "George Taylor",
    householdSize: 1,
    budget: 50.0,
    diet: ["Vegan"],
    allergies: ["Dairy"],
    shoppingDays: 5,
  },
  {
    email: "user4@gmail.com",
    displayName: "Sophia Brown",
    householdSize: 4,
    budget: 110.0,
    diet: ["Gluten-Free"],
    allergies: ["Gluten"],
    shoppingDays: 7,
  },
  {
    email: "user5@gmail.com",
    displayName: "Harry Wilson",
    householdSize: 2,
    budget: 70.0,
    diet: ["Dairy-Free"],
    allergies: ["Lactose"],
    shoppingDays: 6,
  },
  {
    email: "user6@gmail.com",
    displayName: "Amelia Evans",
    householdSize: 1,
    budget: 45.0,
    diet: ["Standard"],
    allergies: ["Nut Allergy"],
    shoppingDays: 7,
  },
  {
    email: "user7@gmail.com",
    displayName: "Jack Davies",
    householdSize: 1,
    budget: 35.0,
    diet: ["Budget-Conscious"],
    allergies: [],
    shoppingDays: 5,
  },
  {
    email: "user8@gmail.com",
    displayName: "Isla Thomas",
    householdSize: 2,
    budget: 95.0,
    diet: ["High-Protein", "Fitness"],
    allergies: [],
    shoppingDays: 6,
  },
  {
    email: "user9@gmail.com",
    displayName: "Leo Roberts",
    householdSize: 5,
    budget: 135.0,
    diet: ["Family"],
    allergies: [],
    shoppingDays: 7,
  },
  {
    email: "user10@gmail.com",
    displayName: "Mia Walker",
    householdSize: 2,
    budget: 80.0,
    diet: ["Organic", "Zero-Waste"],
    allergies: [],
    shoppingDays: 7,
  },
];

async function main() {
  console.log("Fetching Clerk users via SDK...");
  const clerkUsers = await clerk.users.getUserList({ limit: 50 });
  console.log(`Found ${clerkUsers.data.length} users in Clerk.`);

  // Load products from DB for seeding items
  const allProducts = await prisma.product.findMany({
    take: 300,
    where: { isActive: true },
  });

  if (allProducts.length === 0) {
    throw new Error("No products found in DB! Please run product seeding first.");
  }

  console.log(`Loaded ${allProducts.length} catalogue products for seeding user data.`);

  const now = new Date();

  for (const config of USER_PROFILES_CONFIG) {
    const clerkUser = clerkUsers.data.find((u) =>
      u.emailAddresses.some((e) => e.emailAddress.toLowerCase() === config.email.toLowerCase())
    );

    if (!clerkUser) {
      console.log(`Skipping ${config.email} (not found in Clerk).`);
      continue;
    }

    const clerkUserId = clerkUser.id;
    console.log(`\nSeeding rich data for ${config.displayName} (${config.email}) [${clerkUserId}]...`);

    // 1. Create or update UserProfile
    const profile = await prisma.userProfile.upsert({
      where: { clerkUserId },
      update: {
        displayName: config.displayName,
        householdSize: config.householdSize,
        defaultBudget: new Prisma.Decimal(config.budget),
        currency: "GBP",
        shoppingFrequencyDays: config.shoppingDays,
        dietaryPreferences: config.diet,
        allergies: config.allergies,
      },
      create: {
        clerkUserId,
        displayName: config.displayName,
        householdSize: config.householdSize,
        defaultBudget: new Prisma.Decimal(config.budget),
        currency: "GBP",
        shoppingFrequencyDays: config.shoppingDays,
        dietaryPreferences: config.diet,
        allergies: config.allergies,
      },
    });

    const userId = profile.id;

    // Clean existing user data to ensure clean idempotency
    await prisma.pantryItem.deleteMany({ where: { userId } });
    await prisma.shoppingTrip.deleteMany({ where: { userId } });
    await prisma.shoppingList.deleteMany({ where: { userId } });

    // Pick 12 unique products for this user (with offset based on user index)
    const userIndex = USER_PROFILES_CONFIG.indexOf(config);
    const startIdx = (userIndex * 15) % (allProducts.length - 20);
    const userProducts = allProducts.slice(startIdx, startIdx + 15);

    // 2. Seed 3 Past Shopping Trips (Days ago: 19, 12, 5)
    const tripDaysAgo = [19, 12, 5];
    for (let t = 0; t < tripDaysAgo.length; t++) {
      const days = tripDaysAgo[t];
      const tripDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const tripItemsSlice = userProducts.slice(t * 3, t * 3 + 4);

      let tripTotal = 0;
      const tripItemsData = tripItemsSlice.map((p) => {
        const qty = t === 0 ? 2 : 1;
        const price = Number(p.defaultUnitPrice) || 2.0;
        const line = Number((qty * price).toFixed(2));
        tripTotal += line;
        return {
          productId: p.id,
          quantity: new Prisma.Decimal(qty),
          unitPrice: new Prisma.Decimal(price),
          lineTotal: new Prisma.Decimal(line),
        };
      });

      const trip = await prisma.shoppingTrip.create({
        data: {
          userId,
          purchasedAt: tripDate,
          actualTotal: new Prisma.Decimal(tripTotal.toFixed(2)),
          currency: "GBP",
          notes: `Weekly shop (${days} days ago)`,
          items: {
            create: tripItemsData,
          },
        },
      });
    }

    // 3. Seed 8 Active Pantry Items (Some expiring soon, some fresh, some staples)
    const pantryProducts = userProducts.slice(0, 8);
    for (let pIdx = 0; pIdx < pantryProducts.length; pIdx++) {
      const prod = pantryProducts[pIdx];
      let expiryDays = 14;

      if (pIdx === 0) expiryDays = 1; // Expiring tomorrow! (Critical)
      else if (pIdx === 1) expiryDays = 3; // Expiring in 3 days! (High Risk)
      else if (pIdx === 2) expiryDays = 6; // Moderate
      else if (pIdx >= 3 && pIdx <= 5) expiryDays = 10;
      else expiryDays = 45; // Long life staple

      const expiryDate = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

      await prisma.pantryItem.create({
        data: {
          userId,
          productId: prod.id,
          quantity: new Prisma.Decimal(pIdx === 0 ? 1 : 2),
          unit: prod.unit || "piece",
          purchasedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
          expiryDate,
          source: "SHOPPING_LIST",
        },
      });
    }

    // 4. Seed 1 Active Shopping List with 5 items
    const listProducts = userProducts.slice(6, 11);
    const listItemsData = listProducts.map((p) => ({
      productId: p.id,
      quantity: new Prisma.Decimal(1),
      unitPriceSnapshot: p.defaultUnitPrice,
      isPurchased: false,
    }));

    await prisma.shoppingList.create({
      data: {
        userId,
        name: "Weekly Essentials",
        status: "ACTIVE",
        budget: new Prisma.Decimal(config.budget),
        currency: "GBP",
        householdSizeSnapshot: config.householdSize,
        items: {
          create: listItemsData,
        },
      },
    });

    console.log(`✓ Seeded ${config.displayName}: 3 trips, 8 pantry items, 1 active list.`);
  }

  console.log("\n=======================================================");
  console.log("🎉 Successfully seeded all 10 users with full AI data!");
  console.log("=======================================================");
}

main()
  .catch((e) => {
    console.error("Error seeding users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

