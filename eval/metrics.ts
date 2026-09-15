import { RunResult } from "./types.js";

export interface RunMetrics {
  runs: number;
  successRate: number;
  structuralRate: number;
  semanticRate: number;
  semanticScored: number;
  meanSteps: number;
  meanTokens: number;
  totalTokens: number;
}

function mean(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function computeRunMetrics(results: RunResult[]): RunMetrics {
  const scored = results.filter(
    (result) => result.semantic !== null && result.semantic !== "unknown"
  );
  return {
    runs: results.length,
    successRate: mean(results.map((result) => (result.success ? 1 : 0))),
    structuralRate: mean(results.map((result) => (result.structural ? 1 : 0))),
    semanticRate:
      scored.length === 0
        ? 0
        : mean(scored.map((result) => (result.semantic === "equal" ? 1 : 0))),
    semanticScored: scored.length,
    meanSteps: mean(results.map((result) => result.steps)),
    meanTokens: mean(results.map((result) => result.tokens)),
    totalTokens: results.reduce((sum, result) => sum + result.tokens, 0),
  };
}
