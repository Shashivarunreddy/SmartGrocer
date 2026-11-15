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
    isOnboarded: z.boolean().optional(),
  }),
});

export async function getProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profile = req.userProfile!;
    const isOnboarded = Boolean(
      profile.isOnboarded ||
      (profile.defaultBudget !== null &&
        Number(profile.defaultBudget) > 0 &&
        profile.householdSize &&
        Number(profile.householdSize) >= 1)
    );
    res.status(200).json({ data: { ...profile, isOnboarded } });
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
      isOnboarded,
    } = req.body;

    const shouldMarkOnboarded =
      isOnboarded !== undefined
        ? isOnboarded
        : (householdSize !== undefined && householdSize > 0 && defaultBudget !== undefined && defaultBudget > 0);

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
        ...(shouldMarkOnboarded && { isOnboarded: true }),
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

    const calculatedOnboarded = Boolean(
      updated.isOnboarded ||
      (updated.defaultBudget !== null &&
        Number(updated.defaultBudget) > 0 &&
        updated.householdSize &&
        Number(updated.householdSize) >= 1)
    );

    res.status(200).json({ data: { ...updated, isOnboarded: calculatedOnboarded } });
  } catch (error) {
    next(error);
  }
}
