import assert from "node:assert/strict";
import { test } from "node:test";
import { MockDriver } from "../eval/drivers/mock.js";
import { runProcess } from "../eval/process.js";
import { OpenAICompatibleDriver } from "../eval/drivers/openai.js";
import { runOne, summarize } from "../eval/runner.js";
import { scoreArtifact } from "../eval/scorer.js";
import { AgentDriver, Arm, RunResult, Task } from "../eval/types.js";

const directArm: Arm = { name: "direct", systemPrompt: "test", tools: [] };
const editorArm: Arm = {
  name: "editor",
  systemPrompt: "test",
  tools: ["lisp_editor"],
};
const sedawkArm: Arm = { name: "sedawk", systemPrompt: "test", tools: ["shell"] };

const task: Task = {
  id: "t-increment",
  nesting: 4,
  instruction: "increment",
  input: "(define (f x) x)",
  expected: "(define (f x) (+ x 1))",
};

test("scorer: matching program is a success", async () => {
  const score = await scoreArtifact("(define (f x) (+ x 1))", task.expected);
  assert.equal(score.parsed, true);
  assert.equal(score.parenMismatch, false);
  assert.equal(score.evaluates, true);
  assert.equal(score.success, true);
});

test("scorer: unbalanced program is a paren mismatch", async () => {
  const score = await scoreArtifact("(define (f x)", task.expected);
  assert.equal(score.parsed, false);
  assert.equal(score.parenMismatch, true);
  assert.equal(score.success, false);
});

test("scorer: parseable but different program is not a success", async () => {
  const score = await scoreArtifact("(define (f x) 0)", task.expected);
  assert.equal(score.parsed, true);
  assert.equal(score.success, false);
});

test("runOne: direct arm scores its typed artifact", async () => {
  const result = await runOne(new MockDriver(), directArm, task, 0);
  assert.equal(result.success, true);
});

test("runOne: direct arm's broken artifact is a paren mismatch", async () => {
  const broken: Task = { ...task, id: "t-broken" };
  const result = await runOne(new MockDriver(), directArm, broken, 0);
  assert.equal(result.parsed, false);
  assert.equal(result.parenMismatch, true);
  assert.equal(result.success, false);
});

test("runOne: sedawk arm scores the edited file", async () => {
  const result = await runOne(new MockDriver(), sedawkArm, task, 0);
  assert.equal(result.success, true);
  assert.ok(result.steps >= 1);
});

test("runOne: tool arms cannot bypass the tool with typed output", async () => {
  const result = await runOne(new MockDriver(), editorArm, task, 0);
  assert.equal(result.finalArtifact.trim(), "_");
  assert.notEqual(result.finalArtifact.trim(), task.expected);
});

test("openai driver: retries an empty response and eventually succeeds", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    const empty = calls < 3;
    return {
      ok: true,
      status: 200,
      async json() {
        return empty
          ? { choices: [], usage: { total_tokens: 3 } }
          : {
              choices: [
                {
                  message: {
                    role: "assistant",
                    content: "```lisp\n(done)\n```",
                  },
                },
              ],
              usage: { total_tokens: 3 },
            };
      },
    };
  }) as unknown as typeof fetch;

  try {
    const driver = new OpenAICompatibleDriver({
      baseUrl: "http://example.test",
      apiKey: "test",
      model: "test",
      maxSteps: 3,
      retryDelayMs: 1,
    });
    const result = await driver.run({
      arm: directArm,
      task,
      tools: [],
      ctx: { async exec() {
        return "{}";
      } },
      seed: 0,
    });
    assert.equal(calls, 3);
    assert.equal(result.finalArtifact, "(done)");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

const chatResponse = (content: string | null) => ({
  ok: true,
  status: 200,
  async json() {
    return {
      choices: [{ message: { role: "assistant", content } }],
      usage: { total_tokens: 3 },
    };
  },
});

test("openai driver: retries a network failure and eventually succeeds", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    if (calls < 2) throw new Error("fetch failed");
    return chatResponse("```lisp\n(done)\n```");
  }) as unknown as typeof fetch;

  try {
    const driver = new OpenAICompatibleDriver({
      baseUrl: "http://example.test",
      apiKey: "test",
      model: "test",
      maxSteps: 3,
      retryDelayMs: 1,
    });
    const result = await driver.run({
      arm: directArm,
      task,
      tools: [],
      ctx: { async exec() {
        return "{}";
      } },
      seed: 0,
    });
    assert.equal(calls, 2);
    assert.equal(result.finalArtifact, "(done)");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("openai driver: retries a 429 response and eventually succeeds", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    if (calls < 2) {
      return {
        ok: false,
        status: 429,
        async text() {
          return "rate limited";
        },
      };
    }
    return chatResponse("```lisp\n(done)\n```");
  }) as unknown as typeof fetch;

  try {
    const driver = new OpenAICompatibleDriver({
      baseUrl: "http://example.test",
      apiKey: "test",
      model: "test",
      maxSteps: 3,
      retryDelayMs: 1,
    });
    const result = await driver.run({
      arm: directArm,
      task,
      tools: [],
      ctx: { async exec() {
        return "{}";
      } },
      seed: 0,
    });
    assert.equal(calls, 2);
    assert.equal(result.finalArtifact, "(done)");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("openai driver: does not retry a permanent 400 response", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return {
      ok: false,
      status: 400,
      async text() {
        return "bad request";
      },
    };
  }) as unknown as typeof fetch;

  try {
    const driver = new OpenAICompatibleDriver({
      baseUrl: "http://example.test",
      apiKey: "test",
      model: "test",
      maxSteps: 3,
      retryDelayMs: 1,
    });
    await assert.rejects(
      driver.run({
        arm: directArm,
        task,
        tools: [],
        ctx: { async exec() {
          return "{}";
        } },
        seed: 0,
      }),
      /LLM request failed: 400/
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("openai driver: exhausting maxSteps returns a result instead of throwing", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => ({
    ok: true,
    status: 200,
    async json() {
      calls++;
      return {
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: `c${calls}`,
                  function: {
                    name: "lisp_editor",
                    arguments: JSON.stringify({ args: ["outline"] }),
                  },
                },
              ],
            },
          },
        ],
        usage: { total_tokens: 5 },
      };
    },
  })) as unknown as typeof fetch;

  try {
    const driver = new OpenAICompatibleDriver({
      baseUrl: "http://example.test",
      apiKey: "test",
      model: "test",
      maxSteps: 3,
    });
    let toolExecs = 0;
    const result = await driver.run({
      arm: editorArm,
      task,
      tools: [{ name: "lisp_editor", description: "test", parameters: {} }],
      ctx: {
        async exec() {
          toolExecs++;
          return "{}";
        },
      },
      seed: 0,
    });
    assert.equal(result.steps, 3);
    assert.equal(toolExecs, 3);
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runProcess: aborting kills the running child", async () => {
  const controller = new AbortController();
  const started = Date.now();
  const promise = runProcess("sleep", ["30"], { signal: controller.signal });
  setTimeout(() => controller.abort(), 50);
  const result = await promise;
  assert.ok(Date.now() - started < 5000);
  assert.notEqual(result.code, 0);
});

test(
  "runOne: a run exceeding the timeout is aborted and marked failed",
  { timeout: 5000 },
  async () => {
    let aborted = false;
    const slowDriver: AgentDriver = {
      async run(request) {
        return new Promise<never>((_resolve, reject) => {
          request.signal?.addEventListener("abort", () => {
            aborted = true;
            reject(new Error("aborted"));
          });
        });
      },
    };
    const started = Date.now();
    const result = await runOne(slowDriver, directArm, task, 0, {
      timeoutMs: 50,
    });
    assert.equal(result.success, false);
    assert.match(result.parseError ?? "", /timed out/);
    assert.equal(aborted, true);
    assert.ok(Date.now() - started < 2000);
  }
);

test("summarize: aggregates rates per arm", () => {
  const make = (
    arm: RunResult["arm"],
    success: boolean,
    parsed: boolean,
    paren: boolean
  ): RunResult => ({
    taskId: "t",
    nesting: 4,
    arm,
    seed: 0,
    parsed,
    parenMismatch: paren,
    evaluates: parsed,
    success,
    parseError: null,
    steps: 2,
    tokens: 100,
    finalArtifact: "",
    transcript: [],
  });

  const summaries = summarize([
    make("editor", true, true, false),
    make("editor", false, false, true),
    make("direct", true, true, false),
  ]);

  const editor = summaries.find((summary) => summary.arm === "editor")!;
  assert.equal(editor.runs, 2);
  assert.equal(editor.successRate, 0.5);
  assert.equal(editor.parenMismatchRate, 0.5);
  assert.equal(editor.parseErrorRate, 0.5);
  assert.equal(editor.meanSteps, 2);

  const direct = summaries.find((summary) => summary.arm === "direct")!;
  assert.equal(direct.successRate, 1);
});
