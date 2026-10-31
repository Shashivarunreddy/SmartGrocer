import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export const createListSchema = z.object({
  body: z.object({
    name: z.string().min(1, "List name is required"),
    budget: z.coerce.number().positive().optional(),
    currency: z.string().length(3).optional(),
  }),
});

export const addListItemSchema = z.object({
  body: z.object({
    productId: z.string().uuid("Valid productId is required"),
    quantity: z.coerce.number().positive("Quantity must be positive").default(1),
    notes: z.string().optional(),
  }),
});

export const updateListItemSchema = z.object({
  body: z.object({
    quantity: z.coerce.number().positive().optional(),
    isPurchased: z.boolean().optional(),
    notes: z.string().optional(),
  }),
});

export async function listShoppingLists(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const { status } = req.query;

    const where: Prisma.ShoppingListWhereInput = {
      userId,
      ...(status ? { status: status as any } : {}),
    };

    const lists = await prisma.shoppingList.findMany({
      where,
      include: {
        _count: { select: { items: true } },
        items: {
          include: { product: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const deduplicatedLists = lists.map((list) => {
      const uniqueItemsMap = new Map<string, any>();
      for (const item of list.items) {
        if (!uniqueItemsMap.has(item.productId)) {
          uniqueItemsMap.set(item.productId, { ...item });
        } else {
          const existing = uniqueItemsMap.get(item.productId)!;
          existing.quantity = new Prisma.Decimal(
            Number(existing.quantity) + Number(item.quantity)
          );
        }
      }
      const uniqueItems = Array.from(uniqueItemsMap.values());
      return {
        ...list,
        items: uniqueItems,
        _count: { items: uniqueItems.length },
      };
    });

    res.status(200).json({ data: deduplicatedLists });
  } catch (error) {
    next(error);
  }
}

export async function createShoppingList(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profile = req.userProfile!;
    const { name, budget, currency } = req.body;

    const newList = await prisma.shoppingList.create({
      data: {
        userId: profile.id,
        name,
        budget: budget ? new Prisma.Decimal(budget) : profile.defaultBudget,
        currency: currency || profile.currency || "GBP",
        householdSizeSnapshot: profile.householdSize,
      },
    });

    res.status(201).json({ data: newList });
  } catch (error) {
    next(error);
  }
}

export async function getShoppingListById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const { listId } = req.params;

    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId },
      include: {
        items: {
          include: { product: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!list) {
      res.status(404).json({
        code: "LIST_NOT_FOUND",
        message: "Shopping list not found or unauthorized.",
      });
      return;
    }

    // Merge any duplicate rows for the same product and asynchronously clean up DB
    const uniqueItemsMap = new Map<string, any>();
    const duplicateIdsToDelete: string[] = [];

    for (const item of list.items) {
      if (!uniqueItemsMap.has(item.productId)) {
        uniqueItemsMap.set(item.productId, { ...item });
      } else {
        const existing = uniqueItemsMap.get(item.productId)!;
        existing.quantity = new Prisma.Decimal(
          Number(existing.quantity) + Number(item.quantity)
        );
        duplicateIdsToDelete.push(item.id);
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      prisma.shoppingListItem
        .deleteMany({ where: { id: { in: duplicateIdsToDelete } } })
        .catch(() => {});
    }

    const deduplicatedList = {
      ...list,
      items: Array.from(uniqueItemsMap.values()),
    };

    res.status(200).json({ data: deduplicatedList });
  } catch (error) {
    next(error);
  }
}

export async function updateShoppingList(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const { listId } = req.params;
    const { name, status, budget } = req.body;

    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId },
    });

    if (!list) {
      res.status(404).json({
        code: "LIST_NOT_FOUND",
        message: "Shopping list not found.",
      });
      return;
    }

    const updated = await prisma.shoppingList.update({
      where: { id: listId },
      data: {
        ...(name && { name }),
        ...(status && { status }),
        ...(budget !== undefined && { budget: new Prisma.Decimal(budget) }),
        ...(status === "COMPLETED" && { completedAt: new Date() }),
      },
    });

    res.status(200).json({ data: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteShoppingList(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const { listId } = req.params;

    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId },
    });

    if (!list) {
      res.status(404).json({
        code: "LIST_NOT_FOUND",
        message: "Shopping list not found.",
      });
      return;
    }

    await prisma.shoppingList.delete({
      where: { id: listId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function addItemToList(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const { listId } = req.params;
    const { productId, quantity, notes } = req.body;

    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId },
    });

    if (!list) {
      res.status(404).json({ code: "LIST_NOT_FOUND", message: "Shopping list not found." });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      res.status(404).json({ code: "PRODUCT_NOT_FOUND", message: "Product not found." });
      return;
    }

    const qtyToAdd = Number(quantity) || 1;

    // Check if this product is ALREADY in the shopping list
    const existingItems = await prisma.shoppingListItem.findMany({
      where: {
        shoppingListId: listId,
        productId,
      },
      include: { product: true },
      orderBy: { createdAt: "asc" },
    });

    if (existingItems.length > 0) {
      const [primaryItem, ...duplicateItems] = existingItems;
      let totalQty = Number(primaryItem.quantity) + qtyToAdd;

      // Clean up any historical duplicate rows if they existed
      for (const dup of duplicateItems) {
        totalQty += Number(dup.quantity);
        await prisma.shoppingListItem.delete({ where: { id: dup.id } }).catch(() => {});
      }

      const updated = await prisma.shoppingListItem.update({
        where: { id: primaryItem.id },
        data: {
          quantity: new Prisma.Decimal(totalQty),
          ...(notes && { notes }),
        },
        include: { product: true },
      });

      res.status(200).json({ data: updated, action: "INCREMENTED" });
      return;
    }

    const item = await prisma.shoppingListItem.create({
      data: {
        shoppingListId: listId,
        productId,
        quantity: new Prisma.Decimal(qtyToAdd),
        unitPriceSnapshot: product.defaultUnitPrice,
        notes,
      },
      include: { product: true },
    });

    res.status(201).json({ data: item, action: "CREATED" });
  } catch (error) {
    next(error);
  }
}

export async function updateListItem(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const { listId, itemId } = req.params;
    const { quantity, isPurchased, notes } = req.body;

    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId },
    });

    if (!list) {
      res.status(404).json({ code: "LIST_NOT_FOUND", message: "Shopping list not found." });
      return;
    }

    const updated = await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: {
        ...(quantity !== undefined && { quantity: new Prisma.Decimal(quantity) }),
        ...(isPurchased !== undefined && { isPurchased }),
        ...(notes !== undefined && { notes }),
      },
      include: { product: true },
    });

    res.status(200).json({ data: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteListItem(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const { listId, itemId } = req.params;

    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId },
    });

    if (!list) {
      res.status(404).json({ code: "LIST_NOT_FOUND", message: "Shopping list not found." });
      return;
    }

    await prisma.shoppingListItem.delete({
      where: { id: itemId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Calculates the estimated bill for a shopping list.
 * Requirements from PRD & API_SPEC:
 * - Deterministic money calculations
 * - Subtotal, estimated total, budget, remaining budget, budget overrun warning
 */
export async function calculateEstimate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const { listId } = req.params;

    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!list) {
      res.status(404).json({ code: "LIST_NOT_FOUND", message: "Shopping list not found." });
      return;
    }

    let estimatedTotal = 0;
    const itemBreakdown = list.items.map((item) => {
      const qty = Number(item.quantity);
      const unitPrice = Number(item.unitPriceSnapshot);
      const lineTotal = Number((qty * unitPrice).toFixed(2));
      estimatedTotal += lineTotal;

      return {
        itemId: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: qty,
        unitPrice,
        lineTotal,
      };
    });

    estimatedTotal = Number(estimatedTotal.toFixed(2));
    const budget = list.budget ? Number(list.budget) : null;
    const remainingBudget = budget !== null ? Number((budget - estimatedTotal).toFixed(2)) : null;
    const isOverBudget = budget !== null ? estimatedTotal > budget : false;

    res.status(200).json({
      data: {
        listId: list.id,
        listName: list.name,
        currency: list.currency,
        itemCount: list.items.length,
        estimatedTotal,
        budget,
        remainingBudget,
        isOverBudget,
        warning: isOverBudget
          ? `Estimated total exceeds your budget by £${(estimatedTotal - (budget || 0)).toFixed(2)}.`
          : null,
        breakdown: itemBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
}
