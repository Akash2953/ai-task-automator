import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

function findRepoRoot(): string {
  let dir = process.cwd();
  for (;;) {
    const pkgPath = path.join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
          workspaces?: unknown;
        };
        if (pkg.workspaces) return dir;
      } catch {
        // continue walking up
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

const repoRoot = findRepoRoot();
loadEnv({ path: path.join(repoRoot, ".env") });

function toPrismaSqliteUrl(absolutePath: string): string {
  // Prisma on Windows rejects file:/// URLs (os error 161). Use file:C:/... form.
  return `file:${absolutePath.replace(/\\/g, "/")}`;
}

function resolveDatabaseUrl(): string {
  const dbDir = path.join(repoRoot, "packages", "db");
  mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, "dev.db");
  return toPrismaSqliteUrl(dbPath);
}

process.env.DATABASE_URL = resolveDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
export { prisma as default };
