import { createHash } from "node:crypto";

export function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0370-\u03ff\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitSentences(input: string): string[] {
  return input
    .split(/(?<=[.!;;])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 25);
}

export function titleSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeText(a).split(" ").filter(Boolean));
  const tokensB = new Set(normalizeText(b).split(" ").filter(Boolean));

  if (!tokensA.size || !tokensB.size) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1;
  }

  return intersection / (tokensA.size + tokensB.size - intersection);
}

export function computeHash(parts: string[]): string {
  const hash = createHash("sha256");
  hash.update(parts.join("||"));
  return hash.digest("hex");
}

export function compact(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input;
  return `${input.slice(0, maxLength - 1).trim()}…`;
}
