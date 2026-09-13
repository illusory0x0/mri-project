import { AgentDriver, DriverRequest, DriverResult } from "../types.js";

export interface OpenAICompatibleOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  maxSteps?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

interface ChatMessage {
  role: string;
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    function?: { name?: string; arguments?: string };
  }>;
  tool_call_id?: string;
}

interface ChatResponse {
  choices?: Array<{ message?: ChatMessage }>;
  usage?: { total_tokens?: number };
}

export function extractCodeBlock(text: string): string {
  const match = text.match(/```(?:lisp|racket|scheme)?\s*\n([\s\S]*?)```/);
  return (match ? match[1] : text).trim();
}

function abortError(): Error {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    let timer: NodeJS.Timeout;
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(abortError());
    };
    timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function isAbort(error: unknown, signal?: AbortSignal): boolean {
  return signal?.aborted === true || (error instanceof Error && error.name === "AbortError");
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export class OpenAICompatibleDriver implements AgentDriver {
  constructor(private readonly options: OpenAICompatibleOptions) {}

  async run(request: DriverRequest): Promise<DriverResult> {
    const { arm, task, tools, ctx, signal } = request;
    const maxSteps = this.options.maxSteps ?? 25;
    const maxRetries = this.options.maxRetries ?? 3;
    const retryDelayMs = this.options.retryDelayMs ?? 1000;
    const messages: ChatMessage[] = [
      { role: "system", content: arm.systemPrompt },
      {
        role: "user",
        content: `Instruction: ${task.instruction}\n\nCurrent program:\n\`\`\`lisp\n${task.input}\n\`\`\``,
      },
    ];
    const toolDefs = tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    let steps = 0;
    let tokens = 0;
    let lastContent = "";

    for (let i = 0; i < maxSteps; i++) {
      const body: Record<string, unknown> = {
        model: arm.model ?? this.options.model,
        messages,
        temperature: arm.temperature ?? this.options.temperature ?? 0,
      };
      if (toolDefs.length > 0) body.tools = toolDefs;

      let message: ChatMessage | undefined;
      let lastError = "LLM response had no message";
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) await sleep(retryDelayMs * attempt, signal);

        let response: Response;
        try {
          response = await fetch(
            `${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`,
            {
              method: "POST",
              headers: {
                "content-type": "application/json",
                authorization: `Bearer ${this.options.apiKey}`,
              },
              body: JSON.stringify(body),
              signal,
            }
          );
        } catch (error) {
          if (isAbort(error, signal)) throw error;
          lastError = error instanceof Error ? error.message : String(error);
          continue;
        }
        if (!response.ok) {
          lastError = `LLM request failed: ${response.status} ${await response.text()}`;
          if (isRetryableStatus(response.status)) continue;
          throw new Error(lastError);
        }

        const data = (await response.json()) as ChatResponse;
        tokens += data.usage?.total_tokens ?? 0;
        message = data.choices?.[0]?.message;
        if (message) break;
      }
      if (!message) {
        throw new Error(`${lastError} after ${maxRetries + 1} attempts`);
      }
      messages.push(message);
      if (typeof message.content === "string" && message.content.trim()) {
        lastContent = message.content;
      }

      const toolCalls = message.tool_calls;
      if (Array.isArray(toolCalls) && toolCalls.length > 0) {
        for (const call of toolCalls) {
          let input: unknown = {};
          try {
            input = JSON.parse(call.function?.arguments ?? "{}");
          } catch {
            input = {};
          }
          const output = await ctx.exec(call.function?.name ?? "", input);
          steps++;
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: output,
          });
        }
        continue;
      }

      return {
        finalArtifact: extractCodeBlock(message.content ?? ""),
        steps,
        tokens,
        transcript: messages,
      };
    }

    return {
      finalArtifact: lastContent ? extractCodeBlock(lastContent) : undefined,
      steps,
      tokens,
      transcript: messages,
    };
  }
}
