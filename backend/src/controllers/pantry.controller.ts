import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export const addPantryItemSchema = z.object({
  body: z.object({
    productId: z.string().uuid("Valid productId is required"),
    quantity: z.coerce.number().min(0, "Quantity must be non-negative").default(1),
    unit: z.string().optional(),
    expiryDate: z.string().datetime().optional().nullable(),
  }),
});

export const updatePantryItemSchema = z.object({
  body: z.object({
    quantity: z.coerce.number().min(0).optional(),
    expiryDate: z.string().datetime().optional().nullable(),
  }),
});

export async function listPantryItems(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const items = await prisma.pantryItem.findMany({
      where: { userId },
      include: { product: true },
      orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
    });

    res.status(200).json({ data: items });
  } catch (error) {
    next(error);
  }
}

export async function addPantryItem(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const { productId, quantity, unit, expiryDate } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      res.status(404).json({ code: "PRODUCT_NOT_FOUND", message: "Product not found." });
      return;
    }

    const newItem = await prisma.pantryItem.create({
      data: {
        userId,
        productId,
        quantity: new Prisma.Decimal(quantity ?? 1),
        unit: unit || product.unit || "piece",
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        source: "MANUAL",
      },
      include: { product: true },
    });

    res.status(201).json({ data: newItem });
  } catch (error) {
    next(error);
  }
}

export async function updatePantryItem(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const { pantryItemId } = req.params;
    const { quantity, expiryDate } = req.body;

    const item = await prisma.pantryItem.findFirst({
      where: { id: pantryItemId, userId },
    });

    if (!item) {
      res.status(404).json({ code: "ITEM_NOT_FOUND", message: "Pantry item not found." });
      return;
    }

    const updated = await prisma.pantryItem.update({
      where: { id: pantryItemId },
      data: {
        ...(quantity !== undefined && { quantity: new Prisma.Decimal(quantity) }),
        ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
      },
      include: { product: true },
    });

    res.status(200).json({ data: updated });
  } catch (error) {
    next(error);
  }
}

export async function deletePantryItem(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const { pantryItemId } = req.params;

    const item = await prisma.pantryItem.findFirst({
      where: { id: pantryItemId, userId },
    });

    if (!item) {
      res.status(404).json({ code: "ITEM_NOT_FOUND", message: "Pantry item not found." });
      return;
    }

    await prisma.pantryItem.delete({
      where: { id: pantryItemId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getExpiringPantryItems(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const days = parseInt(req.query.days as string, 10) || 7;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    const items = await prisma.pantryItem.findMany({
      where: {
        userId,
        quantity: { gt: 0 },
        expiryDate: {
          not: null,
          lte: targetDate,
        },
      },
      include: { product: true },
      orderBy: { expiryDate: "asc" },
    });

    res.status(200).json({ data: items });
  } catch (error) {
    next(error);
  }
}
