import { PrismaClient } from "@prisma/client";

// Create a single instance of PrismaClient
export const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

// Handle graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
