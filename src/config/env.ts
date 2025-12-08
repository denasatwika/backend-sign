import { config as loadEnv } from 'dotenv'
import { z } from 'zod'

loadEnv()

const runtimeEnv =
  typeof Bun !== 'undefined' ? (Bun.env as Record<string, string | undefined>) : (process.env as Record<string, string | undefined>)
const processEnv = process.env as Record<string, string | undefined>

const fallbackPort = runtimeEnv?.PORT ?? processEnv.PORT ?? '8787'

const defaults = {
  PORT: fallbackPort,
  DATABASE_URL: 'postgresql://username:password@localhost:5432/mybaliola-be',
  APP_ORIGIN: 'http://localhost:3000',
  API_BASE_URL: `http://localhost:${fallbackPort}`,
  JWT_SECRET: 'dev-insecure-jwt-secret-change-me',
} as const

const fallbackUsage = new Set<string>()

const pick = (key: keyof typeof defaults, fallback: string) => {
  const value = runtimeEnv?.[key] ?? processEnv[key]
  if (value === undefined || value === null || value === '') {
    fallbackUsage.add(key)
    return fallback
  }
  return value
}

/**
 * Centralised environment loader so every layer pulls from a single validated source.
 * We read from Bun first (native runtime), then fall back to process.env for tests.
 */
const rawEnv = {
  PORT: pick('PORT', defaults.PORT),
  NODE_ENV: runtimeEnv?.NODE_ENV ?? processEnv.NODE_ENV,
  DATABASE_URL: pick('DATABASE_URL', defaults.DATABASE_URL),
  APP_ORIGIN: pick('APP_ORIGIN', defaults.APP_ORIGIN),
  API_BASE_URL: pick('API_BASE_URL', defaults.API_BASE_URL),
  JWT_SECRET: pick('JWT_SECRET', defaults.JWT_SECRET),
  PINATA_JWT: runtimeEnv?.PINATA_JWT ?? processEnv.PINATA_JWT,
  PINATA_API_KEY: runtimeEnv?.PINATA_API_KEY ?? processEnv.PINATA_API_KEY,
  PINATA_API_SECRET: runtimeEnv?.PINATA_API_SECRET ?? processEnv.PINATA_API_SECRET,
  PINATA_GATEWAY_URL: runtimeEnv?.PINATA_GATEWAY_URL ?? processEnv.PINATA_GATEWAY_URL,
  MAX_ATTACHMENT_BYTES: runtimeEnv?.MAX_ATTACHMENT_BYTES ?? processEnv.MAX_ATTACHMENT_BYTES,
  EIP712_CHAIN_ID: runtimeEnv?.EIP712_CHAIN_ID ?? processEnv.EIP712_CHAIN_ID,
  EIP712_DOMAIN_NAME: runtimeEnv?.EIP712_DOMAIN_NAME ?? processEnv.EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_VERSION: runtimeEnv?.EIP712_DOMAIN_VERSION ?? processEnv.EIP712_DOMAIN_VERSION,
  RPC_URL: runtimeEnv?.RPC_URL ?? processEnv.RPC_URL,
  CHAIN_ID: runtimeEnv?.CHAIN_ID ?? processEnv.CHAIN_ID,
  FORWARDER_ADDRESS: runtimeEnv?.FORWARDER_ADDRESS ?? processEnv.FORWARDER_ADDRESS,
  LEAVE_CORE_ADDRESS: runtimeEnv?.LEAVE_CORE_ADDRESS ?? processEnv.LEAVE_CORE_ADDRESS,
  LEAVEBOOK_ADDRESS:
    runtimeEnv?.LEAVEBOOK_ADDRESS ??
    processEnv.LEAVEBOOK_ADDRESS ??
    runtimeEnv?.LEAVE_CORE_ADDRESS ??
    processEnv.LEAVE_CORE_ADDRESS,
  COMPANY_MULTISIG_ADDRESS: runtimeEnv?.COMPANY_MULTISIG_ADDRESS ?? processEnv.COMPANY_MULTISIG_ADDRESS,
  RELAYER_PRIVATE_KEY: runtimeEnv?.RELAYER_PRIVATE_KEY ?? processEnv.RELAYER_PRIVATE_KEY,
  RELAYER_ADDRESS: runtimeEnv?.RELAYER_ADDRESS ?? processEnv.RELAYER_ADDRESS,
  CUTI_TOKEN_ADDRESS: runtimeEnv?.CUTI_TOKEN_ADDRESS ?? processEnv.CUTI_TOKEN_ADDRESS,
}

const EnvSchema = z.object({
  PORT: z.coerce.number().min(1).max(65535).default(8787),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  APP_ORIGIN: z.string().url(),
  API_BASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  PINATA_JWT: z.string().optional(),
  PINATA_API_KEY: z.string().optional(),
  PINATA_API_SECRET: z.string().optional(),
  PINATA_GATEWAY_URL: z.string().optional(),
  MAX_ATTACHMENT_BYTES: z.coerce.number().positive().default(5 * 1024 * 1024),
  EIP712_CHAIN_ID: z.coerce.number().positive().optional(),
  EIP712_DOMAIN_NAME: z.string().optional(),
  EIP712_DOMAIN_VERSION: z.coerce.number().optional(),
  RPC_URL: z.string().url().optional(),
  CHAIN_ID: z.coerce.number().positive().optional(),
  FORWARDER_ADDRESS: z.string().optional(),
  LEAVE_CORE_ADDRESS: z.string().optional(),
  LEAVEBOOK_ADDRESS: z.string().optional(),
  COMPANY_MULTISIG_ADDRESS: z.string().optional(),
  RELAYER_PRIVATE_KEY: z.string().optional(),
  RELAYER_ADDRESS: z.string().optional(),
  CUTI_TOKEN_ADDRESS: z.string().optional(),
})

export type AppEnv = z.infer<typeof EnvSchema>

let cachedEnv: AppEnv | null = null

export const getEnv = (): AppEnv => {
  if (cachedEnv) {
    return cachedEnv
  }
  const parsed = EnvSchema.safeParse(rawEnv)
  if (!parsed.success) {
    const formatted = parsed.error.flatten().fieldErrors
    const message = Object.entries(formatted)
      .map(([field, errors]) => `${field}: ${errors?.join(', ') ?? 'invalid'}`)
      .join('; ')
    throw new Error(`Invalid environment configuration: ${message}`)
  }
  cachedEnv = parsed.data

  if (fallbackUsage.size > 0 && cachedEnv.NODE_ENV !== 'production') {
    console.warn(
      `[env] Using fallback values for: ${Array.from(fallbackUsage)
        .sort()
        .join(', ')}. Provide these in your .env for non-default behaviour.`,
    )
  }

  return cachedEnv
}
