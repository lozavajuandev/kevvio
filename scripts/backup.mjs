import { spawn } from "node:child_process";
import { mkdir, cp, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { resolve, join } from "node:path";
const dir = resolve("backups", new Date().toISOString().replaceAll(":", "-"));
await mkdir(dir, { recursive: true, mode: 0o700 });
const p = spawn(
  "docker",
  [
    "compose",
    "exec",
    "-T",
    "postgres",
    "pg_dump",
    "-U",
    process.env.POSTGRES_USER,
    "-d",
    process.env.POSTGRES_DB,
    "--format=custom",
  ],
  { stdio: ["ignore", "pipe", "inherit"] },
);
const done = new Promise((resolve, reject) => {
  p.on("error", reject);
  p.on("close", (code) =>
    code === 0 ? resolve() : reject(new Error(`pg_dump falló (${code})`)),
  );
});
await Promise.all([
  pipeline(
    p.stdout,
    createWriteStream(join(dir, "database.dump"), { mode: 0o600 }),
  ),
  done,
]);
try {
  await cp(
    resolve(process.env.UPLOAD_DIR || ".data/uploads"),
    join(dir, "uploads"),
    { recursive: true },
  );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
await writeFile(
  join(dir, "manifest.json"),
  JSON.stringify(
    {
      created_at: new Date().toISOString(),
      database: process.env.POSTGRES_DB,
      includes: ["database.dump", "uploads (si existen)"],
    },
    null,
    2,
  ),
);
console.log(`Respaldo creado: ${dir}`);
