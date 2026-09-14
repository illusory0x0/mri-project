import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { computeTargetDepth } from "../eval/depth.js";
import { MockDriver } from "../eval/drivers/mock.js";
import { applyEnvFallbacks, parseArgs } from "../eval/options.js";
import { runProcess } from "../eval/process.js";
import { OpenAICompatibleDriver } from "../eval/drivers/openai.js";
import { loadTasks, mapLimit, runOne, selectTasks, summarize, summarizeBracketDanger, summarizeHeadline } from "../eval/runner.js";
import { headlineNote } from "../eval/report.notes.js";
import { scoreArtifact } from "../eval/scorer.js";
import { buildSnapshot } from "../eval/summary.js";
import { AgentDriver, Arm, DriverRequest, DriverResult, RunResult, Task } from "../eval/types.js";

const directArm: Arm = { name: "direct", systemPrompt: "test", tools: [] };
const astEditArm: Arm = {
  name: "ast-edit",
  systemPrompt: "test",
  tools: ["lisp_editor"],
};
const textEditArm: Arm = { name: "text-edit", systemPrompt: "test", tools: ["shell"] };
const diffArm: Arm = { name: "diff", systemPrompt: "test", tools: [], diff: true };

const task: Task = {
  id: "t-increment",
  locate: "explicit",
  construct: "wrap",
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

test("scorer: a probe makes a textually different program semantically equal", async () => {
  const score = await scoreArtifact(
    "(define (f x) (+ 1 x))",
    "(define (f x) (+ x 1))",
    "(f 2)"
  );
  assert.equal(score.structural, false);
  assert.equal(score.semantic, "equal");
  assert.equal(score.success, false);
});

test("scorer: a probe distinguishes a semantically different program", async () => {
  const score = await scoreArtifact(
    "(define (f x) (- x 1))",
    "(define (f x) (+ x 1))",
    "(f 2)"
  );
  assert.equal(score.structural, false);
  assert.equal(score.semantic, "different");
});

test("scorer: a non-terminating candidate probe is unknown, not false", async () => {
  const score = await scoreArtifact(
    "(define (f x) (f x))",
    "(define (f x) 0)",
    "(f 0)"
  );
  assert.equal(score.semantic, "unknown");
});

test("scorer: a task without a probe reports no semantic verdict", async () => {
  const score = await scoreArtifact(
    "(define (f x) (+ x 1))",
    "(define (f x) (+ x 1))"
  );
  assert.equal(score.semantic, null);
  assert.equal(score.structural, true);
});

test("scorer: structural scoring is unchanged by the probe", async () => {
  const score = await scoreArtifact(
    "(define (f x) (+ x 1))",
    "(define (f x) (+ x 1))",
    "(f 2)"
  );
  assert.equal(score.parsed, true);
  assert.equal(score.structural, true);
  assert.equal(score.success, true);
  assert.equal(score.semantic, "equal");
});

test("scorer: a leading #lang header is ignored for structural comparison", async () => {
  const score = await scoreArtifact(
    "#lang racket\n(define (f x) (+ x 1))",
    task.expected
  );
  assert.equal(score.parsed, true);
  assert.equal(score.parenMismatch, false);
  assert.equal(score.structural, true);
  assert.equal(score.success, true);
});

test("scorer: t18-bootstrap with a #lang header scores on its merits", async () => {
  const score = await scoreArtifact(
    "#lang racket\n(define (square x) (* x x))",
    "(define (square x) (* x x))",
    "(square 5)"
  );
  assert.equal(score.parsed, true);
  assert.equal(score.structural, true);
  assert.equal(score.semantic, "equal");
  assert.equal(score.success, true);
});

test("scorer: a genuine reader error is still a parse failure", async () => {
  const score = await scoreArtifact("(define (f x)", task.expected, "(f 2)");
  assert.equal(score.parsed, false);
  assert.ok(score.error);
});

test("scorer: an unreadable candidate is semantically unknown, not different", async () => {
  const score = await scoreArtifact("(define (f x)", task.expected, "(f 2)");
  assert.equal(score.parsed, false);
  assert.equal(score.semantic, "unknown");
});

test("scorer: a candidate reading a file is flagged as an I/O violation", async () => {
  const score = await scoreArtifact(
    '(define x (open-input-file "/etc/hostname"))',
    task.expected
  );
  assert.equal(score.parsed, true);
  assert.equal(score.ioViolation, true);
  assert.equal(score.success, false);
});

test("scorer: a candidate writing a file is blocked and flagged", async () => {
  const target = "/tmp/lisp-editor-should-not-exist";
  const score = await scoreArtifact(
    `(define x (open-output-file "${target}"))`,
    task.expected
  );
  assert.equal(score.ioViolation, true);
  assert.equal(existsSync(target), false);
});

test("scorer: a candidate opening a network connection is flagged", async () => {
  const score = await scoreArtifact(
    '(define x (tcp-connect "example.com" 80))',
    task.expected
  );
  assert.equal(score.ioViolation, true);
});

test("scorer: an ordinary program is not flagged as an I/O violation", async () => {
  const score = await scoreArtifact(task.expected, task.expected);
  assert.equal(score.ioViolation, false);
});

test("computeTargetDepth: derives the depth of the changed node", () => {
  assert.equal(computeTargetDepth("(a b)", "(a c)"), 2);
  assert.equal(computeTargetDepth("(a (b c))", "(a (b d))"), 3);
  assert.equal(computeTargetDepth("(a)", "(a)"), 0);
});

test("computeTargetDepth: insert/delete reports the containing list's depth", () => {
  const insertInput = "(define (f a b) (+ a b))";
  const insertExpected = "(define (f a b c) (+ a b c))";
  const deleteInput = "(define (f x) (let ((a 1) (b 2) (c 3)) (+ a c)))";
  const deleteExpected = "(define (f x) (let ((a 1) (c 3)) (+ a c)))";
  assert.equal(computeTargetDepth(insertInput, insertExpected), 2);
  assert.equal(computeTargetDepth(deleteInput, deleteExpected), 3);
});

test("computeTargetDepth: the corpus insert and delete tasks pin the containing list's depth", async () => {
  const tasks = await loadTasks();
  const byId = new Map(tasks.map((t) => [t.id, t]));
  assert.equal(byId.get("t17-insert-param")!.depth, 2);
  assert.equal(byId.get("t16-delete-binding")!.depth, 3);
});

test("runOne: direct arm scores its typed artifact", async () => {
  const result = await runOne(new MockDriver(), directArm, task);
  assert.equal(result.success, true);
  assert.equal(result.depth, 2);
});

test("summarize: semantic rate excludes unknown", () => {
  const base: RunResult = {
    taskId: "t",
    arm: "ast-edit",
    driver: "mock",
    parsed: true,
    parenMismatch: false,
    hunkFailure: false,
    ioViolation: false,
    evaluates: true,
    success: false,
    structural: false,
    semantic: null,
    depth: 0,
    parseError: null,
    steps: 1,
    tokens: 1,
    finalArtifact: "",
    transcript: [],
  };
  const summaries = summarize([
    { ...base, semantic: "equal" },
    { ...base, semantic: "different" },
    { ...base, semantic: "unknown" },
    { ...base, semantic: null },
  ]);
  const summary = summaries.find((item) => item.arm === "ast-edit")!;
  assert.equal(summary.semanticScored, 2);
  assert.equal(summary.semanticUnknown, 1);
  assert.equal(summary.semanticRate, 0.5);
});

test("runOne: direct arm's broken artifact is a paren mismatch", async () => {
  const broken: Task = { ...task, id: "t-broken" };
  const result = await runOne(new MockDriver(), directArm, broken);
  assert.equal(result.parsed, false);
  assert.equal(result.parenMismatch, true);
  assert.equal(result.success, false);
});

test("runOne: text-edit arm scores the edited file", async () => {
  const result = await runOne(new MockDriver(), textEditArm, task);
  assert.equal(result.success, true);
  assert.ok(result.steps >= 1);
});

test("runOne: tool arms cannot bypass the tool with typed output", async () => {
  const result = await runOne(new MockDriver(), astEditArm, task);
  assert.equal(result.finalArtifact.trim(), "_");
  assert.notEqual(result.finalArtifact.trim(), task.expected);
});

test("runOne: diff arm applies the patch and scores the result", async () => {
  const result = await runOne(new MockDriver(), diffArm, task);
  assert.equal(result.success, true);
  assert.equal(result.parsed, true);
  assert.equal(result.steps, 1);
  assert.equal(result.finalArtifact.trim(), task.expected);
});

test("runOne: diff arm with malformed patch marks failure without throwing", async () => {
  const malformedDriver: AgentDriver = {
    id: "mock",
    config: () => ({}),
    async run(request: DriverRequest): Promise<DriverResult> {
      return {
        finalArtifact: "this is not a valid diff",
        steps: 0,
        tokens: 5,
        transcript: [],
      };
    },
  };
  const result = await runOne(malformedDriver, diffArm, task);
  assert.equal(result.success, false);
  assert.equal(result.hunkFailure, true);
  assert.match(result.parseError ?? "", /diff apply failed/);
});

test("runOne: records the driver identity and the configuration it used", async () => {
  const driver: AgentDriver = {
    id: "openai",
    config: () => ({ model: "test-model", temperature: 0.3 }),
    async run() {
      return { finalArtifact: task.expected, steps: 0, tokens: 1, transcript: [] };
    },
  };
  const result = await runOne(driver, directArm, task);
  assert.equal(result.driver, "openai");
  assert.equal(result.model, "test-model");
  assert.equal(result.temperature, 0.3);
});

test("runOne: a mock run is labelled as the mock driver", async () => {
  const result = await runOne(new MockDriver(), directArm, task);
  assert.equal(result.driver, "mock");
});

test("openai driver: reports its identity and effective configuration", () => {
  const driver = new OpenAICompatibleDriver({
    baseUrl: "http://example.test",
    apiKey: "test",
    model: "base-model",
    temperature: 0.2,
  });
  assert.equal(driver.id, "openai");
  assert.deepEqual(driver.config(directArm), {
    model: "base-model",
    temperature: 0.2,
  });
  assert.deepEqual(
    driver.config({ ...directArm, model: "arm-model", temperature: 0.7 }),
    { model: "arm-model", temperature: 0.7 }
  );
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
      arm: astEditArm,
      task,
      tools: [{ name: "lisp_editor", description: "test", parameters: {} }],
      ctx: {
        async exec() {
          toolExecs++;
          return "{}";
        },
      },
    });
    assert.equal(result.steps, 3);
    assert.equal(toolExecs, 3);
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("parseArgs: defaults are flag-only with a 3-minute timeout", () => {
  const options = parseArgs([]);
  assert.equal(options.driver, "mock");
  assert.equal(options.model, "");
  assert.equal(options.apiKey, "");
  assert.equal(options.timeoutMs, 180_000);
});

test("parseArgs: --timeout is parsed as seconds", () => {
  assert.equal(parseArgs(["--timeout", "30"]).timeoutMs, 30_000);
});

test("parseArgs: concurrency defaults to 4", () => {
  assert.equal(parseArgs([]).concurrency, 4);
});

test("parseArgs: --concurrency is parsed as a positive integer", () => {
  assert.equal(parseArgs(["--concurrency", "8"]).concurrency, 8);
});

test("parseArgs: rejects a non-positive or non-integer --concurrency", () => {
  assert.throws(() => parseArgs(["--concurrency", "0"]), /positive integer/);
  assert.throws(() => parseArgs(["--concurrency", "2.5"]), /positive integer/);
  assert.throws(() => parseArgs(["--concurrency", "abc"]), /positive integer/);
});

test("mapLimit: caps in-flight work and preserves input order", async () => {
  const items = [5, 1, 3, 2, 4];
  let active = 0;
  let peak = 0;
  const results = await mapLimit(items, 2, async (ms) => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, ms));
    active--;
    return ms * 2;
  });
  assert.equal(peak, 2);
  assert.deepEqual(results, [10, 2, 6, 4, 8]);
});

test("mapLimit: an empty input resolves immediately", async () => {
  assert.deepEqual(await mapLimit([], 4, async (x) => x), []);
});

test("parseArgs: rejects a non-positive or non-numeric --timeout", () => {
  assert.throws(() => parseArgs(["--timeout", "0"]), /positive seconds/);
  assert.throws(() => parseArgs(["--timeout", "abc"]), /positive seconds/);
});

test("parseArgs: repeated --arm accumulates", () => {
  assert.deepEqual(parseArgs(["--arm", "direct", "--arm", "ast-edit"]).arms, [
    "direct",
    "ast-edit",
  ]);
});

test("parseArgs: repeated --task accumulates", () => {
  assert.deepEqual(
    parseArgs(["--task", "t01-increment", "--task", "t20-wide-build"]).tasks,
    ["t01-increment", "t20-wide-build"]
  );
});

test("selectTasks: no ids selects every task", () => {
  assert.deepEqual(selectTasks([task], undefined), [task]);
  assert.deepEqual(selectTasks([task], []), [task]);
});

test("selectTasks: selects exactly the named ids", () => {
  const other: Task = { ...task, id: "t-other" };
  assert.deepEqual(selectTasks([task, other], ["t-other"]), [other]);
});

test("selectTasks: an unknown id is an error, not a silent skip", () => {
  assert.throws(() => selectTasks([task], ["t-missing"]), /unknown task id/);
});

test("parseArgs: unknown option fails", () => {
  assert.throws(() => parseArgs(["--nope"]), /unknown option/);
});

test("parseArgs: LISP_EDITOR_* env vars are not read", () => {
  const previous = process.env.LISP_EDITOR_API_KEY;
  process.env.LISP_EDITOR_API_KEY = "should-not-be-read";
  try {
    assert.equal(parseArgs([]).apiKey, "");
  } finally {
    if (previous === undefined) delete process.env.LISP_EDITOR_API_KEY;
    else process.env.LISP_EDITOR_API_KEY = previous;
  }
});

test("applyEnvFallbacks: OPENAI_* fill missing values and flags win", () => {
  const env = {
    OPENAI_BASE_URL: "https://env.test/v1",
    OPENAI_API_KEY: "env-key",
    OPENAI_MODEL: "env-model",
  };
  const filled = applyEnvFallbacks(parseArgs([]), env);
  assert.equal(filled.baseUrl, "https://env.test/v1");
  assert.equal(filled.apiKey, "env-key");
  assert.equal(filled.model, "env-model");

  const flagged = applyEnvFallbacks(
    parseArgs([
      "--base-url",
      "https://flag.test/v1",
      "--api-key",
      "flag-key",
      "--model",
      "flag-model",
    ]),
    env
  );
  assert.equal(flagged.baseUrl, "https://flag.test/v1");
  assert.equal(flagged.apiKey, "flag-key");
  assert.equal(flagged.model, "flag-model");
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
      id: "mock",
      config: () => ({}),
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
    const result = await runOne(slowDriver, directArm, task, {
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
    arm,
    driver: "mock",
    parsed,
    parenMismatch: paren,
    hunkFailure: false,
    ioViolation: false,
    evaluates: parsed,
    success,
    structural: success,
    semantic: null,
    depth: 0,
    parseError: null,
    steps: 2,
    tokens: 100,
    finalArtifact: "",
    transcript: [],
  });

  const summaries = summarize([
    make("ast-edit", true, true, false),
    make("ast-edit", false, false, true),
    make("direct", true, true, false),
  ]);

  const editor = summaries.find((summary) => summary.arm === "ast-edit")!;
  assert.equal(editor.runs, 2);
  assert.equal(editor.successRate, 0.5);
  assert.equal(editor.parenMismatchRate, 0.5);
  assert.equal(editor.parseErrorRate, 0.5);
  assert.equal(editor.hunkFailureRate, 0);
  assert.equal(editor.meanSteps, 2);

  const direct = summaries.find((summary) => summary.arm === "direct")!;
  assert.equal(direct.successRate, 1);
});

test("summarize: a hunk-application failure is not a parse error", () => {
  const base: RunResult = {
    taskId: "t",
    arm: "diff",
    driver: "mock",
    parsed: false,
    parenMismatch: false,
    hunkFailure: false,
    ioViolation: false,
    evaluates: false,
    success: false,
    structural: false,
    semantic: null,
    depth: 0,
    parseError: null,
    steps: 1,
    tokens: 1,
    finalArtifact: "",
    transcript: [],
  };
  const summaries = summarize([
    { ...base, hunkFailure: true, parseError: "diff apply failed" },
    { ...base, parseError: "unexpected end of input" },
    { ...base, parsed: true, evaluates: true },
    { ...base, parsed: true, evaluates: true },
  ]);
  const summary = summaries.find((item) => item.arm === "diff")!;
  assert.equal(summary.runs, 4);
  assert.equal(summary.hunkFailureRate, 0.25);
  assert.equal(summary.parseErrorRate, 0.25);
  assert.equal(summary.parenMismatchRate, 0);
});

test("summary: builds per-construct totals, batching rate, and hides danger tasks", () => {
  const wrapTask: Task = {
    id: "t-wrap",
    locate: "described",
    construct: "wrap",
    instruction: "",
    input: "",
    expected: "",
  };
  const buildTask: Task = {
    id: "t-build",
    locate: "explicit",
    construct: "build",
    instruction: "",
    input: "",
    expected: "",
    bracketDanger: true,
  };
  const transcript = [
    { role: "assistant", tool_calls: [{ id: "1" }, { id: "2" }] },
    { role: "tool", tool_call_id: "1", content: "{}" },
    { role: "tool", tool_call_id: "2", content: "{}" },
    { role: "assistant", tool_calls: [{ id: "3" }] },
    { role: "assistant", content: "done" },
  ];
  const base: RunResult = {
    taskId: "t-wrap",
    arm: "ast-edit",
    driver: "openai",
    model: "m",
    temperature: 1,
    parsed: true,
    parenMismatch: false,
    hunkFailure: false,
    ioViolation: false,
    evaluates: true,
    success: true,
    structural: true,
    semantic: null,
    depth: 0,
    parseError: null,
    steps: 3,
    tokens: 100,
    finalArtifact: "",
    transcript,
  };
  const runs = [
    { ...base, taskId: "t-wrap" },
    { ...base, taskId: "t-build", tokens: 300, steps: 5 },
  ];
  const provenance = {
    generatedAt: "2026-09-14T00:00:00.000Z",
    gitCommit: "abc",
    gitDirty: false,
    model: "m",
    temperature: "1",
    driver: "openai",
    armHash: "arm",
    vocabHash: "vocab",
    taskSetHash: "tasks",
    scorerHash: "scorer",
  };

  const snapshot = buildSnapshot(runs, [wrapTask, buildTask], provenance);

  const wrap = snapshot.perConstruct.find((item) => item.construct === "wrap")!;
  assert.equal(wrap.runs, 1);
  assert.equal(wrap.totalTokens, 100);
  const build = snapshot.perConstruct.find(
    (item) => item.construct === "build"
  )!;
  assert.equal(build.arm, "ast-edit");
  assert.equal(build.runs, 1);
  assert.equal(build.totalTokens, 300);
  assert.equal(build.meanTokens, 300);

  const wrapCell = snapshot.cells.find(
    (cell) =>
      cell.arm === "ast-edit" &&
      cell.construct === "wrap" &&
      cell.locate === "described"
  )!;
  assert.equal(wrapCell.runs, 1);
  assert.equal(wrapCell.totalTokens, 100);

  const batching = snapshot.batching.find((stat) => stat.arm === "ast-edit")!;
  assert.equal(batching.assistantTurns, 6);
  assert.equal(batching.toolTurns, 4);
  assert.equal(batching.toolCalls, 6);
  assert.equal(batching.commandsPerTurn, 1.5);

  const headline = snapshot.headline.find((item) => item.arm === "ast-edit")!;
  assert.equal(headline.runs, 1);
  assert.deepEqual(snapshot.bracketDanger.taskIds, ["t-build"]);
  assert.equal(snapshot.runs.length, 2);
  assert.equal(snapshot.provenance.armHash, "arm");
});

test("headline summary excludes exactly the bracket-danger task list", () => {
  const danger: Task = { ...task, id: "t-danger", bracketDanger: true };
  const base: RunResult = {
    taskId: task.id,
    arm: "ast-edit",
    driver: "mock",
    parsed: true,
    parenMismatch: false,
    hunkFailure: false,
    ioViolation: false,
    evaluates: true,
    success: true,
    structural: true,
    semantic: null,
    depth: 0,
    parseError: null,
    steps: 1,
    tokens: 1,
    finalArtifact: "",
    transcript: [],
  };
  const runs = [
    { ...base, taskId: task.id },
    { ...base, taskId: danger.id },
  ];
  const cell = summarizeBracketDanger(runs, [task, danger]);
  assert.deepEqual(cell.taskIds, [danger.id]);

  const headline = summarizeHeadline(runs, [task, danger]);
  const cellRuns = cell.summary.find((item) => item.arm === "ast-edit")!.runs;
  const headlineRuns = headline.find((item) => item.arm === "ast-edit")!.runs;
  assert.equal(headlineRuns + cellRuns, runs.length);
  assert.equal(headlineRuns, 1);

  const note = headlineNote(cell.taskIds.length);
  assert.match(note, new RegExp("排除 " + cell.taskIds.length + " 个"));
});
