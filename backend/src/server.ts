import app from "./app";
import { ENV } from "./config/env";
import { prisma } from "./config/prisma";

const HOST = "0.0.0.0";
const server = app.listen(ENV.PORT, HOST, () => {
  console.log(`=========================================`);
  console.log(`🚀 SmartGrocer API server running!`);
  console.log(`📡 Local: http://localhost:${ENV.PORT}`);
  console.log(`📱 LAN:   http://0.0.0.0:${ENV.PORT}`);
  console.log(`🩺 Health: http://localhost:${ENV.PORT}/api/v1/health`);
  console.log(`📑 Swagger Docs: http://localhost:${ENV.PORT}/docs`);
  console.log(`🛡️  Admin Dashboard: http://localhost:${ENV.PORT}/admin`);
  console.log(`📦 Environment: ${ENV.NODE_ENV}`);
  console.log(`=========================================`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log("Shutting down SmartGrocer API gracefully...");
  server.close(async () => {
    await prisma.$disconnect();
    console.log("Database connection closed.");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
