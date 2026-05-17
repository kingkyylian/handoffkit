export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function applyMarkdownBudget(text: string, budget: number) {
  const estimatedTokens = estimateTokens(text);

  if (estimatedTokens <= budget) {
    return { text, estimatedTokens, wasTrimmed: false };
  }

  const notice = `\n\n> Output trimmed to fit --budget ${budget}. Re-run with a larger budget or --output for the full packet.\n`;
  const charLimit = Math.max(0, budget * 4 - notice.length);
  const trimmed = `${text.slice(0, charLimit).trimEnd()}${notice}`;

  return {
    text: trimmed,
    estimatedTokens: estimateTokens(trimmed),
    wasTrimmed: true
  };
}
