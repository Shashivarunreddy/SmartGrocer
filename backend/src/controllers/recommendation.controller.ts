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
    const userId = req.userProfile!.id;
    const { listId } = req.params;
    const result = await aiService.getAlternativesForList(listId, userId);
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
    const mealType = typeof req.query.mealType === "string" ? req.query.mealType : undefined;
    const query = typeof req.query.query === "string" ? req.query.query : undefined;
    const refresh = req.query.refresh === "true";

    const result = await aiService.getRecipeSuggestions(userId, {
      mealType,
      query,
      refresh,
    });
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function getAllRecipeIngredients(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userProfile!.id;
    const { recipeTitle, ingredients } = req.body || {};

    if (!recipeTitle || !Array.isArray(ingredients)) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "recipeTitle and ingredients array are required.",
      });
      return;
    }

    const result = await aiService.getAllRecipeIngredientsToList(userId, {
      recipeTitle,
      ingredients,
    });
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
    const userId = req.userProfile?.id || "guest";
    const { message, history } = req.body;
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Message string is required." });
      return;
    }
    const result = await aiService.chatWithAssistant(userId, message, history);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

