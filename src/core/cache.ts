import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

import type { CacheArtifactEnvelope, CacheArtifactKind, CacheArtifactSummary, ResumeSource } from "../types.js";
import { redactText } from "./redact.js";

const CACHE_KINDS: CacheArtifactKind[] = ["resume", "verification"];

interface WriteCacheOptions {
  now?: Date;
}

export async function writeCacheArtifact<T>(root: string, kind: CacheArtifactKind, data: T, options: WriteCacheOptions = {}) {
  const createdAt = (options.now ?? new Date()).toISOString();
  const envelope: CacheArtifactEnvelope<T> = {
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

export async function listCacheArtifacts(root: string): Promise<CacheArtifactSummary[]> {
  const summaries = await Promise.all(CACHE_KINDS.map((kind) => listCacheKind(root, kind)));

  return summaries
    .flat()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
}

export async function readCacheArtifact(root: string, kind: CacheArtifactKind, name = "latest"): Promise<CacheArtifactEnvelope> {
  const normalizedName = normalizeArtifactName(name);
  const artifactPath = join(root, ".handoffkit", kind, `${normalizedName}.json`);
  const envelope = JSON.parse(await readFile(artifactPath, "utf8")) as CacheArtifactEnvelope;

  if (envelope.version !== 1 || envelope.kind !== kind || typeof envelope.createdAt !== "string") {
    throw new Error(`Invalid cache artifact: .handoffkit/${kind}/${normalizedName}.json`);
  }

  return envelope;
}

export async function readResumeSourceFromCache(root: string, ref: string): Promise<ResumeSource> {
  const { kind, name } = parseCacheRef(ref, "resume");
  if (kind !== "resume") {
    throw new Error("resume --from-cache only supports resume cache artifacts.");
  }

  const artifact = await readCacheArtifact(root, kind, name);
  const source = resumeSourceFromArtifact(artifact);
  if (!source) {
    throw new Error(`Cache artifact does not contain a resume source: .handoffkit/${kind}/${name}.json`);
  }

  return source;
}

export function parseCacheRef(ref: string, defaultKind?: CacheArtifactKind): { kind: CacheArtifactKind; name: string } {
  const normalized = ref.trim();
  const parts = normalized.split("/");

  if (parts.length === 1 && defaultKind) {
    return { kind: defaultKind, name: normalizeArtifactName(parts[0] || "latest") };
  }

  const [kind, name] = parts;
  if (parts.length === 2 && kind && isCacheArtifactKind(kind)) {
    return { kind, name: normalizeArtifactName(name || "latest") };
  }

  throw new Error(`Invalid cache ref: ${ref}`);
}

function resumeSourceFromArtifact(artifact: CacheArtifactEnvelope): ResumeSource | undefined {
  const data = artifact.data as { source?: ResumeSource };
  return data.source;
}

async function listCacheKind(root: string, kind: CacheArtifactKind): Promise<CacheArtifactSummary[]> {
  const cacheDir = join(root, ".handoffkit", kind);
  let entries: string[];

  try {
    entries = await readdir(cacheDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const artifacts = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry): Promise<CacheArtifactSummary | undefined> => {
        const name = basename(entry, ".json");
        try {
          const artifact = await readCacheArtifact(root, kind, name);
          return {
            kind,
            name,
            createdAt: artifact.createdAt,
            path: `.handoffkit/${kind}/${entry}`
          };
        } catch {
          return undefined;
        }
      })
  );

  return artifacts.filter((artifact): artifact is CacheArtifactSummary => Boolean(artifact));
}

function isCacheArtifactKind(value: string): value is CacheArtifactKind {
  return CACHE_KINDS.includes(value as CacheArtifactKind);
}

function normalizeArtifactName(name: string) {
  const withoutExtension = name.replace(/\.json$/i, "");

  if (!/^[A-Za-z0-9_.-]+$/.test(withoutExtension)) {
    throw new Error(`Invalid cache artifact name: ${name}`);
  }

  return withoutExtension;
}

function cacheTimestamp(timestamp: string) {
  return timestamp.replace(/[:.]/g, "-");
}
