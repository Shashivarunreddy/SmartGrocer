import { prisma } from "../config/prisma";
import { classifyProductDietary } from "../utils/dietary";

async function backfillDietaryTags() {
  console.log("Starting dietary tags backfill for all products in database...");

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      categoriesTags: true,
      category: true,
    },
  });

  console.log(`Found ${products.length} products to classify.`);

  let updatedCount = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const chunk = products.slice(i, i + BATCH_SIZE);

    await Promise.all(
      chunk.map(async (p) => {
        const { tags } = classifyProductDietary({
          name: p.name,
          categoriesTags: p.categoriesTags,
          category: p.category,
        });

        await prisma.product.update({
          where: { id: p.id },
          data: { dietaryTags: tags },
        });
        updatedCount++;
      })
    );

    console.log(`Processed ${updatedCount}/${products.length} products...`);
  }

  console.log(`Successfully backfilled dietary tags for all ${updatedCount} products!`);
}

backfillDietaryTags()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

