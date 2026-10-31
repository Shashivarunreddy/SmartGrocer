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

export async function chatAssistant(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Message string is required." });
      return;
    }
    const result = await aiService.chatWithAssistant(userId, message);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

