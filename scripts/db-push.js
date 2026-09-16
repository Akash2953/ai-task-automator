const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const dbDir = path.join(repoRoot, "packages", "db");
fs.mkdirSync(dbDir, { recursive: true });
const dbPath = path.join(dbDir, "dev.db");
const url = `file:${dbPath.replace(/\\/g, "/")}`;

process.env.DATABASE_URL = url;
console.log("DATABASE_URL=", url);

const prismaCli = path.join(
  repoRoot,
  "node_modules",
  "prisma",
  "build",
  "index.js"
);

execFileSync(process.execPath, [prismaCli, "db", "push", "--skip-generate"], {
  cwd: dbDir,
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url },
});

execFileSync(process.execPath, [prismaCli, "generate"], {
  cwd: dbDir,
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url },
});

console.log("DB size=", fs.statSync(dbPath).size);
