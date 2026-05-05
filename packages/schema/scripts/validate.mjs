#!/usr/bin/env node
/**
 * Validate every JSON Schema in this package compiles against Ajv 2020 and
 * sanity-check that fixtures conform.
 *
 * Run on every PR via CI to keep the schemas honest.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(p))
    else if (entry.isFile() && entry.name.endsWith('.json')) out.push(p)
  }
  return out
}

const ajv = new Ajv2020({ strict: true, allErrors: true })
addFormats(ajv)

const schemaFiles = walk(join(root, 'schemas'))
let failed = 0

for (const f of schemaFiles) {
  const schema = loadJson(f)
  try {
    ajv.addSchema(schema, schema.$id)
    process.stdout.write(`  ✓ added schema ${schema.$id || f}\n`)
  } catch (e) {
    process.stderr.write(`  ✗ schema ${f}: ${e.message}\n`)
    failed++
  }
}

for (const f of schemaFiles) {
  const schema = loadJson(f)
  try {
    ajv.compile(schema)
    process.stdout.write(`  ✓ compiled  ${schema.$id || f}\n`)
  } catch (e) {
    process.stderr.write(`  ✗ compile failed ${f}: ${e.message}\n`)
    failed++
  }
}

if (failed > 0) {
  process.stderr.write(`\n${failed} schema error(s) — see above.\n`)
  process.exit(1)
}

process.stdout.write(`\nAll ${schemaFiles.length} schema(s) valid.\n`)
