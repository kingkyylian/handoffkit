const REDACTION = "[REDACTED]";

const SECRET_KEY_PATTERN =
  /(\b[A-Z0-9_.-]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|PASSWD|PRIVATE[_-]?KEY|CLIENT[_-]?SECRET|ACCESS[_-]?TOKEN|REFRESH[_-]?TOKEN|COOKIE|SESSION|JWT|AUTH_TOKEN)[A-Z0-9_.-]*\b\s*(?:=|:)\s*)(["']?)([^\s"',}]+)/gi;

const TOKEN_PATTERNS: RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi,
  /\bsk-[A-Za-z0-9_-]{16,}/g,
  /\bgh[pousr]_[A-Za-z0-9_]{16,}/g,
  /\bnpm_[A-Za-z0-9_-]{16,}/g,
  /\bxox[baprs]-[A-Za-z0-9-]{16,}/g,
  /\bAIza[0-9A-Za-z_-]{20,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  /\/\/([^/\s:@]+):([^@\s/]+)@/g
];

export function redactText(input: string): string {
  let output = input.replace(
    /-----BEGIN ([A-Z ]*PRIVATE KEY)-----[\s\S]*?-----END \1-----/g,
    (_match, keyType: string) => `-----BEGIN ${keyType}-----\n${REDACTION}\n-----END ${keyType}-----`
  );

  output = output.replace(SECRET_KEY_PATTERN, (_match, prefix: string, quote: string) => {
    return `${prefix}${quote}${REDACTION}${quote}`;
  });

  output = output.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, "Bearer [REDACTED]");
  output = output.replace(/\/\/([^/\s:@]+):([^@\s/]+)@/g, "//[REDACTED]@");

  for (const pattern of TOKEN_PATTERNS.slice(1, -1)) {
    output = output.replace(pattern, REDACTION);
  }

  return output;
}
