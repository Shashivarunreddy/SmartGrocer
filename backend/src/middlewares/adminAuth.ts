import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { ENV } from "../config/env";

/**
 * Basic Authentication middleware for the SmartGrocer Admin Dashboard.
 * Challenges unauthenticated requests with a standard WWW-Authenticate realm.
 */
export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="SmartGrocer Production Admin Area"');
    if (req.path.startsWith("/api") || req.headers.accept?.includes("application/json")) {
      res.status(401).json({ success: false, error: "Unauthorized: Administrator credentials required." });
      return;
    }
    res.status(401).send(`
      <!DOCTYPE html>
      <html>
        <head><title>401 Unauthorized</title></head>
        <body style="font-family: sans-serif; background: #000000; color: #FFFFFF; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center; max-width: 400px; padding: 2rem; border: 1px solid #333333; border-radius: 8px; background: #0a0a0a;">
            <h2 style="color: #FFFFFF; margin-top: 0; text-transform: uppercase;">401 Unauthorized</h2>
            <p style="color: #888888; font-size: 0.85rem; margin: 1rem 0;">Administrator authentication required to access SmartGrocer production database.</p>
            <a href="/admin" style="display: inline-block; padding: 8px 16px; background: #FFFFFF; color: #000000; text-decoration: none; border-radius: 4px; font-weight: 700; font-size: 0.8rem;">LOGIN AGAIN</a>
          </div>
        </body>
      </html>
    `);
    return;
  }

  try {
    const base64Credentials = authHeader.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
    const [username, password] = credentials.split(":");

    const expectedUser = ENV.ADMIN_USERNAME;
    const expectedPass = ENV.ADMIN_PASSWORD;

    const userBuffer = Buffer.from(username || "");
    const passBuffer = Buffer.from(password || "");
    const expectedUserBuffer = Buffer.from(expectedUser);
    const expectedPassBuffer = Buffer.from(expectedPass);

    const userMatches =
      userBuffer.length === expectedUserBuffer.length &&
      crypto.timingSafeEqual(userBuffer, expectedUserBuffer);

    const passMatches =
      passBuffer.length === expectedPassBuffer.length &&
      crypto.timingSafeEqual(passBuffer, expectedPassBuffer);

    if (userMatches && passMatches) {
      next();
      return;
    }
  } catch {
    // Fall through to 401 challenge on parsing error
  }

  res.setHeader("WWW-Authenticate", 'Basic realm="SmartGrocer Production Admin Area"');
  res.status(401).send("Invalid administrator credentials.");
}
