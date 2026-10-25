import { Router } from "express";
import { getProfile, updateProfile, updateProfileSchema } from "../controllers/profile.controller";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";

const router = Router();

router.use(requireAuth);
router.get("/", getProfile);
router.patch("/", validate(updateProfileSchema), updateProfile);

export default router;
