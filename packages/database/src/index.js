// Singleton Prisma Client — une seule instance pour tout le processus.
// Exporter Prisma ici centralise toutes les interactions base de données
// et facilite le mocking dans les tests.
import { PrismaClient, Prisma } from "@prisma/client";
export { Prisma };
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
//# sourceMappingURL=index.js.map