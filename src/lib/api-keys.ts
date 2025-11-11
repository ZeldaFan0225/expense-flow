import bcrypt from "bcryptjs"
import { nanoid } from "nanoid"
import type { ApiKey, ApiScope } from "@prisma/client"

const BCRYPT_ROUNDS = 12

export type GeneratedApiKey = {
  token: string
  prefix: string
  secret: string
  hashedSecret: string
}

export function generateApiKeyToken(): GeneratedApiKey {
  const prefix = nanoid(8).toLowerCase()
  const secret = nanoid(32)
  const token = `exp_${prefix}_${secret}`
  const hashedSecret = bcrypt.hashSync(secret, BCRYPT_ROUNDS)
  return { token, prefix, secret, hashedSecret }
}

export async function hashApiKeySecret(secret: string) {
  return bcrypt.hash(secret, BCRYPT_ROUNDS)
}

export function parseApiKeyToken(token: string | null) {
  if (!token) return null
  if (!token.startsWith("exp_")) return null
  const [, prefix, secret] = token.split("_")
  if (!prefix || !secret) return null
  return { prefix, secret }
}

export async function verifyApiKeySecret(secret: string, hashedSecret: string) {
  return bcrypt.compare(secret, hashedSecret)
}

export function scopesToStrings(scopes: ApiScope[] = []) {
  return scopes.map((scope) => scope.replace(/_/g, ":"))
}

export function normalizeScopes(scopes: string[]): ApiScope[] {
  return scopes
    .map((scope) => scope.replace(/:/g, "_"))
    .filter((scope): scope is ApiScope =>
      ["expenses_read", "expenses_write", "analytics_read", "income_write", "budget_read"].includes(
        scope as ApiScope
      )
    )
}
