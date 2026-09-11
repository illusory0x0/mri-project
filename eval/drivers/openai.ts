import { AgentDriver, DriverRequest, DriverResult } from "../types.js";

export interface OpenAICompatibleOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  maxSteps?: number;
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

export class OpenAICompatibleDriver implements AgentDriver {
  constructor(private readonly options: OpenAICompatibleOptions) {}

  async run(request: DriverRequest): Promise<DriverResult> {
    const { arm, task, tools, ctx } = request;
    const maxSteps = this.options.maxSteps ?? 25;
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

    for (let i = 0; i < maxSteps; i++) {
      const body: Record<string, unknown> = {
        model: arm.model ?? this.options.model,
        messages,
        temperature: arm.temperature ?? this.options.temperature ?? 0,
        seed: request.seed,
      };
      if (toolDefs.length > 0) body.tools = toolDefs;

      const response = await fetch(
        `${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${this.options.apiKey}`,
          },
          body: JSON.stringify(body),
        }
      );
      if (!response.ok) {
        throw new Error(
          `LLM request failed: ${response.status} ${await response.text()}`
        );
      }

      const data = (await response.json()) as ChatResponse;
      tokens += data.usage?.total_tokens ?? 0;
      const message = data.choices?.[0]?.message;
      if (!message) throw new Error("LLM response had no message");
      messages.push(message);

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

    throw new Error(`agent did not finish within ${maxSteps} steps`);
  }
}
