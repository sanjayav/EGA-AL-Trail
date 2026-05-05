#!/usr/bin/env node
/**
 * Generate TypeScript types from the canonical JSON Schemas into
 * @dpp/ts-types/src/generated.
 *
 * The hand-authored types in @dpp/schema/src/types are the load-bearing surface.
 * Generated types are an auxiliary artefact (used by, e.g., consumers that want
 * raw JSON Schema-typed objects). When the two diverge, the schema wins and the
 * hand-authored types must be updated.
 */

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { compile } from 'json-schema-to-typescript'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const target = join(root, '..', 'ts-types', 'src', 'generated')

mkdirSync(target, { recursive: true })

const sources = [
  { name: 'dpp-v1.ts', schemaPath: 'schemas/dpp/v1.0.0.json', title: 'Dpp' },
  { name: 'cast-event-v1.ts', schemaPath: 'schemas/cast-event/v1.0.0.json', title: 'CastEvent' },
  { name: 'envelope-v1.ts', schemaPath: 'schemas/envelope/v1.0.0.json', title: 'DppEnvelope' },
]

for (const s of sources) {
  const schema = JSON.parse(readFileSync(join(root, s.schemaPath), 'utf8'))
  const ts = await compile(schema, s.title, {
    bannerComment: `/* AUTO-GENERATED from ${s.schemaPath} — do not edit by hand. */`,
    additionalProperties: false,
    declareExternallyReferenced: true,
    enableConstEnums: false,
    style: { semi: false, singleQuote: true, printWidth: 100, trailingComma: 'all' },
  })
  writeFileSync(join(target, s.name), ts)
  process.stdout.write(`  ✓ ${s.name}\n`)
}

writeFileSync(
  join(target, 'index.ts'),
  sources.map((s) => `export * from './${s.name.replace(/\.ts$/, '.js')}'`).join('\n') + '\n',
)

process.stdout.write(`\nGenerated TypeScript types in ${target}\n`)
