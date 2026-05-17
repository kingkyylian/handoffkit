#!/usr/bin/env node
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { execa } from "execa";

const root = process.cwd();
const workDir = await mkdtemp(join(tmpdir(), "handoffkit-release-smoke-"));
const packDir = join(workDir, "pack");
const installDir = join(workDir, "install");

try {
  await mkdir(packDir, { recursive: true });
  await mkdir(installDir, { recursive: true });
  await run("npm", ["--cache", join(workDir, "npm-cache"), "pack", "--pack-destination", packDir], { cwd: root });
  const tarball = await newestTarball(packDir);

  await run("git", ["init", "--initial-branch=main"], { cwd: installDir });
  await writeFile(join(installDir, "README.md"), "# Smoke\n", "utf8");
  await run("npm", ["init", "-y"], { cwd: installDir });
  await run("npm", ["--cache", join(workDir, "npm-cache"), "install", tarball], { cwd: installDir });

  const pack = await jsonCommand(installDir, ["pack", "--goal", "Release smoke", "--format", "json", "--no-diff"]);
  assertNoGeneratedChangedFiles(pack.repository.changedFiles);

  await jsonCommand(installDir, ["risk", "--format", "json"]);
  await jsonCommand(installDir, ["scan-secrets", "--format", "json"]);
  await jsonCommand(installDir, ["resume", "README.md", "--goal", "Resume smoke", "--format", "json"]);

  console.log(`release smoke passed in ${installDir}`);
} finally {
  if (process.env.HANDOFFKIT_KEEP_SMOKE !== "1") {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function newestTarball(directory) {
  const files = (await readdir(directory)).filter((file) => file.endsWith(".tgz")).sort();

  if (files.length !== 1) {
    throw new Error(`Expected one tarball in ${directory}, found ${files.length}.`);
  }

  return join(directory, files[0]);
}

async function jsonCommand(cwd, args) {
  const result = await run("./node_modules/.bin/handoffkit", args, { cwd });
  return JSON.parse(result.stdout);
}

async function run(command, args, options) {
  process.stderr.write(`$ ${command} ${args.join(" ")}\n`);
  const result = await execa(command, args, {
    ...options,
    env: childEnv(),
    extendEnv: false,
    reject: false,
    all: true,
    timeout: 120_000
  });

  if (result.exitCode !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.all ?? result.stderr}`);
  }

  return result;
}

function childEnv() {
  return {
    ...(process.env.CI ? { CI: process.env.CI } : {}),
    ...(process.env.HOME ? { HOME: process.env.HOME } : {}),
    ...(process.env.PATH ? { PATH: process.env.PATH } : {}),
    ...(process.env.TMPDIR ? { TMPDIR: process.env.TMPDIR } : {}),
    ...(process.env.USER ? { USER: process.env.USER } : {}),
    npm_config_fund: "false",
    npm_config_audit: "false"
  };
}

function assertNoGeneratedChangedFiles(files) {
  const generated = files.filter((file) =>
    file === "node_modules" ||
    file === "dist" ||
    file === "coverage" ||
    file.startsWith("node_modules/") ||
    file.startsWith("dist/") ||
    file.startsWith("coverage/")
  );

  if (generated.length > 0) {
    throw new Error(`Generated files leaked into changedFiles: ${generated.join(", ")}`);
  }
}
