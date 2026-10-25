import { Request, Response } from "express";
import { prisma } from "../config/prisma";

export async function getHealth(req: Request, res: Response): Promise<void> {
  let dbStatus = "disconnected";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (err) {
    dbStatus = "disconnected";
  }

  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "SmartGrocer API",
    version: "1.0.0",
    database: dbStatus,
  });
}
