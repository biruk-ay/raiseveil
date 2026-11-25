import { cpSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const source = resolve(projectRoot, "../contract/src/managed/raiseveil");
const destination = resolve(projectRoot, "public/raiseveil-contract");

for (const directory of ["compiler", "keys", "zkir"]) {
  mkdirSync(resolve(destination, directory), { recursive: true });
  cpSync(resolve(source, directory), resolve(destination, directory), { recursive: true });
}
