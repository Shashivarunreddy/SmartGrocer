import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  getReplenishmentRecommendations,
  getWasteRiskAnalysis,
  getAlternativeSuggestions,
  getRecipeRecommendations,
  scanReceipt,
} from "../controllers/recommendation.controller";

const router = Router();

router.get("/replenishments", requireAuth, getReplenishmentRecommendations);
router.get("/waste-risk", requireAuth, getWasteRiskAnalysis);
router.get("/alternatives/:listId", requireAuth, getAlternativeSuggestions);
router.get("/recipes", requireAuth, getRecipeRecommendations);
router.post("/receipt-scan", requireAuth, scanReceipt);

export default router;
