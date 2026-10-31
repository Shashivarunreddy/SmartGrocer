import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middlewares/auth";
import {
  getReplenishmentRecommendations,
  getWasteRiskAnalysis,
  getAlternativeSuggestions,
  getRecipeRecommendations,
  chatAssistant,
} from "../controllers/recommendation.controller";

const router = Router();

// Throttle AI chat to protect upstream Gemini quota and cloud costs (SEC-10)
const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many AI chat queries. Please wait a minute before asking more questions.",
  },
});

router.get("/replenishments", requireAuth, getReplenishmentRecommendations);
router.get("/waste-risk", requireAuth, getWasteRiskAnalysis);
router.get("/alternatives/:listId", requireAuth, getAlternativeSuggestions);
router.get("/recipes", requireAuth, getRecipeRecommendations);
router.post("/chat", requireAuth, chatRateLimiter, chatAssistant);

export default router;
