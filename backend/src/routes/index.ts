import { Router } from "express";
import healthRoutes from "./health.routes";
import productRoutes from "./product.routes";
import profileRoutes from "./profile.routes";
import shoppingListRoutes from "./shoppingList.routes";
import pantryRoutes from "./pantry.routes";
import shoppingTripRoutes from "./shoppingTrip.routes";
import recommendationRoutes from "./recommendation.routes";

const apiV1Router = Router();

apiV1Router.use("/", healthRoutes);
apiV1Router.use("/products", productRoutes);
apiV1Router.use("/profile", profileRoutes);
apiV1Router.use("/shopping-lists", shoppingListRoutes);
apiV1Router.use("/pantry", pantryRoutes);
apiV1Router.use("/shopping-trips", shoppingTripRoutes);
apiV1Router.use("/recommendations", recommendationRoutes);

export default apiV1Router;
