import { Router } from "express";
import { listProducts, getProductById } from "../controllers/product.controller";
import { optionalAuth } from "../middlewares/auth";

const router = Router();

router.get("/", optionalAuth, listProducts);
router.get("/:productId", optionalAuth, getProductById);

export default router;
