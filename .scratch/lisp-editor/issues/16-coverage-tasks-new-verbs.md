# 16: Add coverage tasks for delete, insert, and bootstrap

**What to build:** Add tasks that exercise the newly available operations —
structural delete, insert into a nested list, and bootstrapping from an empty
program — each annotated with a locate difficulty, a construct kind, and an
optional probe, so the task set exercises the full vocabulary.

**Blocked by:** 12, 13

**Status:** ready-for-agent

- [ ] At least one task requires deleting a node.
- [ ] At least one task requires inserting a node into a nested list.
- [ ] At least one task starts from an empty input and requires bootstrapping.
- [ ] Each new task is solvable by a valid sequence of CLI edits, with no
      free-text input.
