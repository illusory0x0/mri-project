# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at
  `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a
  single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file
  (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a
  `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the
issue number directly.

## When a feature lands

`.scratch/` is a workbench, not an archive. Once a feature is implemented:

- Fold its `spec.md` into the canonical spec set under `docs/spec/` — each part
  into the right document, corrected to match what actually shipped, not a
  verbatim copy — and delete the scratch spec.
- Delete its completed tickets. A ticket that is `done` in the workbench is
  stale the moment it lands; the durable record is the code, `docs/spec/`, and
  the ADRs.
- Leave nothing in `.scratch/` that a reader would have to triage again.
