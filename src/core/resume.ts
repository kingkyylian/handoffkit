import type { ResumeSource } from "../types.js";
import { redactText } from "./redact.js";

const RESUME_PREVIEW_LIMIT = 3000;

export function createResumeSource(path: string, content: string): ResumeSource {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const preview =
    normalized.length > RESUME_PREVIEW_LIMIT ? `${normalized.slice(0, RESUME_PREVIEW_LIMIT).trimEnd()}\n[truncated]` : normalized;

  return {
    path,
    preview: redactText(preview)
  };
}
