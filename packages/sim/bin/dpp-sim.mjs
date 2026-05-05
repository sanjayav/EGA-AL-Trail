#!/usr/bin/env node
/**
 * dpp-sim CLI — fire EGA-anchored cast events into the running API.
 *
 *   pnpm sim:fire celestial               # default preset
 *   node bin/dpp-sim.mjs fire celestial-r --tenant 1
 *   node bin/dpp-sim.mjs list             # show available presets
 */

import { fire, listPresets } from '../src/index.ts'

const cmd = process.argv[2]
const arg = process.argv[3]

function parseFlag(name, fallback) {
  const i = process.argv.indexOf(name)
  if (i === -1) return fallback
  return process.argv[i + 1]
}

async function main() {
  if (cmd === 'list' || (!cmd && !arg)) {
    const presets = listPresets()
    process.stdout.write('\nAvailable presets:\n')
    for (const p of presets) {
      process.stdout.write(`  ${p.id.padEnd(36)} ${p.label}\n`)
    }
    process.stdout.write('\nUsage: pnpm sim:fire <preset-id>\n\n')
    return
  }

  if (cmd === 'fire' || cmd === undefined) {
    const presetId = arg ?? 'celestial-extrusion-billet-6063'
    const tenantId = Number(parseFlag('--tenant', '1'))
    const apiBaseUrl = parseFlag('--api', process.env.DPP_API_BASE_URL ?? 'http://localhost:8000')
    process.stdout.write(`Firing preset "${presetId}" against ${apiBaseUrl} (tenant ${tenantId})…\n`)
    try {
      const result = await fire({ presetId, tenantId, apiBaseUrl })
      process.stdout.write(`\n  ✓ DPP issued\n`)
      process.stdout.write(`    tracking_id : ${result.trackingId}\n`)
      process.stdout.write(`    status      : ${result.status}\n`)
      if (result.upi) process.stdout.write(`    upi         : ${result.upi}\n`)
      if (result.digitalLinkUrl) {
        process.stdout.write(`    digital_link: ${result.digitalLinkUrl}\n`)
      }
      process.stdout.write('\n')
    } catch (e) {
      process.stderr.write(`\n  ✗ ${String(e?.message ?? e)}\n\n`)
      process.exit(1)
    }
    return
  }

  process.stderr.write(`unknown command: ${cmd}\n`)
  process.exit(2)
}

main().catch((e) => {
  process.stderr.write(`fatal: ${String(e?.stack ?? e)}\n`)
  process.exit(1)
})
