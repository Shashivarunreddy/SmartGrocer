import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  getReplenishmentRecommendations,
  getWasteRiskAnalysis,
  getAlternativeSuggestions,
} from "../controllers/recommendation.controller";

const router = Router();

router.get("/replenishments", requireAuth, getReplenishmentRecommendations);
router.get("/waste-risk", requireAuth, getWasteRiskAnalysis);
router.get("/alternatives/:listId", requireAuth, getAlternativeSuggestions);

export default router;
