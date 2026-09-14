# AGENTS.md is the agent's README; documentation is owned by audience

Status: accepted
Date: 2026-09-15

**Context.** `README.md` and `AGENTS.md` both restated how to run the project
(`just` vs `pnpm run`, the command list) and how to configure eval credentials
(`.env`, the `dotenv` fallback). The copies agreed but could drift, and more
duplication sat around them: `README.md` restated the task-set counts, arm
definitions, result and snapshot fields, scoring, and token figures that
already live in `docs/spec/`. `AGENTS.md` had no inbound links, and `README.md`
was the only human entry point.

**Positioning.** `README.md` is the **human's README**: what the project is and
why. `AGENTS.md` is the **agent's README**: the agent's entry point and the
home of operational knowledge — install, build, type-check, test,
eval/report/summary, credentials, and the tools that must be on `PATH`. The
project is explored through an agent; that is a **discipline**, not an
assumption, so operational knowledge is placed where the agent already reads
it.

**Decision.** Documentation is owned by audience, and every fact has exactly
one authoritative home:

- `AGENTS.md` — operational how-to, kept as a hub plus pointers
  ("progressive disclosure"): high-frequency, short facts live here; long or
  rare detail lives in `docs/` and is linked.
- `README.md` — the human what/why, plus links. It does not carry authoritative
  operational detail.
- `CONTEXT.md` — the vocabulary.
- `docs/spec/` — product behavior and design.
- `docs/adr/` — decisions.
- `docs/review-guide.md` — where a human should focus review.
- `docs/agents/` — skill conventions.
- `docs/README.md` — the documentation map that states each home.

**Rule.** A fact has one authoritative copy. Other documents may **summarize
and link** to it, but must not carry the authoritative detail. Exempt from the
rule: accepted ADRs (frozen history, amended only by a new ADR), `.scratch/`
(the issue workbench, disposable per its own tracker doc), and `research/`
(external, point-in-time research notes).

**Why.** Duplication drifts, and drift here is silent and load-bearing. Placing
operational knowledge only where the agent already reads it also avoids making
the agent read `README.md` for setup — which would pull a long human-oriented
document into context and dilute attention. `AGENTS.md` is injected into every
session, so it must stay curated; detail grows in `docs/`, not there.

**Considered alternatives.** Keep `README.md` self-sufficient and make
`AGENTS.md` its summary (rejected: two copies that drift, and the agent still
reads README); duplicate freely (rejected: the drift this ADR exists to
prevent); a neutral `docs/setup.md` as the operational home (permitted by the
rule, not adopted at this size — it adds a file and an indirection).

**Consequences.** `README.md` is no longer self-contained for setup; a reader
without an agent must open `AGENTS.md`. Operational changes touch one file. The
map in `docs/README.md` is the human-readable contract; enforcement is review,
not tooling.

**Revisit when.** Many contributors work without an agent, or a downstream
consumer needs a self-contained `README.md`.

**Related.** ADR 0008 (run tasks with `just`, not `package.json` scripts).
