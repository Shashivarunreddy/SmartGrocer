import { Router } from "express";
import { listProducts, getProductById } from "../controllers/product.controller";

const router = Router();

router.get("/", listProducts);
router.get("/:productId", getProductById);

export default router;
