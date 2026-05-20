import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { redactText } from "./redact.js";

export type CacheArtifactKind = "verification" | "resume";

interface CacheEnvelope<T> {
  version: 1;
  kind: CacheArtifactKind;
  createdAt: string;
  data: T;
}

interface WriteCacheOptions {
  now?: Date;
}

export async function writeCacheArtifact<T>(root: string, kind: CacheArtifactKind, data: T, options: WriteCacheOptions = {}) {
  const createdAt = (options.now ?? new Date()).toISOString();
  const envelope: CacheEnvelope<T> = {
    version: 1,
    kind,
    createdAt,
    data
  };
  const cacheDir = join(root, ".handoffkit", kind);
  const artifactPath = join(cacheDir, `${cacheTimestamp(createdAt)}.json`);
  const latestPath = join(cacheDir, "latest.json");
  const contents = `${redactText(JSON.stringify(envelope, null, 2))}\n`;

  await mkdir(cacheDir, { recursive: true });
  await Promise.all([writeFile(artifactPath, contents, "utf8"), writeFile(latestPath, contents, "utf8")]);

  return { artifactPath, latestPath };
}

function cacheTimestamp(timestamp: string) {
  return timestamp.replace(/[:.]/g, "-");
}
