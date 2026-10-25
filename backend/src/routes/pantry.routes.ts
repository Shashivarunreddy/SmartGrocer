import { Router } from "express";
import {
  listPantryItems,
  addPantryItem,
  updatePantryItem,
  deletePantryItem,
  getExpiringPantryItems,
  addPantryItemSchema,
  updatePantryItemSchema,
} from "../controllers/pantry.controller";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";

const router = Router();

router.use(requireAuth);

router.get("/expiring", getExpiringPantryItems);
router.get("/", listPantryItems);
router.post("/", validate(addPantryItemSchema), addPantryItem);
router.patch("/:pantryItemId", validate(updatePantryItemSchema), updatePantryItem);
router.delete("/:pantryItemId", deletePantryItem);

export default router;
