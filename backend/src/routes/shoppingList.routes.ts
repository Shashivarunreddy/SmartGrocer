import { Router } from "express";
import {
  listShoppingLists,
  createShoppingList,
  getShoppingListById,
  updateShoppingList,
  deleteShoppingList,
  addItemToList,
  updateListItem,
  deleteListItem,
  calculateEstimate,
  createListSchema,
  addListItemSchema,
  updateListItemSchema,
} from "../controllers/shoppingList.controller";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";

const router = Router();

router.use(requireAuth);

router.get("/", listShoppingLists);
router.post("/", validate(createListSchema), createShoppingList);
router.get("/:listId", getShoppingListById);
router.patch("/:listId", updateShoppingList);
router.delete("/:listId", deleteShoppingList);

// List items
router.post("/:listId/items", validate(addListItemSchema), addItemToList);
router.patch("/:listId/items/:itemId", validate(updateListItemSchema), updateListItem);
router.delete("/:listId/items/:itemId", deleteListItem);

// Bill estimation
router.post("/:listId/estimate", calculateEstimate);

export default router;
