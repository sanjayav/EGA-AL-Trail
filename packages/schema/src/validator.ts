/**
 * Runtime validators backed by Ajv (JSON Schema Draft 2020-12).
 *
 * Compiled lazily on first use so the cost is paid once per process.
 * Throw shapes are normalised so callers don't need to deal with Ajv internals.
 */

import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

import dppV1 from '../schemas/dpp/v1.0.0.json' with { type: 'json' }
import castEventV1 from '../schemas/cast-event/v1.0.0.json' with { type: 'json' }
import envelopeV1 from '../schemas/envelope/v1.0.0.json' with { type: 'json' }

import type { Dpp } from './types/dpp'
import type { CastEvent } from './types/cast-event'
import type { DppEnvelope } from './types/envelope'

let ajv: Ajv2020 | null = null
const validators = new Map<string, ValidateFunction>()

function getAjv(): Ajv2020 {
  if (ajv) return ajv
  ajv = new Ajv2020({
    strict: true,
    allErrors: true,
    allowUnionTypes: true,
    discriminator: false,
  })
  addFormats(ajv)
  ajv.addSchema(dppV1, dppV1.$id)
  ajv.addSchema(castEventV1, castEventV1.$id)
  ajv.addSchema(envelopeV1, envelopeV1.$id)
  return ajv
}

function compile(schemaId: string, schema: object): ValidateFunction {
  const cached = validators.get(schemaId)
  if (cached) return cached
  const fn = getAjv().compile(schema)
  validators.set(schemaId, fn)
  return fn
}

export interface SchemaValidationError extends ErrorObject {}

export class SchemaValidationFailure extends Error {
  readonly schemaId: string
  readonly errors: SchemaValidationError[]
  constructor(schemaId: string, errors: SchemaValidationError[]) {
    super(`Schema validation failed against ${schemaId}: ${errors.length} error(s)`)
    this.name = 'SchemaValidationFailure'
    this.schemaId = schemaId
    this.errors = errors
  }
}

function check<T>(schemaId: string, schema: object, value: unknown): asserts value is T {
  const fn = compile(schemaId, schema)
  if (!fn(value)) {
    throw new SchemaValidationFailure(schemaId, (fn.errors ?? []) as SchemaValidationError[])
  }
}

export const validateDpp = (value: unknown): Dpp => {
  check<Dpp>(dppV1.$id, dppV1, value)
  return value
}

export const validateCastEvent = (value: unknown): CastEvent => {
  check<CastEvent>(castEventV1.$id, castEventV1, value)
  return value
}

export const validateEnvelope = (value: unknown): DppEnvelope => {
  check<DppEnvelope>(envelopeV1.$id, envelopeV1, value)
  return value
}

export const isDpp = (value: unknown): value is Dpp => {
  try {
    validateDpp(value)
    return true
  } catch {
    return false
  }
}
