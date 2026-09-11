# 09: Results summary and report

**What to build:** A single comparison output that turns the per-run results from all three arms into the answer to the project's question: does structural editing let an agent edit nested Lisp more reliably and with less effort than text manipulation?

**Blocked by:** 07 (experiment harness `editor` arm), 08 (experiment harness `sed`/`awk` arm)

**Status:** ready-for-agent

- [ ] Aggregates results across all three arms: bracket-mismatch rate, parse-error rate, success@1, step count, token count.
- [ ] Produces a per-task and overall comparison table that can be read without re-running anything.
- [ ] Explicitly annotates that the `editor` arm is expected to have near-zero bracket mismatches by construction, so success@1, steps, and tokens are the metrics carrying real signal.
- [ ] States the experimental conditions (model, temperature, seeds, task set) alongside the numbers.
- [ ] The report is reproducible from the stored per-run results alone.
