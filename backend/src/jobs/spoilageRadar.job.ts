import cron from "node-cron";
import { prisma } from "../config/prisma";
import { cacheSet, cacheGet } from "../config/redis";

export interface SpoilageDigest {
  userId: string;
  householdName: string;
  calculatedAt: string;
  totalPantryItems: number;
  expiringItemsCount: number;
  criticalItemsCount: number; // <= 2 days
  estimatedWasteValueGbp: number;
  urgencyLevel: "CRITICAL" | "WARNING" | "NORMAL";
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unit: string;
    daysLeft: number;
    unitPrice: number;
    estimatedLossGbp: number;
  }>;
  morningTip: string;
}

/**
 * Recalculates household spoilage risk for all active users
 */
export async function runSpoilageRadarJob(): Promise<{
  processedHouseholds: number;
  totalExpiringItems: number;
  totalPotentialLossGbp: number;
  durationMs: number;
}> {
  const startTime = Date.now();
  console.log("[SpoilageRadar Cron] Starting nightly automated spoilage radar calculation...");

  let totalExpiringCount = 0;
  let totalPotentialLoss = 0;

  try {
    const users = await prisma.userProfile.findMany({
      include: {
        pantryItems: {
          include: { product: true },
        },
      },
    });

    const now = new Date();

    for (const user of users) {
      const expiringItems: SpoilageDigest["items"] = [];
      let userWasteValue = 0;
      let criticalCount = 0;

      for (const item of user.pantryItems) {
        if (!item.expiryDate) continue;

        const diffTime = new Date(item.expiryDate).getTime() - now.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysLeft <= 4) {
          const unitPrice = Number(item.product?.defaultUnitPrice || 1.5);
          const loss = Number((unitPrice * Number(item.quantity)).toFixed(2));
          userWasteValue += loss;

          if (daysLeft <= 2) {
            criticalCount++;
          }

          expiringItems.push({
            id: item.id,
            productName: item.product.name,
            quantity: Number(item.quantity),
            unit: item.unit || item.product.unit || "unit",
            daysLeft,
            unitPrice,
            estimatedLossGbp: loss,
          });
        }
      }

      // Sort soonest expiring first
      expiringItems.sort((a, b) => a.daysLeft - b.daysLeft);

      totalExpiringCount += expiringItems.length;
      totalPotentialLoss += userWasteValue;

      let urgencyLevel: SpoilageDigest["urgencyLevel"] = "NORMAL";
      if (criticalCount > 0) urgencyLevel = "CRITICAL";
      else if (expiringItems.length > 0) urgencyLevel = "WARNING";

      let morningTip = "Your pantry is looking fresh and well-stocked today!";
      if (criticalCount > 0) {
        morningTip = `⚠️ You have ${criticalCount} item(s) expiring within 48 hours. Consider cooking with them today to avoid £${userWasteValue.toFixed(2)} in food waste!`;
      } else if (expiringItems.length > 0) {
        morningTip = `💡 You have ${expiringItems.length} item(s) nearing best-before dates this week. Check your Chef Gemini recipes!`;
      }

      const digest: SpoilageDigest = {
        userId: user.id,
        householdName: user.displayName || "Household",
        calculatedAt: new Date().toISOString(),
        totalPantryItems: user.pantryItems.length,
        expiringItemsCount: expiringItems.length,
        criticalItemsCount: criticalCount,
        estimatedWasteValueGbp: Number(userWasteValue.toFixed(2)),
        urgencyLevel,
        items: expiringItems,
        morningTip,
      };

      // Store in Redis / Cache with 24-hour TTL (86400s)
      await cacheSet(`spoilage:digest:${user.id}`, digest, 86400);
      await cacheSet(`spoilage:digest:${user.clerkUserId}`, digest, 86400);
    }

    const durationMs = Date.now() - startTime;
    console.log(
      `[SpoilageRadar Cron] Finished in ${durationMs}ms: Processed ${users.length} households, ` +
        `flagged ${totalExpiringCount} expiring items (£${totalPotentialLoss.toFixed(2)} total value).`
    );

    return {
      processedHouseholds: users.length,
      totalExpiringItems: totalExpiringCount,
      totalPotentialLossGbp: Number(totalPotentialLoss.toFixed(2)),
      durationMs,
    };
  } catch (error: any) {
    console.error("[SpoilageRadar Cron] Error during execution:", error.message);
    throw error;
  }
}

/**
 * Initializes the automated nightly cron schedule (06:00 UTC daily)
 */
export function initSpoilageRadarCron() {
  // Run every day at 06:00 UTC ('0 6 * * *')
  cron.schedule("0 6 * * *", async () => {
    try {
      await runSpoilageRadarJob();
    } catch (err: any) {
      console.error("[SpoilageRadar Cron] Scheduled job failed:", err.message);
    }
  });

  console.log("[SpoilageRadar Cron] Scheduled nightly background radar job at 06:00 UTC.");

  // Run a quick background warm-up after 5 seconds
  setTimeout(async () => {
    try {
      await runSpoilageRadarJob();
    } catch (err: any) {
      console.warn("[SpoilageRadar Cron] Warmup run skipped:", err.message);
    }
  }, 5000);
}
