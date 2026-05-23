import type { ResumeSource, ResumeState } from "../types.js";
import { redactText } from "./redact.js";

const RESUME_PREVIEW_LIMIT = 3000;
const SECTION_ALIASES = {
  completed: [
    /^completed$/i,
    /^completed work$/i,
    /^work completed$/i,
    /^done$/i,
    /^done this session$/i,
    /^what changed$/i,
    /^what i changed$/i,
    /^implemented$/i
  ],
  remaining: [/^remaining$/i, /^remaining work$/i, /^next steps$/i, /^next action$/i, /^next safest action$/i, /^todo$/i, /^to do$/i],
  failedCommands: [/^failed command$/i, /^failed commands$/i, /^command failed$/i, /^commands failed$/i, /^failure$/i, /^failures$/i, /^error$/i, /^errors$/i],
  openQuestions: [
    /^open question$/i,
    /^open questions$/i,
    /^open questions \/ risks$/i,
    /^open questions and risks$/i,
    /^question$/i,
    /^questions$/i,
    /^blocker$/i,
    /^blockers$/i
  ],
  verification: [/^verification$/i, /^tests$/i, /^tests run$/i, /^validation$/i]
} as const;

type ResumeSection = keyof typeof SECTION_ALIASES;
const JSON_TEXT_KEYS = new Set(["content", "response", "summary", "text"]);

export function createResumeSource(path: string, content: string): ResumeSource {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const preview =
    normalized.length > RESUME_PREVIEW_LIMIT ? `${normalized.slice(0, RESUME_PREVIEW_LIMIT).trimEnd()}\n[truncated]` : normalized;
  const state = parseResumeState(normalized);

  return {
    path,
    preview: redactText(preview),
    ...(hasResumeState(state) ? { state } : {})
  };
}

export function parseResumeState(content: string): ResumeState {
  const state: ResumeState = {
    completed: [],
    remaining: [],
    failedCommands: [],
    openQuestions: [],
    verification: []
  };
  let section: ResumeSection | undefined;
  let heading: string | undefined;

  for (const rawLine of resumeTranscriptLines(content)) {
    const line = rawLine.trim();
    const headingMatch = line.match(/^#{1,4}\s+(.+)$/);

    if (headingMatch) {
      const headingText = headingMatch[1];
      if (!headingText) {
        continue;
      }

      heading = headingText.trim();
      section = sectionForHeading(heading);
      continue;
    }

    const transcriptLine = stripTranscriptPrefix(line);
    const bareSection = sectionForHeading(transcriptLine);
    if (bareSection) {
      heading = transcriptLine;
      section = bareSection;
      continue;
    }

    const labeled = parseLabeledTranscriptLine(transcriptLine);
    if (labeled) {
      heading = labeled.heading;
      section = labeled.section;

      if (labeled.item) {
        appendResumeItem(state, section, labeled.item, heading);
      }
      continue;
    }

    if (!section) {
      continue;
    }

    const item = normalizeListItem(transcriptLine);
    if (item) {
      appendResumeItem(state, section, item, heading);
    }
  }

  const next = state.remaining[0] ?? state.openQuestions[0] ?? state.failedCommands[0];
  if (next) {
    state.nextSafestAction = next.text;
  }

  return state;
}

function sectionForHeading(heading: string): ResumeSection | undefined {
  const normalized = normalizeHeading(heading);

  for (const [section, patterns] of Object.entries(SECTION_ALIASES)) {
    if (patterns.some((pattern) => pattern.test(normalized))) {
      return section as ResumeSection;
    }
  }

  return undefined;
}

function parseLabeledTranscriptLine(line: string): { section: ResumeSection; heading: string; item?: string } | undefined {
  const match = line.match(/^([^:]{1,80}):(?:\s*(.*))?$/);
  if (!match?.[1]) {
    return undefined;
  }

  const heading = match[1].trim();
  const section = sectionForHeading(heading);
  if (!section) {
    return undefined;
  }

  const item = match[2]?.trim();
  return {
    section,
    heading,
    ...(item ? { item } : {})
  };
}

function appendResumeItem(state: ResumeState, section: ResumeSection, item: string, heading: string | undefined) {
  state[section].push({ text: redactText(item), ...(heading ? { sourceHeading: redactText(heading) } : {}) });
}

function normalizeListItem(line: string) {
  const match = line.match(/^[-*]\s+(.+)$/) ?? line.match(/^\d+\.\s+(.+)$/);
  return match?.[1]?.trim();
}

function stripTranscriptPrefix(line: string) {
  let current = line.trim();

  for (let i = 0; i < 4; i += 1) {
    const next = current
      .replace(/^>\s*/, "")
      .replace(/^\[[^\]\n]{1,60}\]\s*/, "")
      .replace(/^<\/?(?:user|assistant|system|developer|tool|terminal|command|cmd|result|codex|claude|cursor|gemini)[^>]*>\s*/i, "")
      .replace(/^\*\*(?:user|assistant|system|developer|tool|terminal|command|cmd|result|codex|claude|cursor|gemini)\*\*\s*[:>]\s*/i, "")
      .replace(
        /^(?:user|assistant|system|developer|tool|terminal|command|cmd|result|codex|claude|cursor|gemini|model|model response)(?:\s*\([^)]*\))?\s*[:>]\s*/i,
        ""
      )
      .trim();

    if (next === current) {
      return current;
    }

    current = next;
  }

  return current;
}

function normalizeHeading(heading: string) {
  return heading.trim().replace(/:$/, "").replace(/\s*\/\s*/g, " / ").replace(/\s+/g, " ");
}

function hasResumeState(state: ResumeState) {
  return (
    state.completed.length > 0 ||
    state.remaining.length > 0 ||
    state.failedCommands.length > 0 ||
    state.openQuestions.length > 0 ||
    state.verification.length > 0
  );
}

function resumeTranscriptLines(content: string) {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .flatMap((line) => {
      const jsonText = parseJsonTranscriptText(line.trim());
      return jsonText.length > 0 ? jsonText.flatMap((text) => text.replace(/\r\n/g, "\n").split("\n")) : [line];
    });
}

function parseJsonTranscriptText(line: string): string[] {
  if (!line || !/^[{[]/.test(line)) {
    return [];
  }

  try {
    return collectJsonTranscriptText(JSON.parse(line));
  } catch {
    return [];
  }
}

function collectJsonTranscriptText(value: unknown, key?: string): string[] {
  if (typeof value === "string") {
    return key && JSON_TEXT_KEYS.has(key) ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectJsonTranscriptText(item));
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  if (typeof record.type === "string" && /^tool_/.test(record.type)) {
    return [];
  }

  return Object.entries(record).flatMap(([entryKey, entryValue]) => collectJsonTranscriptText(entryValue, entryKey));
}
