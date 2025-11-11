import { auth } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { listApiKeys } from "@/lib/services/api-key-service"
import { ApiKeysManager } from "@/components/api-keys/api-keys-manager"
import { scopesToStrings } from "@/lib/api-keys"

export const dynamic = "force-dynamic"

export default async function ApiKeysPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  const rawKeys = await listApiKeys(session.user.id)
  const keys = rawKeys.map((key) => ({
    id: key.id,
    prefix: key.prefix,
    scopes: scopesToStrings(key.scopes),
    createdAt: key.createdAt.toISOString(),
    revokedAt: key.revokedAt ? key.revokedAt.toISOString() : null,
    expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
  }))

  return (
    <DashboardShell
      heading="API keys"
      description="Scoped tokens with hashed storage and rate limits."
      user={session.user}
    >
      <ApiKeysManager keys={keys} />
    </DashboardShell>
  )
}
