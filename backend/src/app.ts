import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { clerkMiddleware } from "@clerk/express";
import { ENV } from "./config/env";
import apiV1Router from "./routes";
import adminRouter from "./routes/admin";
import { adminAuth } from "./middlewares/adminAuth";
import { errorHandler } from "./middlewares/errorHandler";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger";

const app = express();

// Security Headers (SEC-11)
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Swagger UI and Admin Dashboard rich assets
    crossOriginEmbedderPolicy: false,
  })
);

// Global Middlewares & Hardened CORS
app.use(
  cors({
    origin: ENV.CORS_ORIGIN === "*" ? true : ENV.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (ENV.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else if (ENV.NODE_ENV === "production") {
  // In production, only log 4xx and 5xx errors to prevent log flooding
  app.use(
    morgan("short", {
      skip: (_req: Request, res: Response) => res.statusCode < 400,
    })
  );
}

// Clerk Authentication Middleware (Attaches auth state to requests)
app.use(
  clerkMiddleware({
    publishableKey: ENV.CLERK_PUBLISHABLE_KEY,
    secretKey: ENV.CLERK_SECRET_KEY,
  })
);

// Mount API v1
app.use("/api/v1", apiV1Router);

// Protected Admin Database Dashboard
app.use("/admin", adminRouter);

// Swagger API Documentation (Protected by Admin Auth in production to prevent schema disclosure - SEC-13)
const swaggerAuthMiddleware = ENV.NODE_ENV === "production" ? adminAuth : (_req: Request, _res: Response, next: () => void) => next();

app.use(
  "/docs",
  swaggerAuthMiddleware,
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "SmartGrocer API Docs",
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "list",
      filter: true,
    },
  })
);

app.get("/docs.json", swaggerAuthMiddleware, (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    code: "NOT_FOUND",
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
