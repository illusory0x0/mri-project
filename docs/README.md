# Documentation

This directory holds the project's docs. Every fact has one authoritative home;
other documents summarize and link to it. The rule, its rationale, and its
exemptions are recorded in
[ADR 0013](adr/0013-agents-md-is-the-agent-entry.md).

The agent entry point is [`AGENTS.md`](../AGENTS.md), the **agent's README**.
The human entry point is [`README.md`](../README.md), the **human's README**.
The project is explored through an agent, so operational knowledge lives in
`AGENTS.md` and the human README links to it.

## Document map

| Document | Audience | Authoritative for |
|---|---|---|
| [`AGENTS.md`](../AGENTS.md) | agents | operational how-to: install, commands, eval credentials, required tools |
| [`README.md`](../README.md) | humans | what the project is and why; acknowledgements |
| [`CONTEXT.md`](../CONTEXT.md) | both | the vocabulary |
| [`docs/spec/`](spec/README.md) | both | product behavior and design |
| [`docs/adr/`](adr/) | both | decisions |
| [`docs/review-guide.md`](review-guide.md) | humans | where a human should focus review |
| [`docs/agents/`](agents/) | agents | skill conventions (issue tracker, triage labels, domain docs) |
| [`skills/`](../skills/) | agents | staged agent skills: a mirror of `~/.agents/skills/`, pending global rollout |
| [`research/`](../research/) | humans | external, point-in-time research notes |

Exempt from the rule: accepted ADRs (frozen history), `.scratch/` (the issue
workbench), and `research/` (external notes).

## Sub-index

- [spec/README.md](spec/README.md) — the product spec index.
