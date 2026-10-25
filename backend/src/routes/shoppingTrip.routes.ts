import { Router } from "express";
import {
  recordShoppingTrip,
  listShoppingTrips,
  getShoppingTripById,
  recordTripSchema,
} from "../controllers/shoppingTrip.controller";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";

const router = Router();

router.use(requireAuth);

router.post("/", validate(recordTripSchema), recordShoppingTrip);
router.get("/", listShoppingTrips);
router.get("/:tripId", getShoppingTripById);

export default router;
