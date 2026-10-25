import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export const recordTripSchema = z.object({
  body: z.object({
    shoppingListId: z.string().uuid().optional(),
    notes: z.string().optional(),
    updatePantry: z.boolean().default(true),
    items: z
      .array(
        z.object({
          productId: z.string().uuid("Valid productId is required"),
          quantity: z.number().positive(),
          unitPrice: z.number().nonnegative(),
        })
      )
      .min(1, "Trip must contain at least one purchased item"),
  }),
});

export async function recordShoppingTrip(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const { shoppingListId, notes, updatePantry, items } = req.body;

    // Calculate actual total
    let actualTotal = 0;
    for (const item of items) {
      actualTotal += Number((item.quantity * item.unitPrice).toFixed(2));
    }
    actualTotal = Number(actualTotal.toFixed(2));

    // Execute in database transaction (as required by DATABASE_SCHEMA.md)
    const trip = await prisma.$transaction(async (tx) => {
      // 1. Create ShoppingTrip
      const createdTrip = await tx.shoppingTrip.create({
        data: {
          userId,
          shoppingListId: shoppingListId || null,
          actualTotal: new Prisma.Decimal(actualTotal),
          currency: req.userProfile!.currency || "GBP",
          notes,
          items: {
            create: items.map((it: any) => ({
              productId: it.productId,
              quantity: new Prisma.Decimal(it.quantity),
              unitPrice: new Prisma.Decimal(it.unitPrice),
              lineTotal: new Prisma.Decimal(Number((it.quantity * it.unitPrice).toFixed(2))),
            })),
          },
        },
        include: {
          items: { include: { product: true } },
        },
      });

      // 2. If linked to shopping list, update list to COMPLETED
      if (shoppingListId) {
        await tx.shoppingList.updateMany({
          where: { id: shoppingListId, userId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
      }

      // 3. If updatePantry is true, add or replenish pantry stock
      if (updatePantry) {
        for (const it of items) {
          const product = await tx.product.findUnique({ where: { id: it.productId } });
          await tx.pantryItem.create({
            data: {
              userId,
              productId: it.productId,
              quantity: new Prisma.Decimal(it.quantity),
              unit: product?.unit || "piece",
              source: "SHOPPING_LIST",
            },
          });
        }
      }

      return createdTrip;
    });

    res.status(201).json({ data: trip });
  } catch (error) {
    next(error);
  }
}

export async function listShoppingTrips(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string, 10) || 10));

    const [total, trips] = await Promise.all([
      prisma.shoppingTrip.count({ where: { userId } }),
      prisma.shoppingTrip.findMany({
        where: { userId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          items: { include: { product: true } },
        },
        orderBy: { purchasedAt: "desc" },
      }),
    ]);

    res.status(200).json({
      data: trips,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getShoppingTripById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const { tripId } = req.params;

    const trip = await prisma.shoppingTrip.findFirst({
      where: { id: tripId, userId },
      include: {
        items: { include: { product: true } },
      },
    });

    if (!trip) {
      res.status(404).json({ code: "TRIP_NOT_FOUND", message: "Shopping trip record not found." });
      return;
    }

    res.status(200).json({ data: trip });
  } catch (error) {
    next(error);
  }
}
