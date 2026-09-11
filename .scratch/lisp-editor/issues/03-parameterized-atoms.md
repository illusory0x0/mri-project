# 03: Build concrete atoms with parameterized shapes

**What to build:** A user (or agent) can place concrete leaves — a variable, a number, a string — into the tree, so that shape skeletons can be populated without a free-text mode.

**Blocked by:** 02 (replace a node with a shape skeleton and print canonical source)

**Status:** ready-for-agent

- [ ] `replace var:<name> --out <path>` replaces the target with the variable.
- [ ] `replace num:<n> --out <path>` replaces the target with the number.
- [ ] `replace str:<s> --out <path>` replaces the target with the string, correctly quoted/escaped.
- [ ] The resulting source always re-parses cleanly, including strings containing spaces or quotes.
- [ ] `_`-prefixed identifiers are still emitted as holes, distinct from `var:_name`.
- [ ] An invalid atom payload exits non-zero, prints no source, and leaves the input unchanged.
- [ ] Covered by CLI-boundary tests only.
