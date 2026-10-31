import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { prisma } from "../config/prisma";
import { UserProfile } from "@prisma/client";

// Extend Express Request to include our resolved internal UserProfile
export interface AuthenticatedRequest extends Request {
  auth?: ReturnType<typeof getAuth>;
  userProfile?: UserProfile;
}

/**
 * Middleware that requires a verified Clerk user token.
 * Extracts clerkUserId, verifies it, and finds or auto-creates the internal UserProfile.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const auth = getAuth(req);

    if (!auth || !auth.userId) {
      res.status(401).json({
        code: "UNAUTHENTICATED",
        message: "Authentication token is missing or invalid. Please sign in via Clerk.",
      });
      return;
    }

    const clerkUserId = auth.userId;

    // Find or auto-create internal UserProfile (as specified in AUTH_AND_SECURITY.md)
    let userProfile = await prisma.userProfile.findUnique({
      where: { clerkUserId },
    });

    if (!userProfile) {
      try {
        userProfile = await prisma.userProfile.upsert({
          where: { clerkUserId },
          update: {},
          create: {
            clerkUserId,
            householdSize: 1,
            currency: "GBP",
          },
        });
      } catch (err: any) {
        // Handle race condition when multiple parallel requests try to create the profile simultaneously
        if (err.code === "P2002" || err.message?.includes("Unique constraint")) {
          userProfile = await prisma.userProfile.findUnique({
            where: { clerkUserId },
          });
        } else {
          throw err;
        }
      }
    }

    if (!userProfile) {
      res.status(500).json({
        code: "USER_PROFILE_NOT_FOUND",
        message: "Failed to initialize or retrieve user profile.",
      });
      return;
    }

    req.userProfile = userProfile;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      code: "AUTH_VERIFICATION_FAILED",
      message: "An error occurred while verifying authentication credentials.",
    });
  }
}
