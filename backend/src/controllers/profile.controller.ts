import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { prisma } from "../config/prisma";
import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z.object({
    displayName: z.string().optional(),
    householdSize: z.number().int().positive().optional(),
    defaultBudget: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    shoppingFrequencyDays: z.number().int().positive().optional(),
    dietaryPreferences: z.any().optional(),
    allergies: z.any().optional(),
  }),
});

export async function getProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profile = req.userProfile!;
    res.status(200).json({ data: profile });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profileId = req.userProfile!.id;
    const {
      displayName,
      householdSize,
      defaultBudget,
      currency,
      shoppingFrequencyDays,
      dietaryPreferences,
      allergies,
    } = req.body;

    const updated = await prisma.userProfile.update({
      where: { id: profileId },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(householdSize !== undefined && { householdSize }),
        ...(defaultBudget !== undefined && { defaultBudget }),
        ...(currency !== undefined && { currency }),
        ...(shoppingFrequencyDays !== undefined && { shoppingFrequencyDays }),
        ...(dietaryPreferences !== undefined && { dietaryPreferences }),
        ...(allergies !== undefined && { allergies }),
      },
    });

    // Automatically synchronize any active shopping list with the new target budget and household size
    if (defaultBudget !== undefined || householdSize !== undefined) {
      await prisma.shoppingList.updateMany({
        where: { userId: profileId, status: "ACTIVE" },
        data: {
          ...(defaultBudget !== undefined && { budget: defaultBudget }),
          ...(householdSize !== undefined && { householdSizeSnapshot: householdSize }),
        },
      });
    }

    res.status(200).json({ data: updated });
  } catch (error) {
    next(error);
  }
}
