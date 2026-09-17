import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { serverEnv } from "@/server/config/env/server";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg({ connectionString: serverEnv.DATABASE_URL });
export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

globalForPrisma.prisma = db;
