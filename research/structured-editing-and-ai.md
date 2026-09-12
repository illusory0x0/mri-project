# Structured editing + AI

**Scope:** How "structure-aware / structured editing" appears in AI-related tools, APIs, agentic coding systems, and research — AST/syntax-tree editing, structured diffs and patches, edit-based models, and schema/grammar-constrained generation.

**Access date for all sources:** 2026-09-13.
**Method:** primary sources only (first-party docs, source repos, and the papers themselves). Claims are tagged inline. Items I could not confirm are marked **UNVERIFIED**. This note separates **(a) established products/APIs**, **(b) research prototypes/papers**, and **(c) demos**.

---

## 1. Definition

"Structured editing" is not one thing in the primary sources; it names several distinct technical ideas. Each sense below is anchored to where a primary source actually uses it.

1. **AST-aware search and rewrite (structure, not text).** ast-grep describes itself as "a new AST based tool to manage your code," whose core mechanism is "using code to search code with the same pattern," and contrasts itself with text tooling: "Using text-based tool for searching code is fast but imprecise. We usually prefer to parse the code into abstract syntax tree for precise matches." [Source: ast-grep — "What is ast-grep?", https://ast-grep.github.io/guide/introduction.html, accessed 2026-09-13]
2. **Matching syntactic structures of a parse tree.** Comby is "a lightweight way of matching syntactic structures of a program's parse tree, like expressions and function blocks," implemented via general parsers for balanced delimiters, strings, and comments rather than a full parser per language. [Source: Comby — "Overview", https://comby.dev/docs/overview, accessed 2026-09-13]
3. **Incremental syntax-tree maintenance.** Tree-sitter is "a parser generator tool and an incremental parsing library" that "can build a concrete syntax tree for a source file and efficiently update the syntax tree as the source file is edited," and is "Robust enough to provide useful results even in the presence of syntax errors." [Source: Tree-sitter — "Introduction", https://tree-sitter.github.io/tree-sitter/, accessed 2026-09-13]
4. **Semantic, format-preserving tree transformation (refactoring).** OpenRewrite works "by making changes to Lossless Semantic Trees (LSTs) that represent your source code and printing the modified trees back into source code." An LST is "a tree representation of code" that is **type-attributed** and **format-preserving** (whitespace is stored in the tree so output "reconstitute[s] the original source code without clobbering formatting"). [Source: OpenRewrite — "Introduction", https://docs.openrewrite.org/, accessed 2026-09-13] [Source: OpenRewrite — "Lossless Semantic Trees (LST)", https://docs.openrewrite.org/concepts-and-explanations/lossless-semantic-trees, accessed 2026-09-13]
5. **AST-to-AST codemods.** jscodeshift is "a toolkit for running codemods over multiple JavaScript or TypeScript files"; it wraps recast, "an AST-to-AST transform tool [that] also tries to preserve the style of original code as much as possible." Transforms navigate/transform collections of AST nodes and call `.toSource()` to print. [Source: facebook/jscodeshift — README, https://github.com/facebook/jscodeshift, accessed 2026-09-13]
6. **Structured diffs / patch formats for LLM edits.** Aider enumerates "edit formats" by which an LLM returns file changes: `whole` (full file), `diff` (search/replace blocks in git-conflict-like `<<<<<<< SEARCH` / `>>>>>>> REPLACE` markers), `diff-fenced`, and `udiff` (a "modified and simplified" unified diff). [Source: Aider — "Edit formats", https://aider.chat/docs/more/edit-formats.html, accessed 2026-09-13]
7. **Schema-constrained generation (structured outputs).** OpenAI's Structured Outputs "ensures the model will always generate responses that adhere to your supplied JSON Schema," as opposed to mere valid JSON in JSON mode. [Source: OpenAI — "Structured model outputs", https://platform.openai.com/docs/guides/structured-outputs, accessed 2026-09-13] Anthropic's strict tool use "guarantees Claude's tool inputs match your JSON Schema by constraining the model's token sampling to schema-valid outputs (a technique called grammar-constrained sampling)." [Source: Anthropic — "Strict tool use", https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use, accessed 2026-09-13] The Model Context Protocol (MCP) encodes tool parameters as JSON Schema (`inputSchema`) and optional output structure as `outputSchema`. [Source: Model Context Protocol — "Tools", https://modelcontextprotocol.io/specification/2025-06-18/server/tools, accessed 2026-09-13]
8. **Grammar/parser-constrained decoding.** PICARD constrains autoregressive decoders "through incremental parsing" by "rejecting inadmissible tokens at each decoding step." [Source: Scholak et al., "PICARD: Parsing Incrementally for Constrained Auto-Regressive Decoding from Language Models", arXiv:2109.05093, https://arxiv.org/abs/2109.05093, accessed 2026-09-13] Synchromesh's "Constrained Semantic Decoding (CSD)" constrains output "to a set of valid programs in the target language" using "constraints on partial outputs." [Source: Poesia et al., "Synchromesh: Reliable code generation from pre-trained language models", arXiv:2201.11227, https://arxiv.org/abs/2201.11227, accessed 2026-09-13]
9. **Projectional editing.** JetBrains MPS markets a "Projectional Editor" under which users "use non-textual notation with projectional editing including math notations, diagrams, and forms." [Source: JetBrains — "MPS: The Domain-Specific Language Creator", https://www.jetbrains.com/mps/, accessed 2026-09-13] (The dedicated `/mps/concepts/` page did not render server-side content on fetch; see gaps.)
10. **Edits as first-class modeled objects.** CoditT5 proposes "a novel pretraining objective which explicitly models edits" for "software-related editing tasks" such as comment updating, bug fixing, and code review. [Source: Zhang et al., "CoditT5: Pretraining for Source Code and Natural Language Editing", arXiv:2208.05446, https://arxiv.org/abs/2208.05446, accessed 2026-09-13] "Learning to Represent Edits" learns "distributed representations of edits" by combining a "neural editor" with an "edit encoder" so an edit can be applied to new inputs. [Source: Yin et al., "Learning to Represent Edits", arXiv:1810.13337, https://arxiv.org/abs/1810.13337, accessed 2026-09-13]

---

## 2. Products & APIs

### 2a. Structure-aware search / rewrite tooling (non-LLM engines)

- **ast-grep** — AST-based search, lint, and rewrite. Patterns are matched on the tree; rewrite can be composed via relational/composite rules. It supports many languages through Tree-sitter. Example from the docs: `ast-grep --pattern 'var code = $PAT' --rewrite 'let code = $PAT' --lang js`. [Source: ast-grep — "What is ast-grep?", https://ast-grep.github.io/guide/introduction.html, accessed 2026-09-13]
- **Comby** — language-aware search/replace over parse-tree structures, using general parsers for `()`, `{}`, `[]`, strings, and comments; a generic fallback matcher handles new data formats. [Source: Comby — "Overview", https://comby.dev/docs/overview, accessed 2026-09-13]
- **Tree-sitter** — parser generator plus incremental CST library; ships grammars and bindings (C, Go, Java, JavaScript/Wasm, Python, Rust, Swift, etc.) and is explicitly designed for per-keystroke editing and error tolerance. The docs list its design influences in parsing/IDE research (e.g., "Efficient and Flexible Incremental Parsing"). [Source: Tree-sitter — "Introduction", https://tree-sitter.github.io/tree-sitter/, accessed 2026-09-13]
- **OpenRewrite** — automated refactoring engine over LSTs. Modifications are made in "Visitors," aggregated into "Recipes." Its LST is type-attributed (resolves symbols across files/projects) and format-preserving; locally the LST "must fit into memory." [Source: OpenRewrite — "Introduction", https://docs.openrewrite.org/, accessed 2026-09-13] [Source: OpenRewrite — "Lossless Semantic Trees (LST)", https://docs.openrewrite.org/concepts-and-explanations/lossless-semantic-trees, accessed 2026-09-13]
- **jscodeshift** — AST-to-AST codemod runner over JavaScript/TypeScript; provides a jQuery-like collection API, builder methods, parser selection (`babel`, `flow`, `ts`, `tsx`), and style preservation via recast. [Source: facebook/jscodeshift — README, https://github.com/facebook/jscodeshift, accessed 2026-09-13]

### 2b. How AI coding agents/tools represent edits

- **Aider (established OSS product).** Aider "uses various 'edit formats' to let LLMs edit source files" and selects a format per model. Formats: `whole`, `diff` (SEARCH/REPLACE blocks), `diff-fenced` (path inside the fence, used for Gemini models), `udiff` (unified diff, "mainly used … [for] the GPT-4 Turbo family"). [Source: Aider — "Edit formats", https://aider.chat/docs/more/edit-formats.html, accessed 2026-09-13] In the design write-up, unified diffs raised GPT-4 Turbo from **20% to 61%** on Aider's "laziness" refactoring benchmark, and disabling Aider's flexible patching "show a 9X increase in editing errors." Aider states "GPT is terrible at working with source code line numbers," so it instructs the model to omit hunk line numbers and treats hunks as search/replace. [Source: Aider — "Unified diffs make GPT-4 Turbo 3X less lazy", https://aider.chat/2023/12/21/unified-diffs.html, accessed 2026-09-13]
- **Anthropic text editor tool (established API).** Anthropic provides a schema-defined `text_editor` tool (named `str_replace_based_edit_tool`) with commands `view`, `str_replace`, `create`, and `insert`. `str_replace` takes `old_str` ("must match exactly, including whitespace and indentation") and `new_str`; `insert` places text after a 1-indexed line; `view` returns file contents optionally prefixed with line numbers. [Source: Anthropic — "Text editor tool", https://platform.claude.com/docs/en/agents-and-tools/tool-use/text-editor-tool, accessed 2026-09-13]
- **Anthropic tool use generally (established API).** Client tools return `tool_use` blocks that the application executes and answers with `tool_result`; tools are described by `input_schema`. [Source: Anthropic — "Tool use with Claude", https://docs.anthropic.com/en/docs/build-with-claude/tool-use, accessed 2026-09-13]
- **OpenAI Structured Outputs + function calling (established API).** Structured Outputs supports JSON Schema via `text.format` / `response_format`, with libraries binding native types (Pydantic, Zod). Function calling defines tools by JSON Schema and has a `strict` mode: "Setting `strict` to `true` will ensure function calls reliably adhere to the function schema, instead of being best effort," implemented via the Structured Outputs feature and requiring `additionalProperties: false` and all fields required. [Source: OpenAI — "Structured model outputs", https://platform.openai.com/docs/guides/structured-outputs, accessed 2026-09-13] [Source: OpenAI — "Function calling", https://platform.openai.com/docs/guides/function-calling, accessed 2026-09-13]
- **Anthropic strict tool use (established API).** Set `"strict": true` on a tool definition; the `input` then "strictly follows the `input_schema`." Anthropic states the mechanism is grammar-constrained sampling. [Source: Anthropic — "Strict tool use", https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use, accessed 2026-09-13]
- **MCP tools (established protocol spec).** MCP servers declare a `tools` capability; clients call `tools/list` and `tools/call`. A tool has `name`, `description`, `inputSchema`, optional `outputSchema`, and `annotations`. Results may be unstructured `content` or `structuredContent`; if an `outputSchema` is given, "Servers MUST provide structured results that conform to this schema." Note: MCP explicitly states `structuredContent` "is unrelated to LLM 'structured outputs' (schema-constrained model generation)." [Source: Model Context Protocol — "Tools", https://modelcontextprotocol.io/specification/2025-06-18/server/tools, accessed 2026-09-13]
- **Cursor (established product).** Cursor's docs describe "a coding agent for building ambitious software" that can "Plan and build features," "Find and fix bugs," and "Review changes" by inspecting diffs and running checks. The fetched docs do **not** document an AST-level edit representation. [Source: Cursor — "Cursor Documentation", https://cursor.com/docs, accessed 2026-09-13]
- **OpenAI Codex CLI (established OSS agent).** Described as "a coding agent from OpenAI that runs locally on your computer." [Source: openai/codex — README, https://github.com/openai/codex, accessed 2026-09-13] Its internal patch/tool format is **UNVERIFIED** here (see gaps).

---

## 3. Research

### 3a. Structure-aware program representation and generation

- **code2vec** represents a code snippet as a fixed-length vector "by decomposing code to a collection of paths in its abstract syntax tree," learning path representations and aggregation jointly; used for method-name prediction on 14M methods. [Source: Alon et al., "code2vec: Learning Distributed Representations of Code", arXiv:1803.09473, https://arxiv.org/abs/1803.09473, accessed 2026-09-13]
- **Learning to Represent Programs with Graphs** proposes "using graphs to represent both the syntactic and semantic structure of code" with gated graph neural networks, evaluated on VarNaming and VarMisuse; it reports finding bugs in mature open-source projects. [Source: Allamanis et al., "Learning to Represent Programs with Graphs", arXiv:1711.00740, https://arxiv.org/abs/1711.00740, accessed 2026-09-13]
- **Tree-to-tree neural networks for program translation** translate a source tree into a target tree, translating a source sub-tree to a target sub-tree at each step with an attention mechanism. [Source: Chen et al., "Tree-to-tree Neural Networks for Program Translation", arXiv:1802.03691, https://arxiv.org/abs/1802.03691, accessed 2026-09-13]
- **CodeT5** is an identifier-aware encoder-decoder pretrained model with an identifier-tagging objective and bimodal NL-PL dual generation. [Source: Wang et al., "CodeT5: Identifier-aware Unified Pre-trained Encoder-Decoder Models…", arXiv:2109.00859, https://arxiv.org/abs/2109.00859, accessed 2026-09-13]
- **StructCoder** makes the encoder structure-aware using "the source code's syntax tree and data flow graph" and adds decoder auxiliary tasks "AST (Abstract Syntax Tree) paths prediction and data flow prediction." It reports SOTA on CodeXGLUE translation and text-to-code. [Source: Tipirneni et al., "StructCoder: Structure-Aware Transformer for Code Generation", arXiv:2206.05239, https://arxiv.org/abs/2206.05239, accessed 2026-09-13]
- **Fill-in-the-middle (FIM)** trains autoregressive LMs to infill by moving a span of text from the middle to the end; the authors "suggest that future autoregressive language models be trained with FIM by default." [Source: Bavarian et al., "Efficient Training of Language Models to Fill in the Middle", arXiv:2207.14255, https://arxiv.org/abs/2207.14255, accessed 2026-09-13]

### 3b. Edit-based models

- **CoditT5** pretrains with an objective that "explicitly models edits," fine-tunes on comment updating, bug fixing, and automated code review, and reports SOTA on all three via reranking with a standard generation model. [Source: Zhang et al., "CoditT5…", arXiv:2208.05446, https://arxiv.org/abs/2208.05446, accessed 2026-09-13]
- **Learning to Represent Edits** introduces "learning distributed representations of edits" for natural language and source code. [Source: Yin et al., arXiv:1810.13337, https://arxiv.org/abs/1810.13337, accessed 2026-09-13]

### 3c. Constrained / grammar-guided decoding

- **PICARD** constrains decoding by incremental parsing, "rejecting inadmissible tokens at each decoding step," and turns passable T5 text-to-SQL models into SOTA on Spider/CoSQL. [Source: Scholak et al., arXiv:2109.05093, https://arxiv.org/abs/2109.05093, accessed 2026-09-13]
- **Synchromesh** introduces Constrained Semantic Decoding (CSD) that "constrain[s] the output to a set of valid programs," enforcing "syntax, scope, typing rules, and contextual logic" without retraining. [Source: Poesia et al., arXiv:2201.11227, https://arxiv.org/abs/2201.11227, accessed 2026-09-13]
- **Grammar prompting** feeds a BNF grammar as external domain constraints; at inference the LLM first predicts a grammar, then generates output following that grammar. [Source: Wang et al., "Grammar Prompting for Domain-Specific Language Generation with Large Language Models", arXiv:2305.19234, https://arxiv.org/abs/2305.19234, accessed 2026-09-13]
- **Guided generation with FSMs (Outlines)** reformulates generation "in terms of transitions between the states of a finite-state machine," enabling regex and context-free-grammar guidance by indexing the model vocabulary, and "guaranteeing the structure of the generated text." [Source: Willard & Louf, "Efficient Guided Generation for Large Language Models", arXiv:2307.09702, https://arxiv.org/abs/2307.09702, accessed 2026-09-13]
- **Monitor-guided decoding (MGD)** uses static analysis as a monitor to guide decoding with repository context, improving compilation rates and next-identifier match; the authors report SantaCoder-1.1B can beat text-davinci-003 on those metrics. [Source: Agrawal et al., "Guiding Language Models of Code with Global Context using Monitors", arXiv:2306.10763, https://arxiv.org/abs/2306.10763, accessed 2026-09-13]

### 3d. Program repair

- **CURE** is an NMT-based automatic program repair technique with three components: PL-model pretraining, "a new code-aware search strategy that finds more correct fixes by focusing on compilable patches and patches that are close in length to the buggy code," and subword tokenization; it reports fixing 57 Defects4J and 26 QuixBugs bugs. [Source: Jiang et al., "CURE: Code-Aware Neural Machine Translation for Automatic Program Repair", arXiv:2103.00073, https://arxiv.org/abs/2103.00073, accessed 2026-09-13]

### 3e. Benchmarks for editing / repository-scale agents

- **SWE-bench**: 2,294 real GitHub issue/PR problems across 12 Python repos, requiring coordinated multi-function/class/file edits; at publication the best model (Claude 2) solved "a mere 1.96%." [Source: Jimenez et al., "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?", arXiv:2310.06770, https://arxiv.org/abs/2310.06770, accessed 2026-09-13]
- **Can It Edit? (CodeEdit benchmark)**: a benchmark of instruction-based code editing tasks plus a permissively licensed training set; it exposed "a significant gap between the capabilities of state-of-the-art open and closed models," and showed fine-tuning open code LLMs on the dataset substantially improved editing. [Source: Cassano et al., "Can It Edit? Evaluating the Ability of Large Language Models to Follow Code Editing Instructions", arXiv:2312.12450, https://arxiv.org/abs/2312.12450, accessed 2026-09-13]

---

## 4. Demos / prototypes

- **SWE-agent** — research system with an "agent-computer interface (ACI)." The paper claims the ACI "significantly enhances an agent's ability to create and edit code files, navigate entire repositories, and execute tests," with 12.5% pass@1 on SWE-bench and 87.7% on HumanEvalFix at publication; code/data/demo at swe-agent.com. [Source: Yang et al., "SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering", arXiv:2405.15793, https://arxiv.org/abs/2405.15793, accessed 2026-09-13]
- **OpenHands** — open platform for agents that "interact with the world in similar ways to those of a human developer: by writing code, interacting with a command line, and browsing the web," MIT-licensed. [Source: Wang et al., "OpenHands: An Open Platform for AI Software Developers as Generalist Agents", arXiv:2407.16741, https://arxiv.org/abs/2407.16741, accessed 2026-09-13]
- **code2vec interactive demo** — online demo at code2vec.org (referenced by the paper). [Source: Alon et al., arXiv:1803.09473, https://arxiv.org/abs/1803.09473, accessed 2026-09-13]
- **ast-grep for AI agents** — the ast-grep project ships a "Claude Code plugin marketplace" containing a skill that "teaches Claude how to write and use ast-grep rules to perform advanced code searches," plus an MCP server (`ast-grep-mcp`) for iterative rule development (dump AST, test rule, revise). [Source: ast-grep/agent-skill — README, https://github.com/ast-grep/agent-skill, accessed 2026-09-13] [Source: ast-grep — "Using ast-grep with AI Tools", https://ast-grep.github.io/advanced/prompting.html, accessed 2026-09-13]
- **MPS projectional editor** — JetBrains positions MPS as a DSL workbench whose "Projectional Editor" supports non-textual notation. [Source: JetBrains — "MPS", https://www.jetbrains.com/mps/, accessed 2026-09-13]

---

## 5. Open problems / limitations (stated by primary sources)

- **Line numbers are brittle for LLMs.** Aider: "GPT is terrible at working with source code line numbers. This is a general observation about *any* use of line numbers in editing formats." [Source: Aider — "Unified diffs…", https://aider.chat/2023/12/21/unified-diffs.html, accessed 2026-09-13]
- **JSON-wrapping source code is error-prone.** Aider: "stuffing source code into JSON is complicated and error prone … Due to escaping issues GPT's code is often syntactically incorrect when it's unpacked from JSON, or the JSON decode just fails entirely." [Source: Aider — "Unified diffs…", https://aider.chat/2023/12/21/unified-diffs.html, accessed 2026-09-13]
- **Rigid patch application fails often.** Aider: disabling flexible patching produced a **9X increase** in editing errors on its Exercism benchmark; Aider therefore normalizes, re-diffs, and relaxes matching. [Source: Aider — "Unified diffs…", https://aider.chat/2023/12/21/unified-diffs.html, accessed 2026-09-13]
- **LLMs violate syntax/semantics without constraints.** Synchromesh: models "often violate syntactic and semantic rules of their output language, limiting their practical usability." [Source: Poesia et al., arXiv:2201.11227, https://arxiv.org/abs/2201.11227, accessed 2026-09-13] PICARD: fine-tuned models "often generate invalid code, rendering it unusable." [Source: Scholak et al., arXiv:2109.05093, https://arxiv.org/abs/2109.05093, accessed 2026-09-13]
- **LMs lack repository/global context.** Monitor-guided decoding: LMs "suffer from limited awareness of such global context and end up hallucinating." [Source: Agrawal et al., arXiv:2306.10763, https://arxiv.org/abs/2306.10763, accessed 2026-09-13]
- **APR search space/strategy limitations.** CURE: existing NMT repair approaches have "search space [that] often does not contain the correct fix" and "search strategy [that] ignores software knowledge such as strict code syntax." [Source: Jiang et al., arXiv:2103.00073, https://arxiv.org/abs/2103.00073, accessed 2026-09-13]
- **Repository-scale editing is hard.** SWE-bench: resolving issues "frequently requires understanding and coordinating changes across multiple functions, classes, and even files," and models solved very few. [Source: Jimenez et al., arXiv:2310.06770, https://arxiv.org/abs/2310.06770, accessed 2026-09-13]
- **Open/closed editing gap.** Can It Edit? found a "significant gap" between open and closed models on instruction-based code editing. [Source: Cassano et al., arXiv:2312.12450, https://arxiv.org/abs/2312.12450, accessed 2026-09-13]
- **Agent interface design matters.** SWE-agent's thesis is that ACI design "can impact agents' behavior and performance." [Source: Yang et al., arXiv:2405.15793, https://arxiv.org/abs/2405.15793, accessed 2026-09-13]
- **Structured outputs have schema limits.** OpenAI strict mode: "Some features of JSON schema are not supported"; for fine-tuned models, schema caching has latency/ZDR caveats. [Source: OpenAI — "Function calling", https://platform.openai.com/docs/guides/function-calling, accessed 2026-09-13]
- **Strict tool use has data constraints.** Anthropic: PHI "must not be included in tool schema definitions"; the computer-use and browser-use toolsets do not accept `strict: true`. [Source: Anthropic — "Strict tool use", https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use, accessed 2026-09-13]
- **MCP safety.** MCP requires servers to validate inputs and clients to validate results; tool annotations "MUST [be] consider[ed] … untrusted unless they come from trusted servers." [Source: Model Context Protocol — "Tools", https://modelcontextprotocol.io/specification/2025-06-18/server/tools, accessed 2026-09-13]
- **Local LST memory bound.** OpenRewrite: "the LST **must** fit into memory" locally (unlike Moderne's piecewise handling). [Source: OpenRewrite — "Lossless Semantic Trees (LST)", https://docs.openrewrite.org/concepts-and-explanations/lossless-semantic-trees, accessed 2026-09-13]
- **Agent skills may not self-trigger.** The ast-grep skill README notes: "Claude Code, as of Nov 2025, cannot automatically detect when to use ast-grep for all appropriate use cases." [Source: ast-grep/agent-skill — README, https://github.com/ast-grep/agent-skill, accessed 2026-09-13]

---

## 6. What I could NOT verify / gaps

- **AST-awareness of end-user AI editors.** The Cursor docs I fetched describe agentic planning/diff review but not an AST/CST-level edit representation. No claim is made here that Cursor edits structurally. **UNVERIFIED.**
- **OpenAI Codex internal patch format.** The repo README describes Codex CLI but not its `apply_patch`/patch grammar; a guessed `codex-rs/apply-patch/README.md` raw URL returned 404. **UNVERIFIED.**
- **JetBrains MPS projectional-editor mechanics.** The homepage confirms the "Projectional Editor" claim, but the `/mps/concepts/` page did not return server-rendered content on fetch. **UNVERIFIED (depth).**
- **GumTree / fine-grained AST differencing.** The canonical paper's host (hal.science) blocked the fetch with a bot challenge, so no primary claim about it is included. **UNVERIFIED.**
- **Model/preview status.** Several fetched first-party docs (OpenAI and Anthropic, dated 2026) reference model names and previews beyond common knowledge; I quoted concepts, not model capabilities, but readers should treat model-specific wording as point-in-time.
- **Two arXiv IDs I initially attempted were wrong** (2208.01105 and 2306.02021 point to unrelated papers); the correct IDs for CoditT5 (2208.05446) and StructCoder (2206.05239) were fetched and are the ones cited.

---

## 7. References

Products / APIs / source repos (all accessed 2026-09-13):

1. Aider — "Edit formats", https://aider.chat/docs/more/edit-formats.html
2. Aider — "Unified diffs make GPT-4 Turbo 3X less lazy", https://aider.chat/2023/12/21/unified-diffs.html
3. ast-grep — "What is ast-grep?", https://ast-grep.github.io/guide/introduction.html
4. ast-grep — "Using ast-grep with AI Tools", https://ast-grep.github.io/advanced/prompting.html
5. ast-grep/agent-skill — README, https://github.com/ast-grep/agent-skill
6. Comby — "Overview", https://comby.dev/docs/overview
7. Tree-sitter — "Introduction", https://tree-sitter.github.io/tree-sitter/
8. OpenRewrite — "Introduction", https://docs.openrewrite.org/
9. OpenRewrite — "Lossless Semantic Trees (LST)", https://docs.openrewrite.org/concepts-and-explanations/lossless-semantic-trees
10. facebook/jscodeshift — README, https://github.com/facebook/jscodeshift
11. Anthropic — "Tool use with Claude", https://docs.anthropic.com/en/docs/build-with-claude/tool-use
12. Anthropic — "Text editor tool", https://platform.claude.com/docs/en/agents-and-tools/tool-use/text-editor-tool
13. Anthropic — "Strict tool use", https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use
14. OpenAI — "Structured model outputs", https://platform.openai.com/docs/guides/structured-outputs
15. OpenAI — "Function calling", https://platform.openai.com/docs/guides/function-calling
16. Model Context Protocol — "Tools", https://modelcontextprotocol.io/specification/2025-06-18/server/tools
17. Cursor — "Cursor Documentation", https://cursor.com/docs
18. OpenAI — openai/codex README, https://github.com/openai/codex
19. JetBrains — "MPS: The Domain-Specific Language Creator", https://www.jetbrains.com/mps/

Research papers (all accessed 2026-09-13):

20. Allamanis et al., "Learning to Represent Programs with Graphs", arXiv:1711.00740, https://arxiv.org/abs/1711.00740
21. Alon et al., "code2vec: Learning Distributed Representations of Code", arXiv:1803.09473, https://arxiv.org/abs/1803.09473
22. Bavarian et al., "Efficient Training of Language Models to Fill in the Middle", arXiv:2207.14255, https://arxiv.org/abs/2207.14255
23. Cassano et al., "Can It Edit? Evaluating the Ability of Large Language Models to Follow Code Editing Instructions", arXiv:2312.12450, https://arxiv.org/abs/2312.12450
24. Chen et al., "Tree-to-tree Neural Networks for Program Translation", arXiv:1802.03691, https://arxiv.org/abs/1802.03691
25. Jiang et al., "CURE: Code-Aware Neural Machine Translation for Automatic Program Repair", arXiv:2103.00073, https://arxiv.org/abs/2103.00073
26. Jimenez et al., "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?", arXiv:2310.06770, https://arxiv.org/abs/2310.06770
27. Poesia et al., "Synchromesh: Reliable code generation from pre-trained language models", arXiv:2201.11227, https://arxiv.org/abs/2201.11227
28. Scholak et al., "PICARD: Parsing Incrementally for Constrained Auto-Regressive Decoding from Language Models", arXiv:2109.05093, https://arxiv.org/abs/2109.05093
29. Tipirneni et al., "StructCoder: Structure-Aware Transformer for Code Generation", arXiv:2206.05239, https://arxiv.org/abs/2206.05239
30. Wang et al. (Bailin), "Grammar Prompting for Domain-Specific Language Generation with Large Language Models", arXiv:2305.19234, https://arxiv.org/abs/2305.19234
31. Wang et al. (Xingyao), "OpenHands: An Open Platform for AI Software Developers as Generalist Agents", arXiv:2407.16741, https://arxiv.org/abs/2407.16741
32. Wang et al. (Yue), "CodeT5: Identifier-aware Unified Pre-trained Encoder-Decoder Models…", arXiv:2109.00859, https://arxiv.org/abs/2109.00859
33. Willard & Louf, "Efficient Guided Generation for Large Language Models", arXiv:2307.09702, https://arxiv.org/abs/2307.09702
34. Yang et al., "SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering", arXiv:2405.15793, https://arxiv.org/abs/2405.15793
35. Yin et al., "Learning to Represent Edits", arXiv:1810.13337, https://arxiv.org/abs/1810.13337
36. Zhang et al., "CoditT5: Pretraining for Source Code and Natural Language Editing", arXiv:2208.05446, https://arxiv.org/abs/2208.05446
37. Agrawal et al., "Guiding Language Models of Code with Global Context using Monitors", arXiv:2306.10763, https://arxiv.org/abs/2306.10763

**Total primary sources cited: 37** (19 product/API/repo sources + 18 papers).
