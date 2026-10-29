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
    res.status(401).send(`
      <!DOCTYPE html>
      <html>
        <head><title>401 Unauthorized</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center; max-width: 400px; padding: 2rem; border: 1px solid #334155; border-radius: 12px; background: #1e293b;">
            <h2 style="color: #ef4444; margin-top: 0;">401 Unauthorized</h2>
            <p style="color: #94a3b8;">Administrator authentication required to access SmartGrocer production database.</p>
            <a href="/admin" style="display: inline-block; margin-top: 1rem; padding: 8px 16px; background: #10b981; color: white; text-decoration: none; border-radius: 6px;">Try Again</a>
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
