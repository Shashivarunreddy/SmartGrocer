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
  const CHUNK_SIZE = 25;

  for (let i = 0; i < products.length; i += CHUNK_SIZE) {
    const chunk = products.slice(i, i + CHUNK_SIZE);

    await Promise.all(
      chunk.map(async (p: any) => {
        if (!p.code || !p.product_name) return;

        const cleanName = String(p.product_name).replace(/\0/g, "").trim().slice(0, 200);
        const cleanBrands = p.brands ? String(p.brands).replace(/\0/g, "").trim().slice(0, 150) : null;
        const tags = Array.isArray(p.categories_tags_en) ? p.categories_tags_en : [];
        const mainCategory = tags.length > 0 ? tags[tags.length - 1] : "Groceries";

        const parsedQty =
          p.product_quantity !== null &&
          p.product_quantity !== undefined &&
          Number.isFinite(Number(p.product_quantity)) &&
          Number(p.product_quantity) >= 0 &&
          Number(p.product_quantity) < 1000000
            ? new Prisma.Decimal(Number(p.product_quantity).toFixed(2))
            : null;

        const rawPrice = Number(p.price);
        const parsedPrice =
          Number.isFinite(rawPrice) && rawPrice > 0 && rawPrice < 10000
            ? new Prisma.Decimal(rawPrice.toFixed(2))
            : new Prisma.Decimal("1.99");

        await prisma.product.upsert({
          where: { code: String(p.code).slice(0, 64) },
          update: {
            name: cleanName,
            brands: cleanBrands,
            category: mainCategory,
            categoriesTags: tags,
            imageUrl: p.image_url || null,
            unit: p.product_quantity_unit || "piece",
            productQuantity: parsedQty,
            defaultUnitPrice: parsedPrice,
            currency: p.currency || "GBP",
            isActive: true,
            isFood: true,
          },
          create: {
            code: String(p.code).slice(0, 64),
            name: cleanName,
            brands: cleanBrands,
            category: mainCategory,
            categoriesTags: tags,
            imageUrl: p.image_url || null,
            unit: p.product_quantity_unit || "piece",
            productQuantity: parsedQty,
            defaultUnitPrice: parsedPrice,
            currency: p.currency || "GBP",
            isActive: true,
            isFood: true,
          },
        });

        count++;
      })
    );

    console.log(`Seeded ${count}/${products.length} products...`);
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
