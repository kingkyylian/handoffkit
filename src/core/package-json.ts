import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

import { z } from "zod";

import type { PackageInfo, VerificationScript } from "../types.js";

const PackageJsonSchema = z.object({
  name: z.string().optional(),
  packageManager: z.string().optional(),
  scripts: z.record(z.string(), z.string()).optional()
});

const VERIFY_SCRIPT_ORDER = ["build", "test", "typecheck", "lint", "check", "verify", "ci"];
const VERIFY_SCRIPT_PREFIX = /^(build|test|typecheck|lint|check|verify|ci)(:|$)/;

export async function detectPackageInfo(root: string): Promise<PackageInfo | undefined> {
  const packageJsonPath = join(root, "package.json");

  if (!(await pathExists(packageJsonPath))) {
    return undefined;
  }

  const rawPackageJson = await readFile(packageJsonPath, "utf8");
  const packageJson = PackageJsonSchema.parse(JSON.parse(rawPackageJson));
  const packageManager = await detectPackageManager(root, packageJson.packageManager);
  const verificationScripts = detectVerificationScripts(packageJson.scripts ?? {});

  return {
    ...(packageJson.name ? { name: packageJson.name } : {}),
    ...(packageManager ? { packageManager } : {}),
    verificationScripts
  };
}

export async function detectPackageManager(root: string, packageManagerField?: string) {
  if (packageManagerField) {
    return packageManagerField.split("@")[0] || packageManagerField;
  }

  const lockfiles: Array<[string, string]> = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"]
  ];

  for (const [lockfile, manager] of lockfiles) {
    if (await pathExists(join(root, lockfile))) {
      return manager;
    }
  }

  return undefined;
}

export function detectVerificationScripts(scripts: Record<string, string>): VerificationScript[] {
  return Object.entries(scripts)
    .filter(([name]) => VERIFY_SCRIPT_PREFIX.test(name))
    .sort(([left], [right]) => {
      const leftIndex = orderIndex(left);
      const rightIndex = orderIndex(right);

      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }

      return left.localeCompare(right);
    })
    .map(([name, command]) => ({ name, command }));
}

async function pathExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function orderIndex(name: string) {
  const baseName = name.split(":")[0] ?? name;
  const index = VERIFY_SCRIPT_ORDER.indexOf(baseName);
  return index === -1 ? VERIFY_SCRIPT_ORDER.length : index;
}
