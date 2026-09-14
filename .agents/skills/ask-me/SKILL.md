---
name: ask-me
description: Force decisions from the conversation alone. No codebase reads, no sub-agent lookups: every fact is the user's to supply. Use for fast prompts where the decision doesn't hinge on code facts.
disable-model-invocation: true
---

Call the Skill tool with "grilling".

This is the **no-lookup** variant. `/grilling` makes finding facts the agent's
job; here it is the user's. Never read the codebase, the environment, or
dispatch a sub-agent to look anything up.

When a frontier question needs a fact:

- ask the user for it directly, in the same round;
- if they don't have it, mark that decision **blocked** and push the questions
  that depend on it to a later round.

Nothing is looked up; nothing is assumed. The decisions are the user's, and so
are the facts they rest on.
