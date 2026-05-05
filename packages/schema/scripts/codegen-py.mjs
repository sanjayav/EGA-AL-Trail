#!/usr/bin/env node
/**
 * Generate Pydantic v2 models from the canonical JSON Schemas.
 *
 * Strategy: emit a thin wrapper that uses datamodel-code-generator at runtime.
 * We don't ship Python codegen from Node — we shell out to the project's Python
 * environment so the produced models are guaranteed to match the runtime.
 *
 * Usage:
 *   pnpm --filter @dpp/schema run codegen
 *
 * This script writes the marker file; the actual generation happens via:
 *   cd apps/api && uv run datamodel-codegen --input ../../packages/schema/schemas/dpp/v1.0.0.json \\
 *       --input-file-type jsonschema --output dpp_api/_generated/dpp_v1.py --output-model-type pydantic_v2.BaseModel
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const target = join(root, '..', 'py-models', 'dpp_models', 'generated')

mkdirSync(target, { recursive: true })

const stub = `# AUTO-GENERATED stub — replaced by datamodel-code-generator on \`uv run codegen\`.
# This file exists so imports resolve before the first codegen run.

__all__: list[str] = []
`

writeFileSync(join(target, '__init__.py'), stub)
writeFileSync(join(target, 'README.md'), `# Generated Pydantic models

Run \`uv run codegen\` from \`apps/api\` to populate this directory from the
canonical JSON Schemas in \`packages/schema/schemas\`.
`)

process.stdout.write(`Pydantic codegen stubs written to ${target}\n`)
process.stdout.write(`Run \`uv run codegen\` in apps/api to materialise models.\n`)
