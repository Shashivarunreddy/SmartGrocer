import { Router } from "express";
import {
  getAnalyticsSummary,
  logConsumption,
  logConsumptionSchema,
} from "../controllers/analytics.controller";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";

const router = Router();

router.use(requireAuth);

router.get("/summary", getAnalyticsSummary);
router.post("/consumption", validate(logConsumptionSchema), logConsumption);

export default router;
