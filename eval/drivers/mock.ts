import { AgentDriver, DriverRequest, DriverResult } from "../types.js";

export class MockDriver implements AgentDriver {
  async run(request: DriverRequest): Promise<DriverResult> {
    const { arm, task, ctx } = request;
    const transcript: unknown[] = [];
    let steps = 0;

    if (arm.tools.includes("lisp_editor")) {
      await ctx.exec("lisp_editor", { args: ["outline"] });
      await ctx.exec("lisp_editor", {
        args: ["replace", "hole", "--out", "[]"],
      });
      steps += 2;
    }
    if (arm.tools.includes("shell")) {
      const command = `cat > program.rkt <<'LISP'\n${task.expected}\nLISP\n`;
      await ctx.exec("shell", { command });
      steps += 1;
    }

    let finalArtifact = task.expected;
    if (task.id.includes("broken")) {
      finalArtifact = "(define (f x)";
    } else if (task.id.includes("wrong")) {
      finalArtifact = "(define (f x) 0)";
    }

    return { finalArtifact, steps, tokens: 100 + steps * 10, transcript };
  }
}
