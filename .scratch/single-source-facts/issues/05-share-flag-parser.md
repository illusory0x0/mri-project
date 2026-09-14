# 05: Share the results/tasks/arms/out flag parser

**What to build:** The flag quartet `--results`, `--tasks`, `--arms`, and
`--out` is parsed once and shared by the run, summary, and report entrypoints,
while each command keeps its own extra flags and its own error text. The three
copies collapse to one.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The shared flags are parsed in one place used by all three entrypoints.
- [ ] Each entrypoint keeps its own extra flags, defaults, and error messages.
- [ ] `just typecheck` and `just test` pass.
