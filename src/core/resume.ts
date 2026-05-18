import type { ResumeSource, ResumeState } from "../types.js";
import { redactText } from "./redact.js";

const RESUME_PREVIEW_LIMIT = 3000;
const SECTION_ALIASES = {
  completed: [/^completed$/i, /^done$/i, /^done this session$/i, /^what changed$/i, /^implemented$/i],
  remaining: [/^remaining$/i, /^next steps$/i, /^todo$/i, /^to do$/i],
  failedCommands: [/^failed commands$/i, /^failures$/i, /^errors$/i],
  openQuestions: [/^open questions$/i, /^open questions \/ risks$/i, /^open questions and risks$/i, /^questions$/i, /^blockers$/i],
  verification: [/^verification$/i, /^tests$/i, /^validation$/i]
} as const;

type ResumeSection = keyof typeof SECTION_ALIASES;

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

  for (const rawLine of content.replace(/\r\n/g, "\n").split("\n")) {
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

    if (!section) {
      continue;
    }

    const item = normalizeListItem(line);
    if (item) {
      state[section].push({ text: redactText(item), ...(heading ? { sourceHeading: redactText(heading) } : {}) });
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

function normalizeListItem(line: string) {
  const match = line.match(/^[-*]\s+(.+)$/) ?? line.match(/^\d+\.\s+(.+)$/);
  return match?.[1]?.trim();
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
