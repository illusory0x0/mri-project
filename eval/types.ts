export type LocateDifficulty = "explicit" | "described";

export type ConstructKind = "atom" | "wrap" | "build" | "copy" | "multi";

export type SemanticVerdict = "equal" | "different" | "unknown";

export interface Task {
  id: string;
  locate: LocateDifficulty;
  construct: ConstructKind;
  instruction: string;
  input: string;
  expected: string;
  probe?: string;
  bracketDanger?: boolean;
  depth?: number;
}

export type ArmName = "direct" | "ast-edit" | "text-edit" | "diff";

export const ARM_NAMES: ArmName[] = ["direct", "ast-edit", "text-edit", "diff"];

export interface Workspace {
  source: string;
}

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface Arm {
  name: ArmName;
  systemPrompt: string;
  tools: string[];
  diff?: boolean;
  model?: string;
  temperature?: number;
}

export interface ToolContext {
  exec(name: string, input: unknown): Promise<string>;
}

export interface DriverResult {
  finalArtifact?: string;
  steps: number;
  tokens: number;
  transcript: unknown[];
}

export interface DriverRequest {
  arm: Arm;
  task: Task;
  tools: ToolSpec[];
  ctx: ToolContext;
  signal?: AbortSignal;
}

export interface AgentDriver {
  run(request: DriverRequest): Promise<DriverResult>;
}

export interface RunResult {
  taskId: string;
  arm: ArmName;
  model?: string;
  temperature?: number;
  parsed: boolean;
  parenMismatch: boolean;
  evaluates: boolean;
  success: boolean;
  structural: boolean;
  semantic: SemanticVerdict | null;
  depth: number;
  parseError: string | null;
  steps: number;
  tokens: number;
  finalArtifact: string;
  transcript: unknown[];
}

export interface Score {
  parsed: boolean;
  parenMismatch: boolean;
  evaluates: boolean;
  success: boolean;
  structural: boolean;
  semantic: SemanticVerdict | null;
  error: string | null;
}

export interface ArmSummary {
  arm: ArmName;
  runs: number;
  parseErrorRate: number;
  parenMismatchRate: number;
  successRate: number;
  structuralRate: number;
  semanticRate: number;
  semanticScored: number;
  semanticUnknown: number;
  meanSteps: number;
  meanTokens: number;
}

export interface BracketDangerCell {
  taskIds: string[];
  summary: ArmSummary[];
}

export interface ReportData {
  generatedAt: string;
  models: string[];
  temperatures: string[];
  armNames: string[];
  armDefs: Arm[];
  toolSpecs: Record<string, ToolSpec>;
  tasks: Task[];
  runs: RunResult[];
  summary: ArmSummary[];
  bracketDanger: BracketDangerCell;
}
