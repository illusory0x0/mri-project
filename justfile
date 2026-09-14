set shell := ["bash", "-c"]
set dotenv-load := true

export PATH := "./node_modules/.bin:" + env_var("PATH")

default:
	@just --list

# Build src/, eval/, and test/ to dist/ (Node ESM), plus the report client bundle.
build:
	rm -rf dist
	esbuild 'src/**/*.ts' 'eval/**/*.ts' 'test/**/*.ts' --outdir=dist --outbase=. --platform=node --target=node22 --format=esm
	esbuild eval/report.client.ts --bundle --format=iife --platform=browser --target=es2022 --outfile=dist/eval/report.client.js

# Type-check the Node sources and the DOM client.
typecheck:
	tsc --noEmit
	tsc -p eval/tsconfig.client.json

# Build, then run the test suite.
test: build
	node --test dist/test/*.test.js

# Build, then run an eval against a model. Extra args are passed to run.js.
eval *args: build
	node dist/eval/run.js {{args}}

# Build, then generate eval/report.html. Extra args are passed to report.js
# (--results, --tasks, --arms, --out); the tasks root holds every task set.
report *args: build
	node dist/eval/report.js {{args}}

# Build, then write a compact, committable eval summary snapshot to eval/summaries/.
summary *args: build
	node dist/eval/summary.js {{args}}

# Count lines of code, skipping build output, deps, and scratch/generated files.
count-lines:
	cloc . --exclude-dir=node_modules,dist,.git,.scratch,coverage,eval/results
