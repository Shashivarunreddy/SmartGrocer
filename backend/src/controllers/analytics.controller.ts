import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export const logConsumptionSchema = z.object({
  body: z.object({
    productId: z.string().uuid("Valid productId is required"),
    pantryItemId: z.string().uuid().optional(),
    quantityConsumed: z.number().nonnegative().default(0),
    quantityWasted: z.number().nonnegative().default(0),
    reason: z.string().optional(),
  }),
});

export async function getAnalyticsSummary(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const userBudget = Number(req.userProfile!.defaultBudget) || 75;
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Fetch user trips, pantry items, and consumption logs concurrently
    const [trips, pantryItems, consumptionLogs] = await Promise.all([
      prisma.shoppingTrip.findMany({
        where: { userId },
        include: {
          items: { include: { product: true } },
          shoppingList: true,
        },
        orderBy: { purchasedAt: "asc" },
      }),
      prisma.pantryItem.findMany({
        where: { userId },
        include: { product: true },
      }),
      prisma.consumptionLog.findMany({
        where: { userId },
        include: { product: true },
      }),
    ]);

    // 2. Spending Calculations
    let lifetimeSpend = 0;
    let thisMonthSpend = 0;
    let underBudgetTripsCount = 0;
    let totalSavingsUnderBudget = 0;
    const categorySpendMap: Record<string, { totalGbp: number; count: number }> = {};
    const monthlyMap: Record<string, { month: string; total: number; tripCount: number }> = {};

    for (const trip of trips) {
      const tripTotal = Number(trip.actualTotal);
      lifetimeSpend += tripTotal;

      const tripDate = new Date(trip.purchasedAt);
      if (tripDate >= startOfCurrentMonth) {
        thisMonthSpend += tripTotal;
      }

      // Budget adherence check
      const tripBudget = trip.shoppingList?.budget ? Number(trip.shoppingList.budget) : userBudget;
      if (tripTotal <= tripBudget) {
        underBudgetTripsCount++;
        totalSavingsUnderBudget += Math.max(0, tripBudget - tripTotal);
      }

      // Group by Month (e.g. "Oct 2026")
      const monthKey = tripDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { month: monthKey, total: 0, tripCount: 0 };
      }
      monthlyMap[monthKey].total += tripTotal;
      monthlyMap[monthKey].tripCount += 1;

      // Group by Product Category
      for (const item of trip.items) {
        const cat = item.product?.category || "Groceries";
        const lineTotal = Number(item.lineTotal);
        if (!categorySpendMap[cat]) {
          categorySpendMap[cat] = { totalGbp: 0, count: 0 };
        }
        categorySpendMap[cat].totalGbp += lineTotal;
        categorySpendMap[cat].count += Number(item.quantity);
      }
    }

    // Format category distribution
    const categoryDistribution = Object.entries(categorySpendMap)
      .map(([category, val]) => ({
        category,
        totalGbp: Number(val.totalGbp.toFixed(2)),
        itemsCount: val.count,
        percentage: lifetimeSpend > 0 ? Number(((val.totalGbp / lifetimeSpend) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.totalGbp - a.totalGbp);

    // 3. Food Waste & Consumption Metrics
    let totalQuantityConsumed = 0;
    let totalQuantityWasted = 0;
    for (const log of consumptionLogs) {
      totalQuantityConsumed += Number(log.quantityConsumed);
      totalQuantityWasted += Number(log.quantityWasted || 0);
    }

    const totalTrackedItems = totalQuantityConsumed + totalQuantityWasted;
    const wasteAvoidanceRate =
      totalTrackedItems > 0
        ? Number(((totalQuantityConsumed / totalTrackedItems) * 100).toFixed(1))
        : 94.5; // Baseline high efficiency

    // 4. Pantry Stock Snapshot
    const fourDaysFromNow = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
    const expiringSoonCount = pantryItems.filter(
      (p) => p.expiryDate && new Date(p.expiryDate) <= fourDaysFromNow
    ).length;

    // 5. Construct Response
    res.status(200).json({
      data: {
        spending: {
          lifetimeSpendGbp: Number(lifetimeSpend.toFixed(2)),
          thisMonthSpendGbp: Number(thisMonthSpend.toFixed(2)),
          totalTripsCount: trips.length,
          targetWeeklyBudgetGbp: userBudget,
          budgetAdherenceRate: trips.length > 0 ? Math.round((underBudgetTripsCount / trips.length) * 100) : 100,
          totalSavedUnderBudgetGbp: Number(totalSavingsUnderBudget.toFixed(2)),
          monthlyHistory: Object.values(monthlyMap),
          categoryDistribution,
        },
        foodWaste: {
          wasteAvoidanceRate, // e.g. 96.2%
          totalQuantityConsumed,
          totalQuantityWasted,
          estimatedMoneySavedGbp: Number((totalQuantityConsumed * 2.25).toFixed(2)),
          pantryTotalStockCount: pantryItems.length,
          expiringSoonCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logConsumption(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const { productId, pantryItemId, quantityConsumed, quantityWasted, reason } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Log event
      const log = await tx.consumptionLog.create({
        data: {
          userId,
          productId,
          pantryItemId: pantryItemId || null,
          quantityConsumed: new Prisma.Decimal(quantityConsumed),
          quantityWasted: new Prisma.Decimal(quantityWasted),
          reason: reason || "Logged from mobile app",
        },
      });

      // 2. Decrement or remove from pantry if linked
      if (pantryItemId) {
        const item = await tx.pantryItem.findUnique({ where: { id: pantryItemId } });
        if (item) {
          const totalLogged = quantityConsumed + quantityWasted;
          const currentQty = Number(item.quantity);
          if (currentQty <= totalLogged) {
            await tx.pantryItem.delete({ where: { id: pantryItemId } });
          } else {
            await tx.pantryItem.update({
              where: { id: pantryItemId },
              data: { quantity: new Prisma.Decimal(currentQty - totalLogged) },
            });
          }
        }
      }

      return log;
    });

    res.status(201).json({ data: result, message: "Consumption logged successfully" });
  } catch (error) {
    next(error);
  }
}
