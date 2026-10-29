import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { aiService } from "../services/ai.service";

export async function getReplenishmentRecommendations(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const result = await aiService.getReplenishmentPredictions(userId);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function getWasteRiskAnalysis(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const result = await aiService.getWasteRiskAnalysis(userId);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function getAlternativeSuggestions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { listId } = req.params;
    const result = await aiService.getAlternativesForList(listId);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function getRecipeRecommendations(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const result = await aiService.getRecipeSuggestions(userId);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function scanReceipt(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { image, mimeType } = req.body;
    const result = await aiService.scanReceipt(image, mimeType);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

