import { Prisma } from "@prisma/client";
import { prisma } from "../src/config/prisma";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Seeding products catalogue from products.json...");

  const productsJsonPath = path.resolve(__dirname, "../../products.json");
  if (!fs.existsSync(productsJsonPath)) {
    throw new Error(`products.json not found at: ${productsJsonPath}`);
  }

  const fileData = JSON.parse(fs.readFileSync(productsJsonPath, "utf-8"));
  const products = fileData.products || [];

  console.log(`Found ${products.length} products to seed.`);

  let count = 0;
  for (const p of products) {
    if (!p.code || !p.product_name) continue;

    const tags = Array.isArray(p.categories_tags_en) ? p.categories_tags_en : [];
    const mainCategory = tags.length > 0 ? tags[tags.length - 1] : "Groceries";

    await prisma.product.upsert({
      where: { code: String(p.code) },
      update: {
        name: p.product_name,
        brands: p.brands || null,
        category: mainCategory,
        categoriesTags: tags,
        imageUrl: p.image_url || null,
        unit: p.product_quantity_unit || "piece",
        productQuantity: p.product_quantity ? new Prisma.Decimal(p.product_quantity) : null,
        defaultUnitPrice: new Prisma.Decimal(p.price ?? 1.99),
        currency: p.currency || "GBP",
        isActive: true,
        isFood: true,
      },
      create: {
        code: String(p.code),
        name: p.product_name,
        brands: p.brands || null,
        category: mainCategory,
        categoriesTags: tags,
        imageUrl: p.image_url || null,
        unit: p.product_quantity_unit || "piece",
        productQuantity: p.product_quantity ? new Prisma.Decimal(p.product_quantity) : null,
        defaultUnitPrice: new Prisma.Decimal(p.price ?? 1.99),
        currency: p.currency || "GBP",
        isActive: true,
        isFood: true,
      },
    });

    count++;
  }

  console.log(`Successfully seeded ${count} products into the database.`);
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
