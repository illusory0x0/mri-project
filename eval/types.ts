export type LocateDifficulty = "explicit" | "described";

export type ConstructKind = "atom" | "wrap" | "build" | "copy" | "multi";

export type OperationKind =
  | "replace-node"
  | "insert-node"
  | "delete-node"
  | "wrap-node"
  | "move-subtree";

export interface TaskSource {
  repo: string;
  file: string;
  commit: string;
}

export type SemanticVerdict = "equal" | "different" | "unknown";

export interface Task {
  id: string;
  locate: LocateDifficulty;
  construct?: ConstructKind;
  operation?: OperationKind;
  set?: string;
  instruction: string;
  input: string;
  expected: string;
  probe?: string;
  bracketDanger?: boolean;
  source?: TaskSource;
}

export type LoadedTask = Task & { depth: number; set: string };

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

export type DriverIdentity = "mock" | "openai";

export interface DriverConfig {
  model?: string;
  temperature?: number;
}

export interface AgentDriver {
  id: DriverIdentity;
  config(arm: Arm): DriverConfig;
  run(request: DriverRequest): Promise<DriverResult>;
}

export interface RunResult {
  taskId: string;
  arm: ArmName;
  driver: DriverIdentity;
  model?: string;
  temperature?: number;
  parsed: boolean;
  parenMismatch: boolean;
  hunkFailure: boolean;
  ioViolation: boolean;
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
  ioViolation: boolean;
  error: string | null;
}

export interface ArmSummary {
  arm: ArmName;
  runs: number;
  parseErrorRate: number;
  parenMismatchRate: number;
  hunkFailureRate: number;
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
  tasks: LoadedTask[];
  runs: RunResult[];
  summary: ArmSummary[];
  perSet: SetSummary[];
  bracketDanger: BracketDangerCell;
}

export interface TaskSetRef {
  name: string;
  hash: string;
}

export interface SummaryProvenance {
  generatedAt: string;
  gitCommit: string;
  gitDirty: boolean;
  model: string;
  temperature: string;
  driver: string;
  taskSets: TaskSetRef[];
  armHash: string;
  vocabHash: string;
  taskSetHash: string;
  scorerHash: string;
}

export interface SetSummary extends ArmSummary {
  set: string;
}

export interface ConstructSummary {
  arm: ArmName;
  set: string;
  construct: ConstructKind;
  runs: number;
  successRate: number;
  structuralRate: number;
  semanticRate: number;
  semanticScored: number;
  meanSteps: number;
  meanTokens: number;
  totalTokens: number;
}

export interface OperationSummary {
  arm: ArmName;
  set: string;
  operation: OperationKind;
  runs: number;
  successRate: number;
  structuralRate: number;
  semanticRate: number;
  semanticScored: number;
  meanSteps: number;
  meanTokens: number;
  totalTokens: number;
}

export interface CellSummary extends ConstructSummary {
  locate: LocateDifficulty;
}

export interface BatchingStat {
  arm: ArmName;
  assistantTurns: number;
  toolTurns: number;
  toolCalls: number;
  commandsPerTurn: number;
}

export interface SummaryRunRow {
  taskId: string;
  arm: ArmName;
  set: string;
  construct: ConstructKind | null;
  operation: OperationKind | null;
  locate: LocateDifficulty;
  success: boolean;
  structural: boolean;
  semantic: SemanticVerdict | null;
  parenMismatch: boolean;
  hunkFailure: boolean;
  ioViolation: boolean;
  steps: number;
  tokens: number;
}

export interface SummarySnapshot {
  provenance: SummaryProvenance;
  headline: ArmSummary[];
  perSet: SetSummary[];
  bracketDanger: BracketDangerCell;
  perConstruct: ConstructSummary[];
  perOperation: OperationSummary[];
  cells: CellSummary[];
  batching: BatchingStat[];
  runs: SummaryRunRow[];
}
