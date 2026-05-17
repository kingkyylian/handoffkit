export class HandoffKitCliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HandoffKitCliError";
  }
}

export function formatCliError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.trim();
}
